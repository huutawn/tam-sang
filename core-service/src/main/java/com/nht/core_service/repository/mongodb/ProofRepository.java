package com.nht.core_service.repository.mongodb;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.nht.core_service.document.Proof;
import com.nht.core_service.enums.AiStatus;

@Repository
public interface ProofRepository extends MongoRepository<Proof, String> {
	
	List<Proof> findByWithdrawalRequestId(String withdrawalRequestId);
	
	Optional<Proof> findByIdAndAiStatus(String id, AiStatus aiStatus);
	
	Page<Proof> findByAiStatus(AiStatus aiStatus, Pageable pageable);
}
