import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import config from '../config';
import { AppError } from '../utils/AppError';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  roleId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  async register(input: RegisterInput): Promise<AuthTokens> {
    const { username, email, password, roleId } = input;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new AppError('User with this email or username already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.bcrypt.rounds);

    // Get default role if not provided
    let roleIdToUse = roleId;
    if (!roleIdToUse) {
      const defaultRole = await prisma.role.findFirst({
        where: { name: 'USER' },
      });
      if (!defaultRole) {
        throw new AppError('Default role not found', 500);
      }
      roleIdToUse = defaultRole.id;
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        username,
        email,
        passwordHash,
        roleId: roleIdToUse,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email, user.roleId);

    // Update refresh token in DB (optional for single-session)
    // await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

    return tokens;
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const { email, password } = input;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email, user.roleId);

    return tokens;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
        userId: string;
        email: string;
        roleId: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: true },
      });

      if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token', 401);
      }

      return this.generateTokens(user.id, user.email, user.roleId);
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: { select: { id: true, name: true } },
        lastLogin: true,
        createdAt: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  private generateTokens(userId: string, email: string, roleId: string): AuthTokens {
    const payload = { userId, email, roleId };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
