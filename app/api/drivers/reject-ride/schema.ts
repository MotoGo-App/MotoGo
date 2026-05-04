import { z } from 'zod';

export const rejectRideSchema = z.object({
  rideId: z.string().min(1, { message: 'Ride ID is required' }),
});
