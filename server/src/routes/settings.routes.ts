import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const SETTINGS_KEY = 'business_settings';

const settingsSchema = z.object({
  storeName: z.string().min(1).max(200),
  nit: z.string().max(50).default(''),
  address: z.string().max(300).default(''),
  phone: z.string().max(50).default(''),
  taxRate: z.number().min(0).max(100).default(0),
  lowStockThreshold: z.number().int().min(0).default(10),
});

type BusinessSettings = z.infer<typeof settingsSchema>;

const DEFAULTS: BusinessSettings = {
  storeName: 'Mi Tienda',
  nit: '',
  address: '',
  phone: '',
  taxRate: 0,
  lowStockThreshold: 10,
};

async function readSettings(): Promise<BusinessSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(row.value) as Partial<BusinessSettings>) };
  } catch {
    return DEFAULTS;
  }
}

// GET /api/settings
router.get(
  '/',
  authenticate,
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await readSettings() });
  })
);

// PUT /api/settings
router.put(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as BusinessSettings;
    await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: JSON.stringify(data), type: 'JSON' },
      create: { key: SETTINGS_KEY, value: JSON.stringify(data), type: 'JSON' },
    });
    res.json({ success: true, data });
  })
);

export default router;
