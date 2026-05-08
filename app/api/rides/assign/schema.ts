import { z } from 'zod';

export const assignRideSchema = z.object({
  driverId: z.string().uuid({ message: 'Driver ID is not a valid UUID' }),
  rideId: z.string().uuid({ message: 'Ride ID is not a valid UUID' }),
});
