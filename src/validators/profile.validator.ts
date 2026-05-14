import { z } from "zod";

export const createProfileSchema = z.object({
  bio: z.string().max(300, "Bio must be at most 300 characters").optional(),
  website: z.string().url("Invalid website URL").optional(),
  country: z.string().optional(),
});

export const updateProfileSchema = createProfileSchema.partial();

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
import { UserRole } from "@prisma/client";

// Profile creation
export const createProfileSchema = z.object({
  bio: z.string().max(500, "Bio must be at most 500 characters").optional().nullable(),
  website: z.string().url("Invalid website URL").optional().nullable(),
  country: z.string().optional().nullable(),
  joinedYear: z.number().int().min(2020, "Year must be 2020 or later").optional().nullable(),
  languagesSpoken: z.array(z.string()).optional().default([]),
});

export const updateProfileSchema = createProfileSchema.partial();

// Full user profile update (includes auth fields)
export const updateUserProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  phone: z.string().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  website: z.string().url("Invalid website URL").optional().nullable(),
  country: z.string().optional().nullable(),
  languagesSpoken: z.array(z.string()).optional(),
  preferredRole: z.enum([UserRole.GUEST, UserRole.HOST]).optional(),
});

// Avatar upload
export const uploadAvatarSchema = z.object({
  avatar: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "Avatar must be less than 5MB")
    .refine((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type), "Avatar must be JPEG, PNG, or WebP"),
});

// Notification preferences
export const updateNotificationPreferencesSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  sms: z.boolean().default(false),
});

// Change password
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Government ID verification (KYC)
export const submitKycSchema = z.object({
  governmentId: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, "ID document must be less than 10MB")
    .refine((file) => ["image/jpeg", "image/png", "application/pdf"].includes(file.type), "ID must be JPEG, PNG, or PDF"),
});

// MFA Setup
export const setupMfaSchema = z.object({
  method: z.enum(["sms", "totp"]),
  phone: z.string().optional().nullable(),
});

// MFA Verification
export const verifyMfaSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "MFA code must be 6 digits"),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type UploadAvatarInput = z.infer<typeof uploadAvatarSchema>;
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SubmitKycInput = z.infer<typeof submitKycSchema>;
export type SetupMfaInput = z.infer<typeof setupMfaSchema>;
export type VerifyMfaInput = z.infer<typeof verifyMfaSchema>;
