import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError } from '../utils/AppError';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

router.use(authenticate);

// GET /api/categories
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: categories });
  })
);

// POST /api/categories
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const { name, description } = req.body as { name: string; description?: string };
    const category = await prisma.category.create({
      data: { name, description },
    });
    res.status(201).json({ success: true, data: category });
  })
);

// PUT /api/categories/:id
router.put(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  validate(categorySchema.partial()),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Category not found');
    const category = await prisma.category.update({ where: { id }, data: req.body });
    res.json({ success: true, data: category });
  })
);

// DELETE /api/categories/:id
router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const products = await prisma.product.count({ where: { categoryId: id } });
    if (products > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete: ${products} product(s) use this category`,
      });
      return;
    }
    await prisma.category.delete({ where: { id } });
    res.json({ success: true, data: null });
  })
);

export default router;
