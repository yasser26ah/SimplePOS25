import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Connection test
prisma.$connect()
  .then(() => {
    logger.info('Database connection established successfully');
  })
  .catch((error) => {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Database connection closed');
  process.exit(0);
});
