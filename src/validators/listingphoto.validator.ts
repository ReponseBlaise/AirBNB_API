import { z } from 'zod';

export const addListingPhotoSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
});

export type AddListingPhotoInput = z.infer<typeof addListingPhotoSchema>;
