import { z } from 'zod';

export const completeRideSchema = z.object({
  rideId: z.string().min(1, { message: 'Ride ID is required' }),
});
