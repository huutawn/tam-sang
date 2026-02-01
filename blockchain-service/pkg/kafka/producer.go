package kafka

import (
	"context"
	"encoding/json"
	"time"

	"blockchain-service/config"
	"blockchain-service/pkg/logger"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

// Producer represents a Kafka producer
type Producer struct {
	writer *kafka.Writer
	topic  string
}

// NewProducer creates a new Kafka producer
func NewProducer(cfg *config.KafkaConfig, topic string) *Producer {
	writer := &kafka.Writer{
		Addr:         kafka.TCP(cfg.Brokers...),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		BatchSize:    100,
		BatchTimeout: 10 * time.Millisecond,
		RequiredAcks: kafka.RequireOne,
		Async:        false,
	}

	logger.Info("Kafka producer initialized",
		zap.String("topic", topic),
		zap.Strings("brokers", cfg.Brokers),
	)

	return &Producer{
		writer: writer,
		topic:  topic,
	}
}

// Publish publishes a message to Kafka
func (p *Producer) Publish(ctx context.Context, key string, value interface{}) error {
	// Serialize value to JSON
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	msg := kafka.Message{
		Key:   []byte(key),
		Value: data,
		Time:  time.Now(),
	}

	err = p.writer.WriteMessages(ctx, msg)
	if err != nil {
		logger.Error("Failed to publish message to Kafka",
			zap.String("topic", p.topic),
			zap.String("key", key),
			zap.Error(err),
		)
		return err
	}

	logger.Debug("Message published to Kafka",
		zap.String("topic", p.topic),
		zap.String("key", key),
	)

	return nil
}

// PublishWithRetry publishes a message with retry logic
func (p *Producer) PublishWithRetry(ctx context.Context, key string, value interface{}, maxRetries int) error {
	var lastErr error
	for i := 0; i < maxRetries; i++ {
		if err := p.Publish(ctx, key, value); err != nil {
			lastErr = err
			// Exponential backoff
			backoff := time.Duration(1<<uint(i)) * 100 * time.Millisecond
			logger.Warn("Retrying Kafka publish",
				zap.Int("attempt", i+1),
				zap.Duration("backoff", backoff),
				zap.Error(err),
			)
			time.Sleep(backoff)
			continue
		}
		return nil
	}
	return lastErr
}

// Close closes the producer
func (p *Producer) Close() error {
	logger.Info("Closing Kafka producer", zap.String("topic", p.topic))
	return p.writer.Close()
}
