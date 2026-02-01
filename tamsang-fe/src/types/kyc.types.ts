// KYC Types
export type KYCStatus = "PENDING" | "PROCESSING" | "VERIFIED" | "REJECTED";

export interface KYCRequest {
  frontImageUrl: string;
  backImageUrl: string;
  selfieImageUrl?: string;
}

export interface KYCResult {
  id: string;
  userId: string;
  status: KYCStatus;
  fullName?: string;
  idNumber?: string;
  dateOfBirth?: string;
  address?: string;
  province?: string;
  nationality?: string;
  gender?: string;
  issueDate?: string;
  expiryDate?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KYCVerificationStep {
  step: "FRONT_ID" | "BACK_ID" | "SELFIE" | "PROCESSING" | "COMPLETED";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  message?: string;
}
