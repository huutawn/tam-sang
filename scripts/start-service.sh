#!/bin/bash

# tam-sang Individual Service Starter

SERVICE=$1

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$SERVICE" ]; then
    echo -e "${RED}Error: Please provide a service name.${NC}"
    echo "Usage: ./start-service.sh <service-name>"
    echo "Services: discovery, config, gateway, identity, core, blockchain, ai, file"
    exit 1
fi

case $SERVICE in
    discovery)
        echo -e "${YELLOW}Starting Discovery Server...${NC}"
        cd ../discovery-server && ./mvnw spring-boot:run
        ;;
    config)
        echo -e "${YELLOW}Starting Config Server...${NC}"
        cd ../config-server && ./mvnw spring-boot:run
        ;;
    gateway)
        echo -e "${YELLOW}Starting API Gateway...${NC}"
        cd ../api-gateway && ./mvnw spring-boot:run
        ;;
    identity)
        echo -e "${YELLOW}Starting Identity Service...${NC}"
        cd ../identity-service && ./mvnw spring-boot:run
        ;;
    core)
        echo -e "${YELLOW}Starting Core Service...${NC}"
        cd ../core-service && ./mvnw spring-boot:run
        ;;
    blockchain)
        echo -e "${YELLOW}Starting Blockchain Service (Go)...${NC}"
        cd ../blockchain-service && go run cmd/server/main.go
        ;;
    ai)
        echo -e "${YELLOW}Starting AI Service (Python)...${NC}"
        cd ../ai-service && pdm run python -m app.main
        ;;
    file)
        echo -e "${YELLOW}Starting File Service (Go)...${NC}"
        cd ../file-service && go run main.go
        ;;
    *)
        echo -e "${RED}Error: Unknown service '$SERVICE'.${NC}"
        echo "Valid services: discovery, config, gateway, identity, core, blockchain, ai, file"
        exit 1
        ;;
esac
