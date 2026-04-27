export interface User {
  id: number;
  name: string;
  email: string;
}

export const users: User[] = [
  { id: 1, name: 'Alice', email: 'blaise@klab.rw' },
  { id: 2, name: 'Bob', email: 'Kagabo@fablab.com' }
];
