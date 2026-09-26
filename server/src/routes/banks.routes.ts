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

// ---------- Cuentas bancarias ----------

// GET /api/banks/accounts
router.get(
  '/accounts',
  asyncHandler(async (_req, res) => {
    const accounts = await prisma.bankAccount.findMany({
      include: { transactions: { orderBy: { date: 'desc' }, take: 20 } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: accounts });
  })
);

const bankAccountSchema = z.object({
  name: z.string().min(1).max(100),
  accountType: z.enum(['CHECKING', 'SAVINGS', 'CREDIT']),
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(50).optional(),
  openingBalance: z.number().default(0),
});

// POST /api/banks/accounts
router.post(
  '/accounts',
  authorize('ADMIN', 'MANAGER'),
  validate(bankAccountSchema),
  asyncHandler(async (req, res) => {
    const { openingBalance, ...data } = req.body as z.infer<typeof bankAccountSchema>;
    const account = await prisma.bankAccount.create({
      data: { ...data, currentBalance: openingBalance },
    });
    res.status(201).json({ success: true, data: account });
  })
);

const bankTxSchema = z.object({
  bankAccountId: z.string().uuid(),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT']),
  amount: z.number().positive(),
  description: z.string().max(300).optional(),
});

// POST /api/banks/transactions — actualiza saldo atómicamente
router.post(
  '/transactions',
  authorize('ADMIN', 'MANAGER'),
  validate(bankTxSchema),
  asyncHandler(async (req, res) => {
    const { bankAccountId, type, amount, description } = req.body as z.infer<typeof bankTxSchema>;
    const account = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!account) throw new NotFoundError('Bank account not found');

    const signedAmount = type === 'DEPOSIT' ? amount : -amount;
    const transaction = await prisma.$transaction(async (tx) => {
      await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: { currentBalance: { increment: signedAmount } },
      });
      return tx.bankTransaction.create({
        data: { bankAccountId, type, amount, description },
      });
    });
    res.status(201).json({ success: true, data: transaction });
  })
);

// ---------- Caja (CashBox) ----------

// GET /api/banks/cash — estado de la caja + movimientos recientes
router.get(
  '/cash',
  asyncHandler(async (_req, res) => {
    const cashBox = await prisma.cashBox.findFirst({
      include: { movements: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    res.json({ success: true, data: cashBox });
  })
);

const openSchema = z.object({ openingBalance: z.number().min(0) });

// POST /api/banks/cash/open
router.post(
  '/cash/open',
  validate(openSchema),
  asyncHandler(async (req, res) => {
    const { openingBalance } = req.body as z.infer<typeof openSchema>;
    const cashBox = await prisma.cashBox.findFirst();
    if (!cashBox) throw new NotFoundError('Cash box not configured');
    if (cashBox.isOpen) throw new ValidationError('Cash box is already open');

    const updated = await prisma.cashBox.update({
      where: { id: cashBox.id },
      data: {
        isOpen: true,
        openingBalance,
        currentBalance: openingBalance,
        openedAt: new Date(),
        closedAt: null,
      },
    });
    res.json({ success: true, data: updated });
  })
);

// POST /api/banks/cash/close
router.post(
  '/cash/close',
  asyncHandler(async (_req, res) => {
    const cashBox = await prisma.cashBox.findFirst();
    if (!cashBox) throw new NotFoundError('Cash box not configured');
    if (!cashBox.isOpen) throw new ValidationError('Cash box is not open');

    const updated = await prisma.cashBox.update({
      where: { id: cashBox.id },
      data: { isOpen: false, closedAt: new Date() },
    });
    res.json({ success: true, data: updated });
  })
);

const movementSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  amount: z.number().positive(),
  category: z.enum(['SALE', 'EXPENSE', 'ADJUSTMENT', 'TRANSFER']),
  description: z.string().max(300).optional(),
});

// POST /api/banks/cash/movement — egreso/ingreso manual de caja
router.post(
  '/cash/movement',
  authorize('ADMIN', 'MANAGER'),
  validate(movementSchema),
  asyncHandler(async (req, res) => {
    const { type, amount, category, description } = req.body as z.infer<typeof movementSchema>;
    const userId = authReq(req).user.userId;
    const cashBox = await prisma.cashBox.findFirst();
    if (!cashBox) throw new NotFoundError('Cash box not configured');
    if (!cashBox.isOpen) throw new ValidationError('Cash box must be open to register movements');
    if (type === 'OUT' && Number(cashBox.currentBalance) < amount) {
      throw new ValidationError('Insufficient cash in box');
    }

    const movement = await prisma.$transaction(async (tx) => {
      const m = await tx.cashMovement.create({
        data: { cashBoxId: cashBox.id, type, amount, category, description, userId },
      });
      await tx.cashBox.update({
        where: { id: cashBox.id },
        data: {
          currentBalance: type === 'IN' ? { increment: amount } : { decrement: amount },
        },
      });
      return m;
    });
    res.status(201).json({ success: true, data: movement });
  })
);

export default router;
