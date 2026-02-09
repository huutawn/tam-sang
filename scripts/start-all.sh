#!/bin/bash

# tam-sang Start All Services Script (PID tracking version)

PID_FILE=".pids"
# Xóa file PID cũ nếu có
> "$PID_FILE"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

cleanup() {
    echo -e "\n${RED}Phát hiện Ctrl+C. Đang dừng các service...${NC}"
    ./stop-all.sh
    exit
}

trap cleanup SIGINT SIGTERM

start_service() {
    local dir=$1
    local cmd=$2
    local name=$3
    
    echo -e "${YELLOW}Starting $name...${NC}"
    cd "../$dir" && $cmd & 
    echo $! >> "scripts/$PID_FILE" # Lưu PID vào file (điều hướng từ thư mục gốc của script)
    cd ../scripts
}

echo -e "${GREEN}Starting microservices sequence (Dynamic Port Support)...${NC}"

# 1. Discovery
start_service "discovery-server" "./mvnw spring-boot:run" "Discovery Server"
sleep 20

# 2. Config
start_service "config-server" "./mvnw spring-boot:run" "Config Server"
sleep 20

# 3. Domain Services
start_service "identity-service" "./mvnw spring-boot:run" "Identity Service"
start_service "blockchain-service" "go run cmd/server/main.go" "Blockchain Service"
start_service "file-service" "go run main.go" "File Service"
start_service "ai-service" "pdm run python -m app.main" "AI Service"
sleep 15

# 4. Business Logic
start_service "core-service" "./mvnw spring-boot:run" "Core Service"
sleep 5

# 5. Gateway
start_service "api-gateway" "./mvnw spring-boot:run" "API Gateway"

echo -e "${GREEN}All services triggered. PIDs saved to $PID_FILE${NC}"
echo -e "${YELLOW}NHẤN CTRL+C ĐỂ DỪNG TOÀN BỘ${NC}"

wait
