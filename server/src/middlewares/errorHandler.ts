import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

interface ErrorResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string>[];
  stack?: string;
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const message = err.message || 'Internal server error';

  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`);

  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  const response: ErrorResponse = {
    success: false,
    message,
  };

  if (err instanceof AppError && 'errors' in err && err.errors) {
    response.errors = err.errors as Record<string, string>[];
  }

  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  res.status(404).json({
    success: false,
    message: error.message,
  });
};
