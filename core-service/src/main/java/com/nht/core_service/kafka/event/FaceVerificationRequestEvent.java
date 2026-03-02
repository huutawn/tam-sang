package com.nht.core_service.kafka.event;

public record FaceVerificationRequestEvent(
	String withdrawalId,
	String userId,
	String selfieImageUrl,
	String kycImageUrl
) {}
