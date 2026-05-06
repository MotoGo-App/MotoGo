import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendForgotPasswordEmail } from '@/lib/email';

describe('Email Service (lib/email.ts)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should throw an error if Abacus environment variables are not set', async () => {
    vi.stubEnv('ABACUSAI_API_KEY', '');

    await expect(sendForgotPasswordEmail('test@example.com', '<h1>HTML</h1>')).rejects.toThrow();
  });

  it('should throw an error if the response from Abacus AI is not successful (status != 200)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Error interno de Abacus' }),
    });

    await expect(sendForgotPasswordEmail('test@example.com', '<body>Test</body>')).rejects.toThrow(
      /Abacus/
    );
  });

  it('should work correctly when the API responds successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const result = await sendForgotPasswordEmail('test@example.com', '<body>Success</body>');
    expect(result).toBe(true);
  });
});
