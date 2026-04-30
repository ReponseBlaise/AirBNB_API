import { z } from "zod";

export const createBookingSchema = z
  .object({
    listingId: z.string().uuid("listingId must be a valid UUID"),
    checkIn: z.string().datetime("Invalid checkIn datetime format"),
    checkOut: z.string().datetime("Invalid checkOut datetime format"),
  })
  .refine((data) => new Date(data.checkIn) < new Date(data.checkOut), {
    message: "checkIn must be before checkOut",
    path: ["checkIn"],
  })
  .refine((data) => new Date(data.checkIn) > new Date(), {
    message: "checkIn must be in the future",
    path: ["checkIn"],
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
