package com.nht.core_service.repository.mongodb;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.nht.core_service.document.Interaction;

@Repository
public interface InteractionRepository extends MongoRepository<Interaction, String> {

	boolean existsByCampaignIdAndUserIdAndType(String campaignId, String userId, String type);

	void deleteByCampaignIdAndUserIdAndType(String campaignId, String userId, String type);
}
