import { z } from 'zod';

export const ridesSchema = z.object({
    origin: z.string().min(1, { message: 'Origin is required' }),
    destination: z.string().min(1, { message: 'Destination is required' }),
})