import { z } from "zod";

// Create dispute
export const createDisputeSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  reason: z.enum(
    ["property_damage", "safety_concern", "refund_dispute", "other"],
    { errorMap: () => ({ message: "Invalid dispute reason" }) }
  ),
  description: z.string()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be less than 2000 characters"),
  
  // Evidence
  photos: z.array(z.instanceof(File))
    .optional()
    .refine((files) => !files || files.every(f => f.size <= 10 * 1024 * 1024), 
      "Each photo must be less than 10MB")
    .refine((files) => !files || files.every(f => ["image/jpeg", "image/png", "image/webp"].includes(f.type)),
      "Photos must be JPEG, PNG, or WebP"),
  
  documents: z.array(z.instanceof(File))
    .optional()
    .refine((files) => !files || files.every(f => f.size <= 25 * 1024 * 1024),
      "Each document must be less than 25MB")
    .refine((files) => !files || files.every(f => ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(f.type)),
      "Documents must be PDF or Word format"),
});

// Update dispute
export const updateDisputeSchema = z.object({
  description: z.string().max(2000).optional(),
});

// Resolve dispute (admin only)
export const resolveDisputeSchema = z.object({
  resolution: z.string()
    .min(10, "Resolution description must be at least 10 characters")
    .max(2000),
  resolvedAmount: z.number().min(0, "Amount must be non-negative").optional(),
});

// Submit dispute evidence
export const submitDisputeEvidenceSchema = z.object({
  photos: z.array(z.instanceof(File))
    .optional()
    .refine((files) => !files || files.every(f => f.size <= 10 * 1024 * 1024), 
      "Each photo must be less than 10MB"),
  documents: z.array(z.instanceof(File))
    .optional()
    .refine((files) => !files || files.every(f => f.size <= 25 * 1024 * 1024),
      "Each document must be less than 25MB"),
});

export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
export type UpdateDisputeInput = z.infer<typeof updateDisputeSchema>;
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
export type SubmitDisputeEvidenceInput = z.infer<typeof submitDisputeEvidenceSchema>;
