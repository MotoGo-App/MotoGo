import { z } from 'zod';

export const acceptRideSchema = z.object({
  rideId: z.string().min(1),
});

export type AcceptRideInput = z.infer<typeof acceptRideSchema>;
