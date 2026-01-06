CREATE TABLE kyc_profile (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    front_image_url VARCHAR(500),
    back_image_url VARCHAR(500),
    full_name VARCHAR(255),
    dob VARCHAR(50),
    id_number VARCHAR(50),
    id_type VARCHAR(50) DEFAULT 'CITIZEN_ID',
    address VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    rejection_reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_id_number UNIQUE (id_number)
);

CREATE INDEX idx_kyc_user_id ON kyc_profile(user_id);
CREATE INDEX idx_kyc_id_number ON kyc_profile(id_number);
CREATE INDEX idx_kyc_status ON kyc_profile(status);

COMMENT ON TABLE kyc_profile IS 'KYC verification profiles for users';
COMMENT ON COLUMN kyc_profile.status IS 'PENDING, APPROVED, REJECTED, WAITING_ADMIN';
COMMENT ON COLUMN kyc_profile.id_number IS 'Citizen ID or Passport number - must be unique';
