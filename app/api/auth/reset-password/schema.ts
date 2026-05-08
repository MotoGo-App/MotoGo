import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email address' }),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
    token: z.string().min(1, { message: 'Token is required' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
