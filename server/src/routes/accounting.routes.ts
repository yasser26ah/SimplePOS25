import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

// ---------- Plan de cuentas ----------

// GET /api/accounting/accounts
router.get(
  '/accounts',
  asyncHandler(async (_req, res) => {
    const accounts = await prisma.account.findMany({
      orderBy: { code: 'asc' },
      include: { children: { orderBy: { code: 'asc' } } },
    });
    res.json({ success: true, data: accounts });
  })
);

const accountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  parentId: z.string().uuid().nullable().optional(),
});

// POST /api/accounting/accounts
router.post(
  '/accounts',
  authorize('ADMIN'),
  validate(accountSchema),
  asyncHandler(async (req, res) => {
    const account = await prisma.account.create({ data: req.body });
    res.status(201).json({ success: true, data: account });
  })
);

// ---------- Libro diario ----------

const journalEntrySchema = z
  .object({
    description: z.string().max(300).optional(),
    status: z.enum(['DRAFT', 'POSTED']).default('POSTED'),
    details: z
      .array(
        z.object({
          accountId: z.string().uuid(),
          debit: z.number().min(0),
          credit: z.number().min(0),
          description: z.string().max(300).optional(),
        })
      )
      .min(2, 'At least two lines are required'),
  })
  .refine(
    (data) =>
      data.status !== 'POSTED' ||
      data.details.reduce((acc, d) => acc + d.debit, 0) ===
        data.details.reduce((acc, d) => acc + d.credit, 0),
    { message: 'Journal entry is not balanced: debits must equal credits' }
  );

// GET /api/accounting/journal
router.get(
  '/journal',
  asyncHandler(async (_req, res) => {
    const entries = await prisma.journalEntry.findMany({
      include: { details: { include: { account: { select: { code: true, name: true } } } } },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: entries });
  })
);

// POST /api/accounting/journal
router.post(
  '/journal',
  authorize('ADMIN', 'MANAGER'),
  validate(journalEntrySchema),
  asyncHandler(async (req, res) => {
    const { description, status, details } = req.body as z.infer<typeof journalEntrySchema>;
    const count = await prisma.journalEntry.count();
    const entryNumber = `JE-${String(count + 1).padStart(6, '0')}`;
    const entry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        description,
        status,
        details: { create: details },
      },
      include: { details: true },
    });
    res.status(201).json({ success: true, data: entry });
  })
);

// GET /api/accounting/balance — suma de mayores por tipo de cuenta
router.get(
  '/balance',
  asyncHandler(async (_req, res) => {
    const details = await prisma.journalEntryDetail.findMany({
      where: { journalEntry: { status: 'POSTED' } },
      include: { account: { select: { code: true, name: true, accountType: true } } },
    });

    const byType: Record<string, { debit: number; credit: number; balance: number }> = {
      ASSET: { debit: 0, credit: 0, balance: 0 },
      LIABILITY: { debit: 0, credit: 0, balance: 0 },
      EQUITY: { debit: 0, credit: 0, balance: 0 },
      REVENUE: { debit: 0, credit: 0, balance: 0 },
      EXPENSE: { debit: 0, credit: 0, balance: 0 },
    };
    const byAccount = new Map<
      string,
      { code: string; name: string; type: string; debit: number; credit: number }
    >();

    for (const d of details) {
      const debit = Number(d.debit);
      const credit = Number(d.credit);
      const type = d.account.accountType;
      if (byType[type]) {
        byType[type].debit += debit;
        byType[type].credit += credit;
      }
      const key = d.accountId;
      const prev = byAccount.get(key) ?? {
        code: d.account.code,
        name: d.account.name,
        type,
        debit: 0,
        credit: 0,
      };
      prev.debit += debit;
      prev.credit += credit;
      byAccount.set(key, prev);
    }

    // Naturaleza de las cuentas: activos/gastos al debe; pasivos/patrimonio/ingresos al haber.
    byType.ASSET!.balance = byType.ASSET!.debit - byType.ASSET!.credit;
    byType.EXPENSE!.balance = byType.EXPENSE!.debit - byType.EXPENSE!.credit;
    byType.LIABILITY!.balance = byType.LIABILITY!.credit - byType.LIABILITY!.debit;
    byType.EQUITY!.balance = byType.EQUITY!.credit - byType.EQUITY!.debit;
    byType.REVENUE!.balance = byType.REVENUE!.credit - byType.REVENUE!.debit;

    res.json({
      success: true,
      data: {
        byType,
        byAccount: Array.from(byAccount.values()).sort((a, b) => a.code.localeCompare(b.code)),
        totalDebits: details.reduce((acc, d) => acc + Number(d.debit), 0),
        totalCredits: details.reduce((acc, d) => acc + Number(d.credit), 0),
      },
    });
  })
);

export default router;
