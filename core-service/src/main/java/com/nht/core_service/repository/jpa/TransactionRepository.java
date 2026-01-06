package com.nht.core_service.repository.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.nht.core_service.entity.Transaction;

import javax.swing.text.html.Option;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    Optional<Transaction> findTopByOrderByCreatedAtDesc();
}
