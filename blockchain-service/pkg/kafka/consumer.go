package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"blockchain-service/config"
	"blockchain-service/pkg/logger"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

// MessageHandler is a function that handles Kafka messages
type MessageHandler func(ctx context.Context, key string, value []byte) error

// Consumer represents a Kafka consumer
type Consumer struct {
	reader   *kafka.Reader
	topic    string
	handlers map[string]MessageHandler
	stopChan chan struct{}
}

// NewConsumer creates a new Kafka consumer
func NewConsumer(cfg *config.KafkaConfig, topic string) *Consumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        cfg.Brokers,
		Topic:          topic,
		GroupID:        cfg.ConsumerGroup,
		MinBytes:       10e3, // 10KB
		MaxBytes:       10e6, // 10MB
		MaxWait:        1 * time.Second,
		StartOffset:    kafka.FirstOffset,
		CommitInterval: 1 * time.Second,
	})

	logger.Info("Kafka consumer initialized",
		zap.String("topic", topic),
		zap.String("group", cfg.ConsumerGroup),
		zap.Strings("brokers", cfg.Brokers),
	)

	return &Consumer{
		reader:   reader,
		topic:    topic,
		handlers: make(map[string]MessageHandler),
		stopChan: make(chan struct{}),
	}
}

// RegisterHandler registers a handler for a specific event type
func (c *Consumer) RegisterHandler(eventType string, handler MessageHandler) {
	c.handlers[eventType] = handler
	logger.Info("Registered Kafka handler", zap.String("event_type", eventType))
}

// Start starts consuming messages
func (c *Consumer) Start(ctx context.Context) {
	logger.Info("Starting Kafka consumer", zap.String("topic", c.topic))

	go func() {
		for {
			select {
			case <-c.stopChan:
				logger.Info("Kafka consumer stopped", zap.String("topic", c.topic))
				return
			case <-ctx.Done():
				logger.Info("Kafka consumer context cancelled", zap.String("topic", c.topic))
				return
			default:
				msg, err := c.reader.FetchMessage(ctx)
				if err != nil {
					if ctx.Err() != nil {
						return
					}
					logger.Error("Failed to fetch Kafka message",
						zap.String("topic", c.topic),
						zap.Error(err),
					)
					continue
				}

				// Process message
				c.processMessage(ctx, msg)

				// Commit message
				if err := c.reader.CommitMessages(ctx, msg); err != nil {
					logger.Error("Failed to commit Kafka message",
						zap.String("topic", c.topic),
						zap.Error(err),
					)
				}
			}
		}
	}()
}

// processMessage processes a single Kafka message
func (c *Consumer) processMessage(ctx context.Context, msg kafka.Message) {
	key := string(msg.Key)

	logger.Debug("Processing Kafka message",
		zap.String("topic", c.topic),
		zap.String("key", key),
		zap.Int("partition", msg.Partition),
		zap.Int64("offset", msg.Offset),
	)

	// Parse message to get event type
	var envelope struct {
		EventType string          `json:"event_type"`
		Payload   json.RawMessage `json:"payload"`
	}

	eventType := ""
	payload := msg.Value

	if err := json.Unmarshal(msg.Value, &envelope); err == nil && envelope.EventType != "" {
		// Successfully parsed envelope format
		eventType = envelope.EventType
		payload = envelope.Payload
	} else {
		// No envelope — likely a Spring Kafka producer sending raw DTO
		// Use key as event type hint, raw value as payload
		eventType = key
	}

	// Find handler for event type
	handler, ok := c.handlers[eventType]
	if !ok {
		// Try default handler
		handler, ok = c.handlers["*"]
		if !ok {
			logger.Warn("No handler for event type",
				zap.String("event_type", eventType),
			)
			return
		}
	}

	// Execute handler
	if err := handler(ctx, eventType, payload); err != nil {
		logger.Error("Failed to handle Kafka message",
			zap.String("event_type", eventType),
			zap.Error(err),
		)
	}
}

// Stop stops the consumer
func (c *Consumer) Stop() error {
	close(c.stopChan)
	logger.Info("Closing Kafka consumer", zap.String("topic", c.topic))
	return c.reader.Close()
}

// HealthCheck checks Kafka connectivity
func (c *Consumer) HealthCheck() error {
	stats := c.reader.Stats()
	if stats.Errors > 0 {
		return fmt.Errorf("kafka consumer has %d errors (topic: %s)", stats.Errors, c.topic)
	}
	return nil
}
