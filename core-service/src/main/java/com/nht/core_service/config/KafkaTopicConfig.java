package com.nht.core_service.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

	public static final String DONATION_EVENTS_TOPIC = "donation-events";
	public static final String WITHDRAWAL_EVENTS_TOPIC = "withdrawal-events";

	@Bean
	public NewTopic donationEventsTopic() {
		return TopicBuilder.name(DONATION_EVENTS_TOPIC).partitions(3).replicas(1).build();
	}

	@Bean
	public NewTopic withdrawalEventsTopic() {
		return TopicBuilder.name(WITHDRAWAL_EVENTS_TOPIC).partitions(3).replicas(1).build();
	}
}
