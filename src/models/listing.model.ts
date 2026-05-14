import { ListingType } from '@prisma/client';

export interface Listing {
  id: string;
  title: string;
  description: string;
  pricePerNight: number;
  guest: number;
  location: string;
  type: ListingType;
  amenities: string[];
  hostId: string;
  createdAt: Date;
  updatedAt: Date;
}

