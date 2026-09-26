import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import config from '../config';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ConflictError } from '../utils/AppError';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.string().uuid().optional(),
  roleName: z.enum(['ADMIN', 'MANAGER', 'SELLER']).optional(),
});

const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  roleId: z.string().uuid().optional(),
  roleName: z.enum(['ADMIN', 'MANAGER', 'SELLER']).optional(),
  isActive: z.boolean().optional(),
});

router.use(authenticate, authorize('ADMIN'));

// GET /api/users
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: { select: { id: true, name: true } },
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: users });
  })
);

// GET /api/users/roles
router.get(
  '/roles',
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: roles });
  })
);

// POST /api/users
router.post(
  '/',
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { username, email, password, roleId, roleName } = req.body as {
      username: string;
      email: string;
      password: string;
      roleId?: string;
      roleName?: 'ADMIN' | 'MANAGER' | 'SELLER';
    };

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) throw new ConflictError('User with this email or username already exists');

    const role = roleId
      ? await prisma.role.findUnique({ where: { id: roleId } })
      : await prisma.role.findUnique({ where: { name: roleName ?? 'SELLER' } });
    if (!role) throw new NotFoundError('Role not found');

    const passwordHash = await bcrypt.hash(password, config.bcrypt.rounds);
    const user = await prisma.user.create({
      data: { username, email, passwordHash, roleId: role.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: { select: { id: true, name: true } },
        isActive: true,
      },
    });
    res.status(201).json({ success: true, data: user });
  })
);

// PUT /api/users/:id
router.put(
  '/:id',
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('User not found');

    const { username, email, password, roleId, roleName, isActive } = req.body as {
      username?: string;
      email?: string;
      password?: string;
      roleId?: string;
      roleName?: 'ADMIN' | 'MANAGER' | 'SELLER';
      isActive?: boolean;
    };

    let effectiveRoleId: string | undefined;
    if (roleId) effectiveRoleId = roleId;
    else if (roleName) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) throw new NotFoundError('Role not found');
      effectiveRoleId = role.id;
    }

    const passwordHash = password ? await bcrypt.hash(password, config.bcrypt.rounds) : undefined;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(username ? { username } : {}),
        ...(email ? { email } : {}),
        ...(passwordHash ? { passwordHash } : {}),
        ...(effectiveRoleId ? { roleId: effectiveRoleId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: { select: { id: true, name: true } },
        isActive: true,
      },
    });
    res.json({ success: true, data: user });
  })
);

// DELETE /api/users/:id — desactivación lógica
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('User not found');
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });
    res.json({ success: true, data: user });
  })
);

export default router;
