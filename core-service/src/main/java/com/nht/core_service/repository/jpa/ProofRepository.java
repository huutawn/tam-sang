package com.nht.core_service.repository.jpa;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.nht.core_service.entity.Proof;

@Repository
public interface ProofRepository extends JpaRepository<Proof, UUID> {

	List<Proof> findByCampaignIdOrderBySubmittedAtDesc(String campaignId);
}
