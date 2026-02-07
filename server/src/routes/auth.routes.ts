import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validation';
import { authRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Public routes (with rate limiting)
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.string().uuid('Invalid role ID').optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Public routes
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

export default router;
