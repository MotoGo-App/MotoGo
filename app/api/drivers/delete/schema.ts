import { z } from 'zod';

export const deleteDriverSchema = z.object({
    id: z.string().min(1, { message: 'Driver ID is required' }),
})