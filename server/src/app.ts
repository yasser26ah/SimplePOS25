import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { skipRateLimiter } from './middlewares/rateLimiter';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import productRoutes from './routes/products.routes';
import categoryRoutes from './routes/categories.routes';
import customerRoutes from './routes/customers.routes';
import saleRoutes from './routes/sales.routes';
import inventoryRoutes from './routes/inventory.routes';
import accountingRoutes from './routes/accounting.routes';
import bankRoutes from './routes/banks.routes';
import expenseRoutes from './routes/expenses.routes';

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check (before rate limiter)
app.get('/health', skipRateLimiter, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', skipRateLimiter, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/expenses', expenseRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
