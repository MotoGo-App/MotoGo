import { z } from 'zod';

export const ridesSchema = z.object({
    origin: z.string().min(1, { message: 'Origin is required' }),
    destination: z.string().min(1, { message: 'Destination is required' }),
    originLat: z.number().min(-90).max(90).optional(),
    originLng: z.number().min(-180).max(180).optional(),
    destLat: z.number().min(-90).max(90).optional(),
    destLng: z.number().min(-180).max(180).optional(),
})