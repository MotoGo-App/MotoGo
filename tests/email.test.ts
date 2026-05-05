import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendForgotPasswordEmail } from '@/lib/email';

describe('Email Service (lib/email.ts)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('debe lanzar un error si las variables de entorno de Abacus no están configuradas', async () => {
    // Simulamos que la API KEY está vacía
    vi.stubEnv('ABACUSAI_API_KEY', '');

    await expect(sendForgotPasswordEmail('test@example.com', '<h1>HTML</h1>')).rejects.toThrow();
  });

  it('debe lanzar un error si la respuesta de Abacus AI no es exitosa (status != 200)', async () => {
    // Configuramos el mock para que devuelva un error 500 y un JSON específico
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Error interno de Abacus' }),
    });

    // Usamos una expresión regular para que el test pase si el error contiene la palabra "Abacus"
    await expect(sendForgotPasswordEmail('test@example.com', '<body>Test</body>')).rejects.toThrow(
      /Abacus/
    );
  });

  it('debe funcionar correctamente cuando la API responde con éxito', async () => {
    // Simulamos una respuesta exitosa
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const result = await sendForgotPasswordEmail('test@example.com', '<body>Exito</body>');
    expect(result).toBe(true);
  });
});
