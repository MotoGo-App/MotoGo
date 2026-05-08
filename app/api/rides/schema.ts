import { z } from 'zod';

export const ridesSchema = z.object({
  originAddress: z.string().min(1, { message: 'Origin address is required' }),
  originLatitude: z.number().min(-90).max(90, { message: 'Invalid origin latitude' }),
  originLongitude: z.number().min(-180).max(180, { message: 'Invalid origin longitude' }),
  destinationAddress: z.string().min(1, { message: 'Destination address is required' }),
  destinationLatitude: z.number().min(-90).max(90, { message: 'Invalid destination latitude' }),
  destinationLongitude: z.number().min(-180).max(180, { message: 'Invalid destination longitude' }),
});
