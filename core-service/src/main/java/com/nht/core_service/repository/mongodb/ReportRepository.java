package com.nht.core_service.repository.mongodb;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.nht.core_service.document.Report;

@Repository
public interface ReportRepository extends MongoRepository<Report, String> {}
