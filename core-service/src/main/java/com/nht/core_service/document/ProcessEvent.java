package com.nht.core_service.document;

import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "process_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessEvent {
    @Id
            @Indexed
    String eventId;
    LocalDateTime processedAt;
}
