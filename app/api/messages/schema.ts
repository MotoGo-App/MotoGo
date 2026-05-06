import { z } from 'zod';

export const messageSchema = z.object({
  rideId: z.string().min(1, { message: 'Ride ID is required' }),
  content: z
    .string()
    .trim()
    .min(1, { message: 'Message content is required' })
    .max(500, { message: 'Message cannot exceed 500 characters' }),
});
