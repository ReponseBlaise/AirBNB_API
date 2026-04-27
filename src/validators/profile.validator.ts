import { z } from "zod";

export const createProfileSchema = z.object({
  bio: z.string().max(300, "Bio must be at most 300 characters").optional(),
  website: z.string().url("Invalid website URL").optional(),
  country: z.string().optional(),
});

export const updateProfileSchema = createProfileSchema.partial();

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
