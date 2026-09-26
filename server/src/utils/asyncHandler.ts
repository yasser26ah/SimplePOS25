import { NextFunction, Request, Response } from 'express';

/** Envuelve handlers async para que los rechazos lleguen al errorHandler. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
