-- Initialize databases for Tam Sang ecosystem
-- This script creates two databases: identity and transaction

-- Create identity database for identity-service
CREATE DATABASE identity;

-- Create transaction database for core-service  
CREATE DATABASE transaction;

-- Connect to transaction database to create tables
\c transaction

-- Create Wallet table
CREATE TABLE IF NOT EXISTS wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id VARCHAR(255) NOT NULL UNIQUE,
    balance NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_campaign_id ON wallet(campaign_id);
CREATE INDEX idx_wallet_status ON wallet(status);

-- Create Transaction table
CREATE TABLE IF NOT EXISTS transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    CONSTRAINT fk_wallet FOREIGN KEY (wallet_id) REFERENCES wallet(id) ON DELETE CASCADE
);

CREATE INDEX idx_transaction_wallet_id ON transaction(wallet_id);
CREATE INDEX idx_transaction_type ON transaction(type);
CREATE INDEX idx_transaction_status ON transaction(status);
CREATE INDEX idx_transaction_timestamp ON transaction(timestamp);

-- Create Donation table
CREATE TABLE IF NOT EXISTS donation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id VARCHAR(255) NOT NULL,
    transaction_id UUID,
    donor_full_name VARCHAR(255) NOT NULL,
    donor_email VARCHAR(255),
    donor_phone VARCHAR(50),
    amount NUMERIC(19, 2) NOT NULL,
    content TEXT,
    bank_name VARCHAR(100),
    bank_number VARCHAR(100),
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payos_transaction_id VARCHAR(255),
    payment_code VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_donation_transaction FOREIGN KEY (transaction_id) REFERENCES transaction(id) ON DELETE SET NULL
);

CREATE INDEX idx_donation_campaign_id ON donation(campaign_id);
CREATE INDEX idx_donation_payment_status ON donation(payment_status);
CREATE INDEX idx_donation_payos_transaction_id ON donation(payos_transaction_id);
CREATE INDEX idx_donation_payment_code ON donation(payment_code);
CREATE INDEX idx_donation_created_at ON donation(created_at);

-- Create TransactionError table for unidentified transactions
CREATE TABLE IF NOT EXISTS transaction_error (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(19, 2) NOT NULL,
    sender_bank_name VARCHAR(100),
    sender_bank_number VARCHAR(100),
    sender_name VARCHAR(255),
    transaction_code VARCHAR(255),
    content TEXT,
    error_reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    resolved_campaign_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_error_status ON transaction_error(status);
CREATE INDEX idx_transaction_error_transaction_code ON transaction_error(transaction_code);

-- Create Proof table for withdrawal proof documents
CREATE TABLE IF NOT EXISTS proof (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id VARCHAR(255) NOT NULL,
    proof_images TEXT[] NOT NULL,
    ai_analysis_result TEXT,
    ai_analysis_status VARCHAR(20) DEFAULT 'PENDING',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewer_notes TEXT
);

CREATE INDEX idx_proof_campaign_id ON proof(campaign_id);
CREATE INDEX idx_proof_status ON proof(status);
CREATE INDEX idx_proof_ai_analysis_status ON proof(ai_analysis_status);

-- Add comments for documentation
COMMENT ON TABLE wallet IS 'Stores wallet information for each campaign';
COMMENT ON TABLE transaction IS 'Records all financial transactions (deposits and withdrawals)';
COMMENT ON TABLE donation IS 'Stores detailed donation information including donor details';
COMMENT ON TABLE transaction_error IS 'Logs unidentified transactions that need manual resolution';
COMMENT ON TABLE proof IS 'Stores proof documents for withdrawal requests';

-- Success message
SELECT 'Transaction database initialized successfully!' AS status;
