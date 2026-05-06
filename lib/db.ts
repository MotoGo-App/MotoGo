import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Cliente de Prisma con singleton para evitar agotar conexiones en desarrollo.
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'], // Solo logueamos errores para mantener limpia la consola
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

      // Lista de errores transitorios que ameritan un reintento
      const isTransient =
        errorMsg.includes('idle-session timeout') ||
        errorMsg.includes('terminating connection') ||
        errorMsg.includes('Connection refused') ||
        errorMsg.includes('connection closed') ||
        errorMsg.includes("Can't reach database") ||
        errorMsg.includes('ConnectionError') ||
        errorMsg.includes('ECONNRESET') ||
        errorMsg.includes('ECONNREFUSED') ||
        errorMsg.includes('prepared statement');

      // Si no es un error de conexión o ya agotamos intentos, lanzamos el error
      if (!isTransient || attempt === maxRetries) {
        throw error;
      }

      // Desconectamos para forzar una nueva conexión limpia en el siguiente intento
      try {
        await prisma.$disconnect();
      } catch {
        // Ignoramos errores de desconexión
      }

      // Espera exponencial: aumenta el tiempo en cada intento fallido
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw lastError;
}

// Exportación por defecto para archivos que usan "import prisma from '@/lib/db'"
export default prisma;
