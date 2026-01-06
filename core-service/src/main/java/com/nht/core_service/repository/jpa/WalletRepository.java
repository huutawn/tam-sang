package com.nht.core_service.repository.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.nht.core_service.entity.Wallet;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, UUID> {

	Optional<Wallet> findByCampaignId(String campaignId);

	boolean existsByCampaignId(String campaignId);
}
