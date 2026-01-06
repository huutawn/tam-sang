package com.nht.core_service.repository.mongodb;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.nht.core_service.document.WithdrawalRequest;
import com.nht.core_service.enums.WithdrawalStatus;

@Repository
public interface WithdrawalRequestRepository extends MongoRepository<WithdrawalRequest, String> {

	List<WithdrawalRequest> findByCampaignIdAndStatus(String campaignId, WithdrawalStatus status);

	List<WithdrawalRequest> findByCampaignIdOrderByCreatedAtDesc(String campaignId);

	Page<WithdrawalRequest> findByStatus(WithdrawalStatus status, Pageable pageable);

	Page<WithdrawalRequest> findAll(Pageable pageable);
}
