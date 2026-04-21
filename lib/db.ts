import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Retry wrapper for database operations that may fail due to 
 * PostgreSQL idle-session timeouts or transient connection errors.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 300
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isTransient =
        errorMsg.includes('idle-session timeout') ||
        errorMsg.includes('terminating connection') ||
        errorMsg.includes('Connection refused') ||
        errorMsg.includes('connection closed') ||
        errorMsg.includes('Can\'t reach database') ||
        errorMsg.includes('ConnectionError') ||
        errorMsg.includes('ECONNRESET') ||
        errorMsg.includes('ECONNREFUSED') ||
        errorMsg.includes('prepared statement');
      
      if (!isTransient || attempt === maxRetries) {
        throw error;
      }
      
      // Disconnect to force a fresh connection on retry
      try {
        await prisma.$disconnect();
      } catch {
        // ignore disconnect errors
      }
      
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw lastError;
}

export default prisma;
