export type Role = 'ADMIN' | 'GUEST' | 'HOST';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  role: Role;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
  avatar?: string | null;
  avatarPublicId?: string | null;
  createdAt: Date;
}
