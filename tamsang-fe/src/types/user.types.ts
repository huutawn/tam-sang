// User Types
export type UserRole = "ADMIN" | "ORGANIZER" | "DONOR";

export interface User {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isKYCVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  totalDonations?: number;
  campaignsJoined?: number;
}

export interface PublicUserProfile {
  id: string;
  fullName?: string;
  avatar?: string;
  role: UserRole;
  isKYCVerified: boolean;
}
