package com.nht.core_service.repository.jpa;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.nht.core_service.entity.TransactionError;
import com.nht.core_service.enums.ErrorStatus;

@Repository
public interface TransactionErrorRepository extends JpaRepository<TransactionError, UUID> {

	List<TransactionError> findByStatus(ErrorStatus status);
}
