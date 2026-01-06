package com.nht.core_service.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import lombok.Getter;

@Getter
public enum ErrorCode {
	UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
	INVALID_KEY(1001, "Invalid request", HttpStatus.BAD_REQUEST),

	// Campaign errors (2000-2099)
	CAMPAIGN_NOT_FOUND(2001, "Campaign not found", HttpStatus.NOT_FOUND),
	CAMPAIGN_CREATION_FAILED(2002, "Failed to create campaign", HttpStatus.INTERNAL_SERVER_ERROR),
	CAMPAIGN_ALREADY_CLOSED(2003, "Campaign is already closed", HttpStatus.BAD_REQUEST),
	CAMPAIGN_WAITING_FOR_PROOF(2004, "Campaign is waiting for proof submission", HttpStatus.BAD_REQUEST),

	// Wallet errors (2100-2199)
	WALLET_NOT_FOUND(2101, "Wallet not found", HttpStatus.NOT_FOUND),
	WALLET_ALREADY_EXISTS(2102, "Wallet already exists for this campaign", HttpStatus.BAD_REQUEST),
	WALLET_LOCKED(2103, "Wallet is locked", HttpStatus.BAD_REQUEST),
	INSUFFICIENT_BALANCE(2104, "Insufficient wallet balance", HttpStatus.BAD_REQUEST),

	// Donation errors (2200-2299)
	DONATION_NOT_FOUND(2201, "Donation not found", HttpStatus.NOT_FOUND),
	DONATION_PAYMENT_FAILED(2202, "Payment processing failed", HttpStatus.BAD_REQUEST),
	INVALID_DONATION_AMOUNT(2203, "Donation amount must be greater than zero", HttpStatus.BAD_REQUEST),
	PAYMENT_FAILED(2204, "Payment failed", HttpStatus.BAD_REQUEST), // Added
	PAYMENT_NOT_FOUND(2205, "Payment not found", HttpStatus.NOT_FOUND), // Added

	// Withdrawal errors (2300-2399)
	WITHDRAWAL_NOT_FOUND(2301, "Withdrawal request not found", HttpStatus.NOT_FOUND),
	WITHDRAWAL_ALREADY_APPROVED(2302, "Withdrawal already approved", HttpStatus.BAD_REQUEST),
	WITHDRAWAL_REJECTED(2303, "Withdrawal request was rejected", HttpStatus.BAD_REQUEST),
	QUICK_WITHDRAWAL_ALREADY_USED(2304, "Quick withdrawal has already been used for this campaign", HttpStatus.BAD_REQUEST),
	WITHDRAWAL_BLOCKED_WAITING_PROOF(
			2305, "Withdrawals are blocked while waiting for proof submission", HttpStatus.BAD_REQUEST),

	// Proof errors (2400-2499)
	PROOF_NOT_FOUND(2401, "Proof not found", HttpStatus.NOT_FOUND),
	PROOF_ALREADY_SUBMITTED(2402, "Proof already submitted for this campaign", HttpStatus.BAD_REQUEST),
	AI_ANALYSIS_FAILED(2403, "AI analysis failed", HttpStatus.INTERNAL_SERVER_ERROR),

	// File service errors (2500-2599)
	FILE_UPLOAD_FAILED(2501, "File upload failed", HttpStatus.INTERNAL_SERVER_ERROR),

	// Auth errors (1000-1099)
	UNAUTHENTICATED(1006, "Unauthenticated", HttpStatus.UNAUTHORIZED),
	UNAUTHORIZED(1007, "You do not have permission", HttpStatus.FORBIDDEN),
	INVALID_STATUS(1008,"invalid status" ,HttpStatus.BAD_REQUEST );

	ErrorCode(int code, String message, HttpStatusCode statusCode) {
		this.code = code;
		this.message = message;
		this.statusCode = statusCode;
	}

	private final int code;
	private final String message;
	private final HttpStatusCode statusCode;
}
