// Campaign Types
export type CampaignStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export type CampaignCategory =
  | "EDUCATION"
  | "HEALTHCARE"
  | "DISASTER_RELIEF"
  | "ENVIRONMENT"
  | "COMMUNITY"
  | "CHILDREN"
  | "ELDERLY"
  | "OTHER";

export interface Campaign {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  imageUrl: string;
  images?: string[];
  category: CampaignCategory;
  targetAmount: number;
  currentAmount: number;
  donorCount: number;
  organizerId: string;
  organizerName?: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  isUrgent?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStats {
  totalDonations: number;
  totalCampaigns: number;
  totalDonors: number;
  totalWithdrawals: number;
}

export interface DonationStats {
  totalAmount: number;
  donorCount: number;
  averageDonation: number;
  lastDonationAt?: string;
}

export interface CampaignActivity {
  id: string;
  type: "DONATION" | "WITHDRAWAL" | "UPDATE" | "MILESTONE";
  message: string;
  amount?: number;
  donorName?: string;
  createdAt: string;
}

export interface CreateCampaignRequest {
  title: string;
  description: string;
  shortDescription?: string;
  category: CampaignCategory;
  targetAmount: number;
  startDate: string;
  endDate: string;
  imageUrl: string;
  images?: string[];
  tags?: string[];
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  status?: CampaignStatus;
}

export interface CampaignFilterParams {
  status?: CampaignStatus;
  category?: CampaignCategory;
  organizerId?: string;
  isFeatured?: boolean;
  isUrgent?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "currentAmount" | "endDate";
  sortOrder?: "asc" | "desc";
}
