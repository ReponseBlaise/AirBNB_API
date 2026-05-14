import { z } from "zod";

// Create review (guest reviewing listing/host)
export const createGuestReviewSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  
  // Ratings (1-5)
  overallRating: z.number().int().min(1, "Rating must be 1-5").max(5),
  cleanlinessRating: z.number().int().min(1).max(5),
  accuracyRating: z.number().int().min(1).max(5),
  checkInRating: z.number().int().min(1).max(5),
  communicationRating: z.number().int().min(1).max(5),
  locationRating: z.number().int().min(1).max(5),
  valueRating: z.number().int().min(1).max(5),
  
  // Comment
  comment: z.string()
    .min(10, "Review must be at least 10 characters")
    .max(2000, "Review must be less than 2000 characters"),
});

// Create review (host reviewing guest)
export const createHostReviewSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  
  hostOverallRating: z.number().int().min(1, "Rating must be 1-5").max(5),
  comment: z.string()
    .min(10, "Review must be at least 10 characters")
    .max(2000, "Review must be less than 2000 characters")
    .optional(),
});

// Update review
export const updateReviewSchema = z.object({
  overallRating: z.number().int().min(1).max(5).optional(),
  cleanlinessRating: z.number().int().min(1).max(5).optional(),
  accuracyRating: z.number().int().min(1).max(5).optional(),
  checkInRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  locationRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
  hostOverallRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});

// Host response to review
export const hostReviewResponseSchema = z.object({
  response: z.string()
    .min(10, "Response must be at least 10 characters")
    .max(1000, "Response must be less than 1000 characters"),
});

// Flag review
export const flagReviewSchema = z.object({
  reason: z.enum([
    "inappropriate_content",
    "fake_review",
    "spam",
    "discrimination",
    "harassment",
    "other"
  ]),
  description: z.string().optional(),
});

export type CreateGuestReviewInput = z.infer<typeof createGuestReviewSchema>;
export type CreateHostReviewInput = z.infer<typeof createHostReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type HostReviewResponseInput = z.infer<typeof hostReviewResponseSchema>;
export type FlagReviewInput = z.infer<typeof flagReviewSchema>;
