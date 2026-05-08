import { z } from 'zod';

export const driverSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' }),
  licenseNumber: z.string().min(5).max(20),
  vehicleType: z.enum(['motorcycle', 'car', 'truck']),
  rating: z.number().min(0).max(5).optional(),
});
