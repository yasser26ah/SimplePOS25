import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ConflictError } from '../utils/AppError';

const router = Router();

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  sku: z.string().min(1, 'SKU is required').max(50),
  price: z.number().nonnegative('Price must be >= 0'),
  costPrice: z.number().nonnegative().optional(),
  categoryId: z.string().uuid('Invalid category ID'),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().max(500).optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
});

const updateProductSchema = createProductSchema.partial();

router.use(authenticate);

// GET /api/products?categoryId=&q=&includeInactive=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { categoryId, q, includeInactive } = req.query as Record<string, string | undefined>;
    const products = await prisma.product.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(includeInactive === 'true' ? {} : { isActive: true }),
      },
      include: {
        category: { select: { id: true, name: true } },
        inventory: { select: { quantity: true, minStock: true, warehouseId: true } },
      },
      orderBy: { name: 'asc' },
      take: 500,
    });
    res.json({ success: true, data: products });
  })
);

// GET /api/products/sku/:sku
router.get(
  '/sku/:sku',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { sku: req.params.sku },
      include: { category: true, inventory: true },
    });
    res.json({ success: true, data: product });
  })
);

// GET /api/products/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, inventory: true },
    });
    if (!product) throw new NotFoundError('Product not found');
    res.json({ success: true, data: product });
  })
);

// POST /api/products
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate(createProductSchema),
  asyncHandler(async (req, res) => {
    const { name, sku, price, costPrice, categoryId, description, imageUrl, stock, minStock } =
      req.body as {
        name: string;
        sku: string;
        price: number;
        costPrice?: number;
        categoryId: string;
        description?: string;
        imageUrl?: string;
        stock?: number;
        minStock?: number;
      };

    const skuExists = await prisma.product.findUnique({ where: { sku } });
    if (skuExists) throw new ConflictError(`SKU ${sku} already exists`);
    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) throw new NotFoundError('Category not found');

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        price,
        costPrice,
        categoryId,
        description,
        imageUrl,
        ...(stock !== undefined
          ? {
              inventory: {
                create: {
                  // Bodega por defecto; el seed garantiza que exista.
                  ...(await (async () => {
                    const warehouse =
                      (await prisma.warehouse.findFirst({ where: { isDefault: true } })) ??
                      (await prisma.warehouse.findFirst());
                    if (!warehouse) throw new NotFoundError('No warehouse configured');
                    return { warehouseId: warehouse.id, quantity: stock, minStock: minStock ?? 0 };
                  })()),
                },
              },
            }
          : {}),
      },
      include: { category: true, inventory: true },
    });
    res.status(201).json({ success: true, data: product });
  })
);

// PUT /api/products/:id
router.put(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate(updateProductSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Product not found');
    const { stock, minStock, ...productData } = req.body as {
      stock?: number;
      minStock?: number;
    } & Record<string, unknown>;

    const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.product.update({
        where: { id: req.params.id },
        data: productData,
      });
      if (stock !== undefined || minStock !== undefined) {
        const warehouse =
          (await tx.warehouse.findFirst({ where: { isDefault: true } })) ??
          (await tx.warehouse.findFirst());
        if (warehouse) {
          const inv = await tx.inventoryItem.findUnique({
            where: { productId_warehouseId: { productId: updated.id, warehouseId: warehouse.id } },
          });
          if (inv) {
            await tx.inventoryItem.update({
              where: { id: inv.id },
              data: {
                ...(stock !== undefined ? { quantity: stock } : {}),
                ...(minStock !== undefined ? { minStock: minStock } : {}),
              },
            });
          } else {
            await tx.inventoryItem.create({
              data: {
                productId: updated.id,
                warehouseId: warehouse.id,
                quantity: stock ?? 0,
                minStock: minStock ?? 0,
              },
            });
          }
        }
      }
      return updated;
    });

    res.json({ success: true, data: product });
  })
);

// DELETE /api/products/:id — desactivación lógica (mantiene historial de ventas)
router.delete(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Product not found');
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, data: product });
  })
);

export default router;
