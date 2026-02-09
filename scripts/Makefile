# tam-sang Microservices Management Makefile

# Project Directories
ROOT_DIR := ..
DISCOVERY_DIR := $(ROOT_DIR)/discovery-server
CONFIG_DIR := $(ROOT_DIR)/config-server
GATEWAY_DIR := $(ROOT_DIR)/api-gateway
IDENTITY_DIR := $(ROOT_DIR)/identity-service
CORE_DIR := $(ROOT_DIR)/core-service
BLOCKCHAIN_DIR := $(ROOT_DIR)/blockchain-service
AI_DIR := $(ROOT_DIR)/ai-service
FILE_DIR := $(ROOT_DIR)/file-service

# Java Command (Maven Wrapper)
MVN := ./mvnw

# Colors
GREEN  := \033[0;32m
YELLOW := \033[0;33m
NC     := \033[0m # No Color

.PHONY: all help discovery config gateway identity core blockchain ai file start-all stop-all

help:
	@echo "$(GREEN)Available commands:$(NC)"
	@echo "  make discovery     - Start Discovery Server (Eureka)"
	@echo "  make config        - Start Config Server"
	@echo "  make gateway       - Start API Gateway"
	@echo "  make identity      - Start Identity Service"
	@echo "  make core          - Start Core Service"
	@echo "  make blockchain    - Start Blockchain Service (Go)"
	@echo "  make ai            - Start AI Service (Python)"
	@echo "  make file          - Start File Service (Go)"
	@echo "  make start-all     - Start services in sequence (discovery -> config -> others)"
	@echo "  make stop-all      - Stop all services based on their ports"

discovery:
	@echo "$(YELLOW)Starting Discovery Server...$(NC)"
	cd $(DISCOVERY_DIR) && $(MVN) spring-boot:run

config:
	@echo "$(YELLOW)Starting Config Server...$(NC)"
	cd $(CONFIG_DIR) && $(MVN) spring-boot:run

gateway:
	@echo "$(YELLOW)Starting API Gateway...$(NC)"
	cd $(GATEWAY_DIR) && $(MVN) spring-boot:run

identity:
	@echo "$(YELLOW)Starting Identity Service...$(NC)"
	cd $(IDENTITY_DIR) && $(MVN) spring-boot:run

core:
	@echo "$(YELLOW)Starting Core Service...$(NC)"
	cd $(CORE_DIR) && $(MVN) spring-boot:run

blockchain:
	@echo "$(YELLOW)Starting Blockchain Service...$(NC)"
	cd $(BLOCKCHAIN_DIR) && go run cmd/server/main.go

ai:
	@echo "$(YELLOW)Starting AI Service...$(NC)"
	cd $(AI_DIR) && pdm run python -m app.main

file:
	@echo "$(YELLOW)Starting File Service...$(NC)"
	cd $(FILE_DIR) && go run main.go

stop-all:
	@echo "$(RED)Stopping all services...$(NC)"
	./stop-all.sh

start-all:
	@echo "$(GREEN)Starting system in sequence...$(NC)"
	@echo "$(YELLOW)Step 1: Discovery Server$(NC)"
	# Run discovery in background
	cd $(DISCOVERY_DIR) && $(MVN) spring-boot:run & sleep 20
	@echo "$(YELLOW)Step 2: Config Server$(NC)"
	cd $(CONFIG_DIR) && $(MVN) spring-boot:run & sleep 20
	@echo "$(YELLOW)Step 3: Other Services$(NC)"
	cd $(IDENTITY_DIR) && $(MVN) spring-boot:run &
	cd $(CORE_DIR) && $(MVN) spring-boot:run &
	cd $(BLOCKCHAIN_DIR) && go run cmd/server/main.go &
	cd $(AI_DIR) && pdm run python -m app.main &
	cd $(FILE_DIR) && go run main.go &
	cd $(GATEWAY_DIR) && $(MVN) spring-boot:run &
	@echo "$(GREEN)All services are starting. Please monitor logs. $(NC)"
