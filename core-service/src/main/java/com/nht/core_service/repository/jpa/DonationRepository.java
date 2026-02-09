package com.nht.core_service.repository.jpa;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.nht.core_service.entity.Donation;

@Repository
public interface DonationRepository extends JpaRepository<Donation, UUID> {


	Optional<Donation> findByPaymentCode(String paymentCode);

	Long countByCampaignId(String campaignId);
}
