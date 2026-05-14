import { z } from "zod";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

// Add payment method
export const addPaymentMethodSchema = z.object({
  methodType: z.nativeEnum(PaymentMethod),
  
  // For card payments (Stripe will tokenize)
  stripeToken: z.string().optional(),
  
  // For bank transfers
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  
  // For PayPal
  paypalEmail: z.string().email().optional(),
  
  isDefault: z.boolean().optional().default(false),
});

// Update payment method
export const updatePaymentMethodSchema = z.object({
  methodType: z.nativeEnum(PaymentMethod).optional(),
  isDefault: z.boolean().optional(),
});

// Process payment
export const processPaymentSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  paymentMethodId: z.string().uuid("Invalid payment method ID").optional(),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("USD"),
});

// Process refund
export const processRefundSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
  refundAmount: z.number().positive("Refund amount must be positive").optional(),
  reason: z.string().min(10, "Please provide a refund reason"),
});

// Authorize payment (3D Secure, etc.)
export const authorizePaymentSchema = z.object({
  paymentIntentId: z.string().min(1, "Payment intent ID is required"),
  threeDSecureToken: z.string().optional(),
});

// Capture authorized payment
export const capturePaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
});

// Dispute a payment
export const disputePaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
  reason: z.string().min(10, "Please provide a reason for the dispute"),
  evidence: z.array(z.instanceof(File)).optional(),
});

export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
export type ProcessRefundInput = z.infer<typeof processRefundSchema>;
export type AuthorizePaymentInput = z.infer<typeof authorizePaymentSchema>;
export type CapturePaymentInput = z.infer<typeof capturePaymentSchema>;
export type DisputePaymentInput = z.infer<typeof disputePaymentSchema>;
