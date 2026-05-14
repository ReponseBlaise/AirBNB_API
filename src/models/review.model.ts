export interface Review {
  id: string;
  rating: number;
  comment: string;
  userId: string;
  listingId: string;
  createdAt: Date;
}
