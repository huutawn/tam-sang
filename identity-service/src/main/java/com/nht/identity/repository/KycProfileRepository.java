package com.nht.identity.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.nht.identity.entity.KycProfile;
import com.nht.identity.entity.KycStatus;

@Repository
public interface KycProfileRepository extends JpaRepository<KycProfile, String> {
    Optional<KycProfile> findByUserId(String userId);

    Optional<KycProfile> findByIdNumber(String idNumber);

    Optional<KycProfile> findByIdNumberAndUserIdNot(String idNumber, String userId);

    boolean existsByIdNumber(String idNumber);

    boolean existsByUserIdAndStatus(String userId, KycStatus status);
}
