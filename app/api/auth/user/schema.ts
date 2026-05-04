import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email({ message: 'Invalid email address' }),
  role: z.enum(['USER', 'DRIVER']),
});
