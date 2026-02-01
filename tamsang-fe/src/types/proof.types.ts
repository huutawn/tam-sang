// Proof Types
export type ProofStatus = "PENDING" | "AI_PROCESSING" | "VERIFIED" | "REJECTED";

export type ProofType =
  | "RECEIPT"
  | "INVOICE"
  | "PHOTO"
  | "VIDEO"
  | "DOCUMENT"
  | "BANK_STATEMENT"
  | "OTHER";

export interface Proof {
  id: string;
  withdrawalId: string;
  type: ProofType;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  description?: string;
  status: ProofStatus;
  aiVerificationScore?: number;
  aiVerificationDetails?: string;
  aiProcessedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadProofRequest {
  withdrawalId: string;
  type: ProofType;
  file: File;
  description?: string;
}

export interface ProofVerificationResult {
  proofId: string;
  isValid: boolean;
  score: number;
  confidence: number;
  details: string;
  extractedData?: Record<string, unknown>;
  verifiedAt: string;
}

export interface ProofSummary {
  totalProofs: number;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  averageAIScore?: number;
}
