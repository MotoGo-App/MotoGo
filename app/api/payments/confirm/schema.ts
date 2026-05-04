import { z } from 'zod';

export const confirmPaymentSchema = z.object({
  rideId: z.string().min(1, { message: 'Ride ID is required' }),
});
