import { z } from "zod";

export const createListingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(2, "Location is required"),
  pricePerNight: z.number().positive("Price must be a positive number"),
  guests: z.number().int().min(1, "Must allow at least 1 guest"),
  type: z.enum(["APARTMENT", "HOUSE", "VILLA", "CABIN"]),
  amenities: z.array(z.string()).min(1, "At least one amenity is required"),
});

export const updateListingSchema = createListingSchema.partial();

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
import { ListingType, ListingStatus, CancellationPolicy } from "@prisma/client";

// Create listing
export const createListingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  address: z.string().min(5, "Address is required"),
  latitude: z.number().min(-90).max(90, "Invalid latitude"),
  longitude: z.number().min(-180).max(180, "Invalid longitude"),
  
  // Property details
  listingType: z.nativeEnum(ListingType),
  bedrooms: z.number().int().min(0),
  beds: z.number().int().min(1, "Must have at least 1 bed"),
  bathrooms: z.number().min(0.5),
  maxGuests: z.number().int().min(1, "Must allow at least 1 guest"),
  squareFeet: z.number().int().positive().optional(),
  
  // Amenities
  amenities: z.array(z.string()).min(1, "At least one amenity is required").max(50),
  houseRules: z.array(z.string()).max(20).optional().default([]),
  checkInMethod: z.string().min(1, "Check-in method is required"),
  checkInTime: z.string().default("15:00"),
  checkOutTime: z.string().default("11:00"),
  
  // Pricing
  basePricePerNight: z.number().positive("Price must be positive"),
  weekendPrice: z.number().positive().optional().nullable(),
  weeklyDiscount: z.number().min(0).max(100, "Discount must be 0-100%").optional().nullable(),
  monthlyDiscount: z.number().min(0).max(100, "Discount must be 0-100%").optional().nullable(),
  cleaningFee: z.number().min(0).default(0),
  extraGuestFee: z.number().min(0).optional().nullable(),
  
  // Cancellation & booking rules
  cancellationPolicy: z.nativeEnum(CancellationPolicy).default(CancellationPolicy.MODERATE),
  minNightStay: z.number().int().min(1).default(1),
  maxNightStay: z.number().int().positive().optional().nullable(),
  instantBook: z.boolean().default(false),
});

export const updateListingSchema = createListingSchema.partial();

// Publish listing
export const publishListingSchema = z.object({
  status: z.enum(["ACTIVE", "DRAFT", "SUSPENDED", "ARCHIVED"]),
});

// Update availability
export const updateAvailabilitySchema = z.object({
  date: z.string().datetime("Invalid date format"),
  isAvailable: z.boolean(),
  blockReason: z.string().optional().nullable(),
  minNightStay: z.number().int().positive().optional().nullable(),
  maxNightStay: z.number().int().positive().optional().nullable(),
});

// Bulk update availability
export const bulkUpdateAvailabilitySchema = z.object({
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date"),
  isAvailable: z.boolean(),
  blockReason: z.string().optional().nullable(),
});

// Upload listing photo
export const uploadListingPhotoSchema = z.object({
  photo: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, "Photo must be less than 10MB")
    .refine((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type), "Photo must be JPEG, PNG, or WebP"),
  displayOrder: z.number().int().min(0).optional(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type PublishListingInput = z.infer<typeof publishListingSchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type BulkUpdateAvailabilityInput = z.infer<typeof bulkUpdateAvailabilitySchema>;
export type UploadListingPhotoInput = z.infer<typeof uploadListingPhotoSchema>;
