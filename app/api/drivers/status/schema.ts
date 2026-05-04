import { z } from 'zod';

export const statusDriverSchema = z.object({
  status: z.enum(['available', 'unavailable'], {
    message: 'Status must be either "available" or "unavailable"',
  }),
});
