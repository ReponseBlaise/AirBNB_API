export interface Listing {
  id: number;
  title: string;
  price: number;
  location: string;
}

export const listings: Listing[] = [
  { id: 1, title: 'Apartment', price: 50, location: 'Kigali' },
  { id: 2, title: 'House', price: 100, location: 'Musanze' }
];
