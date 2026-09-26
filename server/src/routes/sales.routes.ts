import { Router, type Request } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ValidationError } from '../utils/AppError';
import { createSale } from '../services/sales.service';
import type { AuthenticatedRequest } from '../types/express';

/** El middleware authenticate garantiza req.user en rutas protegidas. */
const authReq = (req: Request) => req as AuthenticatedRequest & { user: { userId: string } };

const router = Router();

const createSaleSchema = z.object({
  customer: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(200),
    nit: z.string().min(1).max(50),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'At least one item is required'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).default('CASH'),
  notes: z.string().max(500).optional(),
});

router.use(authenticate);

// GET /api/sales?status=&from=&to=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, from, to } = req.query as Record<string, string | undefined>;
    const sales = await prisma.sale.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      include: {
        customer: true,
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json({ success: true, data: sales });
  })
);

// GET /api/sales/report/daily
router.get(
  '/report/daily',
  asyncHandler(async (_req, res) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start }, status: 'COMPLETED' },
      include: { payments: true },
    });
    const byMethod: Record<string, number> = { CASH: 0, CARD: 0, TRANSFER: 0 };
    let total = 0;
    for (const sale of sales) {
      total += Number(sale.total);
      for (const p of sale.payments) {
        byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount);
      }
    }
    res.json({
      success: true,
      data: {
        date: start.toISOString(),
        totalSales: sales.length,
        totalAmount: total,
        byMethod,
      },
    });
  })
);

// GET /api/sales/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
      },
    });
    if (!sale) throw new NotFoundError('Sale not found');
    res.json({ success: true, data: sale });
  })
);

// POST /api/sales — venta transaccional
router.post(
  '/',
  validate(createSaleSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof createSaleSchema>;
    const userId = authReq(req).user.userId;

    try {
      const sale = await createSale({
        customer: payload.customer,
        items: payload.items,
        paymentMethod: payload.paymentMethod,
        notes: payload.notes,
        userId,
      });
      res.status(201).json({ success: true, data: sale });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('INSUFFICIENT_STOCK:')) {
        const [, sku, available] = error.message.split(':');
        next_409(res, `Insufficient stock for ${sku}: ${available} available`, { sku, available });
        return;
      }
      throw error;
    }
  })
);

function next_409(res: import('express').Response, message: string, details: unknown): void {
  res.status(409).json({ success: false, message, details });
}

// PUT /api/sales/:id/cancel — anulación (devuelve stock y revierte caja)
router.put(
  '/:id/cancel',
  authorize('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: { items: true, payments: true },
    });
    if (!sale) throw new NotFoundError('Sale not found');
    if (sale.status !== 'COMPLETED') {
      throw new ValidationError(`Cannot cancel a sale with status ${sale.status}`);
    }

    const warehouse =
      (await prisma.warehouse.findFirst({ where: { isDefault: true } })) ??
      (await prisma.warehouse.findFirst());
    if (!warehouse) throw new NotFoundError('No warehouse configured');

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id: sale.id }, data: { status: 'CANCELLED' } });

      for (const item of sale.items) {
        const inv = await tx.inventoryItem.findUnique({
          where: { productId_warehouseId: { productId: item.productId, warehouseId: warehouse.id } },
        });
        if (inv) {
          const newQty = inv.quantity + item.quantity;
          await tx.inventoryItem.update({ where: { id: inv.id }, data: { quantity: newQty } });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              warehouseId: warehouse.id,
              movementType: 'IN',
              quantity: item.quantity,
              previousQty: inv.quantity,
              newQty,
              referenceId: sale.id,
              referenceType: 'SALE_CANCEL',
              notes: 'Venta anulada',
              userId: authReq(req).user.userId,
            },
          });
        }
      }

      for (const payment of sale.payments) {
        const cashBox = await tx.cashBox.findFirst();
        if (!cashBox) continue;
        await tx.cashMovement.create({
          data: {
            cashBoxId: cashBox.id,
            type: 'OUT',
            amount: payment.amount,
            category: 'SALE_CANCEL',
            description: `Anulación venta ${sale.invoiceNumber}`,
            userId: authReq(req).user.userId,
          },
        });
      }
    });

    res.json({ success: true, data: { id: sale.id, status: 'CANCELLED' } });
  })
);

export default router;
