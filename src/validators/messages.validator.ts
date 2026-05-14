import { z } from "zod";
import { MessageType } from "@prisma/client";

// Send text message
export const sendMessageSchema = z.object({
  threadId: z.string().uuid("Invalid thread ID").optional(),
  listingId: z.string().uuid("Invalid listing ID").optional(),
  bookingId: z.string().uuid("Invalid booking ID").optional(),
  
  // At least one recipient context is required
  recipientId: z.string().uuid("Invalid recipient ID").optional(),
  
  messageType: z.nativeEnum(MessageType).default(MessageType.TEXT),
  content: z.string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message must be less than 5000 characters")
    .optional(),
}).refine(
  (data) => data.content || data.messageType === MessageType.IMAGE,
  "Content is required for text messages"
).refine(
  (data) => data.threadId || data.listingId || data.bookingId || data.recipientId,
  "Must provide thread, listing, booking, or recipient context"
);

// Send image message
export const sendImageMessageSchema = z.object({
  threadId: z.string().uuid("Invalid thread ID"),
  image: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, "Image must be less than 10MB")
    .refine((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type), "Image must be JPEG, PNG, or WebP"),
  caption: z.string().max(500).optional(),
});

// Create message thread
export const createMessageThreadSchema = z.object({
  participantIds: z.array(z.string().uuid("Invalid participant ID"))
    .min(2, "Thread must have at least 2 participants")
    .max(100, "Thread cannot have more than 100 participants"),
  listingId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
});

// Flag message
export const flagMessageSchema = z.object({
  reason: z.enum([
    "external_contact",
    "suspicious",
    "inappropriate",
    "spam",
    "harassment",
    "other"
  ]),
  description: z.string().optional(),
});

// Report thread
export const reportThreadSchema = z.object({
  reason: z.enum([
    "harassment",
    "scam",
    "inappropriate_conduct",
    "spam",
    "other"
  ]),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(1000),
  evidence: z.array(z.string()).optional(), // Message IDs to include as evidence
});

// Mute thread
export const muteThreadSchema = z.object({
  duration: z.enum(["1hour", "8hours", "24hours", "1week", "1month", "permanent"]),
});

// Unmute thread
export const unmuteThreadSchema = z.object({});

// Delete thread (soft delete)
export const deleteThreadSchema = z.object({
  reason: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SendImageMessageInput = z.infer<typeof sendImageMessageSchema>;
export type CreateMessageThreadInput = z.infer<typeof createMessageThreadSchema>;
export type FlagMessageInput = z.infer<typeof flagMessageSchema>;
export type ReportThreadInput = z.infer<typeof reportThreadSchema>;
export type MuteThreadInput = z.infer<typeof muteThreadSchema>;
export type UnmuteThreadInput = z.infer<typeof unmuteThreadSchema>;
export type DeleteThreadInput = z.infer<typeof deleteThreadSchema>;
