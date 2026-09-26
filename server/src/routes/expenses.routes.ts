import { Router, type Request } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ValidationError } from '../utils/AppError';
import type { AuthenticatedRequest } from '../types/express';

const authReq = (req: Request) => req as AuthenticatedRequest & { user: { userId: string } };

const router = Router();

router.use(authenticate);

// ---------- Categorías de gasto ----------

// GET /api/expenses/categories
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: categories });
  })
);

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
});

// POST /api/expenses/categories
router.post(
  '/categories',
  authorize('ADMIN', 'MANAGER'),
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const category = await prisma.expenseCategory.create({ data: req.body });
    res.status(201).json({ success: true, data: category });
  })
);

// ---------- Gastos ----------

// GET /api/expenses?from=&to=&categoryId=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { from, to, categoryId } = req.query as Record<string, string | undefined>;
    const expenses = await prisma.expense.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      include: { category: true, user: { select: { username: true } } },
      orderBy: { date: 'desc' },
      take: 300,
    });
    res.json({ success: true, data: expenses });
  })
);

const expenseSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().min(1).max(300),
  date: z.string().datetime().optional(),
  payFromCash: z.boolean().default(false),
});

// POST /api/expenses — registra el gasto y, si sale de caja, mueve el efectivo
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  validate(expenseSchema),
  asyncHandler(async (req, res) => {
    const { categoryId, amount, description, date, payFromCash } = req.body as {
      categoryId: string;
      amount: number;
      description: string;
      date?: string;
      payFromCash: boolean;
    };
    const userId = authReq(req).user.userId;

    const category = await prisma.expenseCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundError('Expense category not found');

    const cashBox = await prisma.cashBox.findFirst();
    if (payFromCash) {
      if (!cashBox) throw new NotFoundError('Cash box not configured');
      if (!cashBox.isOpen) throw new ValidationError('Cash box must be open to pay expenses');
      if (Number(cashBox.currentBalance) < amount) {
        throw new ValidationError('Insufficient cash in box');
      }
    }

    const expense = await prisma.$transaction(async (tx) => {
      const e = await tx.expense.create({
        data: {
          categoryId,
          amount,
          description,
          ...(date ? { date: new Date(date) } : {}),
          userId,
        },
        include: { category: true },
      });

      if (payFromCash && cashBox) {
        await tx.cashMovement.create({
          data: {
            cashBoxId: cashBox.id,
            type: 'OUT',
            amount,
            category: 'EXPENSE',
            description,
            userId,
          },
        });
        await tx.cashBox.update({
          where: { id: cashBox.id },
          data: { currentBalance: { decrement: amount } },
        });
      }

      // Asiento contable del gasto (Gastos Generales / Caja o Proveedores)
      const [expenseAccount, creditAccount] = await Promise.all([
        tx.account.findUnique({ where: { code: '6001' } }),
        tx.account.findUnique({ where: { code: '1001' } }),
      ]);
      if (expenseAccount && creditAccount) {
        const count = await tx.journalEntry.count();
        await tx.journalEntry.create({
          data: {
            entryNumber: `JE-${String(count + 1).padStart(6, '0')}`,
            description: `Gasto: ${description}`,
            status: 'POSTED',
            details: {
              create: [
                { accountId: expenseAccount.id, debit: amount, credit: 0 },
                { accountId: creditAccount.id, debit: 0, credit: amount },
              ],
            },
          },
        });
      }

      return e;
    });

    res.status(201).json({ success: true, data: expense });
  })
);

export default router;
