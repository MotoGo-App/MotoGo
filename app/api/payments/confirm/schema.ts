import { z } from 'zod';

export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, { message: 'Payment intent ID is required' }),
});
