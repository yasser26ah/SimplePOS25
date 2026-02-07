import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config';
import logger from '../utils/logger';

// Auth rate limiter (stricter)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, options) => {
    logger.warn(`Rate limit exceeded for auth: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded: ${req.ip} - ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
    });
  },
});

// Skip rate limiter for health checks
export const skipRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl === '/health' || req.originalUrl === '/api/health') {
    return next();
  }
  return apiRateLimiter(req, res, next);
};
