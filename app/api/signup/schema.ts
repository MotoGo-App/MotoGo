import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(2, { message: 'Name must be at least 2 characters long' }).max(100),
  email: z.string().email({ message: 'Invalid email address' }),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }).max(100),
});
