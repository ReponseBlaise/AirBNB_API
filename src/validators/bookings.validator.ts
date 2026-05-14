import { z } from 'zod';
import { BookingStatus } from '@prisma/client';

export const createBookingSchema = z
  .object({
    listingId: z.string().uuid('listingId must be a valid UUID'),
    checkIn: z.string().datetime('Invalid checkIn datetime format'),
    checkOut: z.string().datetime('Invalid checkOut datetime format'),
  })
  .refine((data) => new Date(data.checkIn) < new Date(data.checkOut), {
    message: 'checkIn must be before checkOut',
    path: ['checkIn'],
  })
  .refine((data) => new Date(data.checkIn) > new Date(), {
    message: 'checkIn must be in the future',
    path: ['checkIn'],
  });

export const updateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(10, 'Please provide a reason for cancellation'),
});

export const respondToBookingSchema = z.object({
  approved: z.boolean(),
  message: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type RespondToBookingInput = z.infer<typeof respondToBookingSchema>;
