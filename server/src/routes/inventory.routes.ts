import { Router, type Request } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError } from '../utils/AppError';
import type { AuthenticatedRequest } from '../types/express';

const authReq = (req: Request) => req as AuthenticatedRequest & { user: { userId: string } };

const router = Router();

router.use(authenticate);

// GET /api/inventory — niveles por producto/bodega
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.inventoryItem.findMany({
      include: {
        product: { select: { id: true, name: true, sku: true, isActive: true } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: [{ warehouseId: 'asc' }, { productId: 'asc' }],
      take: 1000,
    });
    res.json({ success: true, data: items });
  })
);

// GET /api/inventory/alerts — stock bajo
router.get(
  '/alerts',
  asyncHandler(async (_req, res) => {
    const all = await prisma.inventoryItem.findMany({
      include: { product: { select: { name: true, sku: true } }, warehouse: true },
    });
    const items = all.filter((item) => item.quantity <= item.minStock);
    res.json({ success: true, data: items });
  })
);

// GET /api/inventory/movements
router.get(
  '/movements',
  asyncHandler(async (req, res) => {
    const { productId } = req.query as Record<string, string | undefined>;
    const movements = await prisma.inventoryMovement.findMany({
      where: productId ? { productId } : undefined,
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: movements });
  })
);

const adjustSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  quantity: z.number().int('Quantity must be an integer'),
  notes: z.string().max(300).optional(),
});

// POST /api/inventory/adjust — ajuste absoluto con trazabilidad
router.post(
  '/adjust',
  authorize('ADMIN', 'MANAGER'),
  validate(adjustSchema),
  asyncHandler(async (req, res) => {
    const { productId, warehouseId, quantity, notes } = req.body as {
      productId: string;
      warehouseId?: string;
      quantity: number;
      notes?: string;
    };
    const userId = authReq(req).user.userId;

    const warehouse = warehouseId
      ? await prisma.warehouse.findUnique({ where: { id: warehouseId } })
      : (await prisma.warehouse.findFirst({ where: { isDefault: true } })) ??
        (await prisma.warehouse.findFirst());
    if (!warehouse) throw new NotFoundError('No warehouse configured');

    const inv = await prisma.inventoryItem.findUnique({
      where: { productId_warehouseId: { productId, warehouseId: warehouse.id } },
    });
    if (!inv) throw new NotFoundError('Inventory item not found for this product/warehouse');

    const previousQty = inv.quantity;
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.inventoryItem.update({
        where: { id: inv.id },
        data: { quantity },
      });
      await tx.inventoryMovement.create({
        data: {
          productId,
          warehouseId: warehouse.id,
          movementType: 'ADJUST',
          quantity: Math.abs(quantity - previousQty),
          previousQty,
          newQty: quantity,
          referenceType: 'ADJUSTMENT',
          notes,
          userId,
        },
      });
      return u;
    });

    res.json({ success: true, data: updated });
  })
);

export default router;
