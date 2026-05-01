import { z } from 'zod';

export const idRidesSchema = z.object({
    id: z.string().uuid({ message: 'ID provided is not a valid UUID' }),
})