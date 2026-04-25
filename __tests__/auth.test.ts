import { describe, it, expect, vi } from 'vitest';
import { authOptions } from '../lib/auth';

describe('Auth Configuration (NextAuth)', () => {
  
  describe('Callbacks', () => {
    
    it('jwt callback debería añadir el id y el role al token cuando el usuario se loguea', async () => {
      const mockUser = { id: 'user-123', email: 'test@motogo.com', role: 'DRIVER' };
      const mockToken = {};

      // Ejecutamos la callback jwt
      const resultToken = await authOptions.callbacks?.jwt?.({ 
        token: mockToken, 
        user: mockUser 
      } as any);

      expect(resultToken).toHaveProperty('id', 'user-123');
      expect(resultToken).toHaveProperty('role', 'DRIVER');
    });

    it('session callback debería transferir los datos del token a la sesión del usuario', async () => {
      const mockToken = { id: 'user-123', role: 'ADMIN' };
      const mockSession = { user: { name: 'Admin' } };

      // Ejecutamos la callback session
      const resultSession = await authOptions.callbacks?.session?.({ 
        session: mockSession as any, 
        token: mockToken as any 
      } as any);

      expect(resultSession.user).toHaveProperty('id', 'user-123');
      expect(resultSession.user).toHaveProperty('role', 'ADMIN');
    });
  });

  describe('General Config', () => {
    it('debería usar la estrategia JWT', () => {
      expect(authOptions.session?.strategy).toBe('jwt');
    });

    it('debería tener configurada la página de login correcta', () => {
      expect(authOptions.pages?.signIn).toBe('/login');
    });
  });
});