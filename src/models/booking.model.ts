import { BookingStatus } from '@prisma/client';

export interface Booking {
  id: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: number;
  status: BookingStatus;
  listingId: string;
  guestId: string;
  createdAt: Date;
}
