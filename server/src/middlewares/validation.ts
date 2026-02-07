import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ValidationError } from '../utils/AppError';

export const validate = (schema: { safeParse: (data: unknown) => { success: boolean; error?: ZodError; data?: unknown } }) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw new ValidationError('Validation failed', errors);
      }

      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};
