package com.nht.core_service.repository.mongodb;

import com.nht.core_service.document.ProcessEvent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessEventRepository extends MongoRepository<ProcessEvent, String> {
}
