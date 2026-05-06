import { z } from 'zod';

export const paymentSchema = z.object({
  rideId: z.string().min(1).optional(),
  amount: z.number().positive({ message: 'Amount must be a positive number' }),
  type: z.string().min(1, { message: 'Payment type is required' }),
});
