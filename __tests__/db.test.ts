import { describe, it, expect, vi } from 'vitest';
import { withRetry, prisma } from '../lib/db';

describe('Database withRetry Wrapper', () => {
  it('debería retornar el resultado exitoso en el primer intento', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await withRetry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('debería reintentar si hay un error transitorio (ej: ECONNRESET)', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce('recovered');

    const result = await withRetry(operation, 2, 10); 
    
    expect(result).toBe('recovered');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('debería fallar después de exceder el máximo de reintentos', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    
    await expect(withRetry(operation, 3, 10)).rejects.toThrow('ECONNRESET');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});