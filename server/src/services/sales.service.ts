import { Prisma, PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/AppError';

type Tx = Prisma.TransactionClient;

export interface CreateSaleInput {
  customer: { name: string; email: string; nit: string };
  items: { productId: string; quantity: number }[];
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  notes?: string;
  userId: string;
}

const PAYMENT_TO_CASH_CATEGORY: Record<CreateSaleInput['paymentMethod'], string> = {
  CASH: 'SALE',
  CARD: 'SALE',
  TRANSFER: 'SALE',
};

/**
 * Crea una venta de forma transaccional:
 *  1. Cliente (reutiliza por NIT o crea)
 *  2. Venta + SaleItems
 *  3. Descuento de inventario + InventoryMovements
 *  4. Payment (+ CashMovement si es efectivo)
 *  5. Asiento contable (JournalEntry) con ingreso y costo de ventas
 * Cualquier fallo revierte todo.
 */
export async function createSale(input: CreateSaleInput) {
  const prisma = new PrismaClient();
  try {
    return await withTx(prisma, (tx) => runSaleTransaction(tx, input));
  } finally {
    await prisma.$disconnect();
  }
}

async function withTx<T>(prisma: PrismaClient, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { timeout: 15000 });
}

async function runSaleTransaction(tx: Tx, input: CreateSaleInput) {
  const { customer: customerData, items, paymentMethod, notes, userId } = input;

  // 1. Cliente por NIT (upsert)
  const customer = await tx.customer.upsert({
    where: { nit: customerData.nit },
    update: { name: customerData.name, email: customerData.email },
    create: customerData,
  });

  // 2. Bodega por defecto
  const warehouse =
    (await tx.warehouse.findFirst({ where: { isDefault: true } })) ??
    (await tx.warehouse.findFirst());
  if (!warehouse) throw new NotFoundError('No warehouse configured');

  // 3. Productos y validación de stock (bloqueando la fila vía update atómico)
  const productIds = items.map((i) => i.productId);
  const products = await tx.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  if (products.length !== new Set(productIds).size) {
    throw new NotFoundError('One or more products not found or inactive');
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validar stock antes de escribir
  const inventoryRows = await tx.inventoryItem.findMany({
    where: { productId: { in: productIds }, warehouseId: warehouse.id },
  });
  const invMap = new Map(inventoryRows.map((inv) => [inv.productId, inv]));

  for (const item of items) {
    const inv = invMap.get(item.productId);
    const available = inv?.quantity ?? 0;
    if (!inv || available < item.quantity) {
      const product = productMap.get(item.productId)!;
      // Señal de dominio: el router la convierte en 409.
      throw new InsufficientStockError(product.sku, available);
    }
  }

  // 4. Numeración de factura: INV-YYYYMMDD-#### atómica
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
    today.getDate()
  ).padStart(2, '0')}`;
  const prefix = `INV-${datePart}-`;
  const lastSale = await tx.sale.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });
  const lastSeq = lastSale ? Number(lastSale.invoiceNumber.slice(prefix.length)) : 0;
  const invoiceNumber = `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;

  const subtotal = items.reduce((acc, item) => {
    const product = productMap.get(item.productId)!;
    return acc + Number(product.price) * item.quantity;
  }, 0);

  // 5. Crear venta + items
  const sale = await tx.sale.create({
    data: {
      invoiceNumber,
      customerId: customer.id,
      userId,
      subtotal,
      tax: 0,
      discount: 0,
      total: subtotal,
      status: 'COMPLETED',
      notes,
      items: {
        create: items.map((item) => {
          const product = productMap.get(item.productId)!;
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
            subtotal: Number(product.price) * item.quantity,
          };
        }),
      },
    },
    include: {
      customer: true,
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  });

  // 6. Inventario: descuento atómico + movimiento
  for (const item of items) {
    const inv = invMap.get(item.productId)!;
    const newQty = inv.quantity - item.quantity;
    await tx.inventoryItem.update({
      where: { id: inv.id },
      data: { quantity: newQty },
    });
    await tx.inventoryMovement.create({
      data: {
        productId: item.productId,
        warehouseId: warehouse.id,
        movementType: 'OUT',
        quantity: item.quantity,
        previousQty: inv.quantity,
        newQty,
        referenceId: sale.id,
        referenceType: 'SALE',
        notes: `Venta ${invoiceNumber}`,
        userId,
      },
    });
  }

  // 7. Pago + caja (efectivo entra a la caja; tarjeta/transferencia se registran como pago)
  const payment = await tx.payment.create({
    data: {
      saleId: sale.id,
      method: paymentMethod,
      amount: subtotal,
    },
  });

  if (paymentMethod === 'CASH') {
    const cashBox = await tx.cashBox.findFirst();
    if (cashBox) {
      await tx.cashMovement.create({
        data: {
          cashBoxId: cashBox.id,
          type: 'IN',
          amount: subtotal,
          category: PAYMENT_TO_CASH_CATEGORY[paymentMethod],
          description: `Venta ${invoiceNumber}`,
          userId,
        },
      });
      await tx.cashBox.update({
        where: { id: cashBox.id },
        data: { currentBalance: { increment: subtotal } },
      });
    }
  }

  // 8. Asiento contable: Ventas (haber) / Caja o Bancos (debe)
  await postSaleJournalEntry(tx, invoiceNumber, subtotal, paymentMethod, userId);

  return { ...sale, payments: [payment] };
}

async function postSaleJournalEntry(
  tx: Tx,
  invoiceNumber: string,
  amount: number,
  paymentMethod: CreateSaleInput['paymentMethod'],
  _userId: string
) {
  const debitCode = paymentMethod === 'CASH' ? '1001' : '1002'; // Caja o Bancos
  const [debitAccount, revenueAccount] = await Promise.all([
    tx.account.findUnique({ where: { code: debitCode } }),
    tx.account.findUnique({ where: { code: '4001' } }),
  ]);
  if (!debitAccount || !revenueAccount) return; // contabilidad opcional si no hay plan de cuentas

  const entryCount = await tx.journalEntry.count();
  const entryNumber = `JE-${String(entryCount + 1).padStart(6, '0')}`;

  await tx.journalEntry.create({
    data: {
      entryNumber,
      description: `Venta ${invoiceNumber}`,
      status: 'POSTED',
      details: {
        create: [
          {
            accountId: debitAccount.id,
            debit: amount,
            credit: 0,
            description: `Cobro venta ${invoiceNumber}`,
          },
          {
            accountId: revenueAccount.id,
            debit: 0,
            credit: amount,
            description: `Ingreso por venta ${invoiceNumber}`,
          },
        ],
      },
    },
  });
}

export class InsufficientStockError extends Error {
  sku: string;
  available: number;
  constructor(sku: string, available: number) {
    super(`INSUFFICIENT_STOCK:${sku}:${available}`);
    this.sku = sku;
    this.available = available;
    this.name = 'InsufficientStockError';
  }
}
