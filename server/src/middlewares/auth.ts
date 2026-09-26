import { Response, NextFunction } from 'express';
import jwt, { type JwtPayload as JwtLibPayload } from 'jsonwebtoken';
import config from '../config';
import { AppError } from '../utils/AppError';
import type { AuthenticatedRequest } from '../types/express';
import prisma from '../config/database';

export interface JwtPayload {
  userId: string;
  email: string;
  roleId: string;
}

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1] as string;
    const decoded = jwt.verify(token, config.jwt.secret) as JwtLibPayload & Partial<JwtPayload>;

    if (!decoded.userId || !decoded.roleId) {
      throw new AppError('Invalid token', 401);
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email ?? '',
      role: decoded.roleId,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
      return;
    }
    next(error instanceof AppError ? error : new AppError('Authentication failed', 401));
  }
};

/** Autorización por rol: acepta el id del rol y lo resuelve a nombre contra la BD. */
const roleNameCache = new Map<string, string>();

async function getRoleName(roleId: string): Promise<string> {
  const cached = roleNameCache.get(roleId);
  if (cached) return cached;
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { name: true } });
  const name = role?.name ?? 'UNKNOWN';
  roleNameCache.set(roleId, name);
  return name;
}

export const authorize = (...roles: string[]) => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }
      const roleName = await getRoleName(req.user.role);
      req.user.role = roleName;
      if (!roles.includes(roleName)) {
        throw new AppError('Not authorized to access this resource', 403);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
