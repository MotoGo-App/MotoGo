import { z } from 'zod';

export const profilePhotoDriverSchema = z.object({
    photoUrl: z.string().url({ message: 'Invalid URL format' }),
})