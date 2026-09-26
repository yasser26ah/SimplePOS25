import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../types/express';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, roleId } = req.body;
      const tokens = await authService.register({ username, email, password, roleId });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      // Los tokens son stateless; el cliente los descarta.
      res.status(200).json({
        success: true,
        message: 'Logout successful',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const tokens = await authService.login({ email, password });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const user = await authService.getUserById(req.user.userId);
      const role = (user as { role?: { name?: string } }).role;

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: role?.name ?? 'UNKNOWN',
          isActive: user.isActive,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
