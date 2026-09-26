import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError } from '../utils/AppError';

const router = Router();

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email').max(200),
  nit: z.string().min(1, 'NIT is required').max(50),
  phone: z.string().max(50).optional(),
  address: z.string().max(300).optional(),
});

router.use(authenticate);

// GET /api/customers?q=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { nit: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: 200,
    });
    res.json({ success: true, data: customers });
  })
);

// GET /api/customers/nit/:nit — lookup único usado por el POS
router.get(
  '/nit/:nit',
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { nit: req.params.nit },
    });
    res.json({ success: true, data: customer });
  })
);

// GET /api/customers/:id/history
router.get(
  '/:id/history',
  asyncHandler(async (req, res) => {
    const sales = await prisma.sale.findMany({
      where: { customerId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { items: { include: { product: { select: { name: true } } } } },
    });
    res.json({ success: true, data: sales });
  })
);

// GET /api/customers/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) throw new NotFoundError('Customer not found');
    res.json({ success: true, data: customer });
  })
);

// POST /api/customers — upsert por NIT (el POS reutiliza clientes existentes)
router.post(
  '/',
  validate(customerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, nit, phone, address } = req.body as {
      name: string;
      email: string;
      nit: string;
      phone?: string;
      address?: string;
    };
    const customer = await prisma.customer.upsert({
      where: { nit },
      update: { name, email, phone, address },
      create: { name, email, nit, phone, address },
    });
    res.status(201).json({ success: true, data: customer });
  })
);

// PUT /api/customers/:id
router.put(
  '/:id',
  validate(customerSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Customer not found');
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: customer });
  })
);

// DELETE /api/customers/:id — desactivación lógica
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Customer not found');
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, data: customer });
  })
);

export default router;
