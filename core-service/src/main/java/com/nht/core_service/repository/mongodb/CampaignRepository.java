package com.nht.core_service.repository.mongodb;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.nht.core_service.document.Campaign;

@Repository
public interface CampaignRepository extends MongoRepository<Campaign, String> {}
