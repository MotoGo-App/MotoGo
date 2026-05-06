import { z } from 'zod';

export const profilePhotoDriverSchema = z.object({
  fileName: z.string().min(1, { message: 'File name is required' }),
  fileSize: z
    .number()
    .positive()
    .max(5 * 1024 * 1024, { message: 'El archivo es demasiado grande. Máximo 5MB' }),
  fileType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    message: 'Tipo de archivo no permitido. Use JPG, PNG o WebP',
  }),
});
