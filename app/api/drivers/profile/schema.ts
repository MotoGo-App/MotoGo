import { z } from 'zod';

export const profileDriverSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(100)
    .optional(),
  age: z
    .number()
    .int()
    .min(18, { message: 'Driver must be at least 18 years old' })
    .max(100)
    .optional(),
  drivingExperienceYears: z.number().int().min(0).optional(),
  mototaxiNumber: z.string().min(1).optional(),
  bio: z.string().max(500, { message: 'Bio cannot exceed 500 characters' }).optional(),
  profilePhotoUrl: z.string().url({ message: 'Invalid photo URL' }).optional(),
  vehicleModel: z.string().min(1, { message: 'Vehicle model is required' }).optional(),
  licenseNumber: z.string().min(5).max(20).optional(),
  vehiclePlate: z.string().min(1).optional(),
});
