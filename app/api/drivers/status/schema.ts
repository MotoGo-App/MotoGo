import { z } from 'zod';

export const statusDriverSchema = z.object({
  isOnline: z.boolean({ message: 'isOnline must be a boolean value' }),
});
