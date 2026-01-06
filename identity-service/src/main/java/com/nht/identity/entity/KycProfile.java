package com.nht.identity.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "kyc_profile")
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
public class KycProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "user_id", nullable = false)
    String userId;

    @Column(name = "front_image_url", length = 500)
    String frontImageUrl;

    @Column(name = "back_image_url", length = 500)
    String backImageUrl;

    @Column(name = "full_name")
    String fullName;

    @Column(name = "dob", length = 50)
    String dob;

    @Column(name = "id_number", length = 50, unique = true)
    String idNumber;

    @Column(name = "id_type", length = 50)
    String idType;

    @Column(name = "address", length = 500)
    String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    KycStatus status;

    @Column(name = "rejection_reason", length = 500)
    String rejectionReason;

    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    User user;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
