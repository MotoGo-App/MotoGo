import { z } from 'zod';

export const cancelRideSchema = z.object({
  rideId: z.string().uuid({ message: 'Ride ID is not a valid UUID' }),
  reason: z.string().optional(),
});
