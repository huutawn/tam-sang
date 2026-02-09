#!/bin/bash

# tam-sang Smart Stop Script (Supports Dynamic Ports)

PID_FILE=".pids"
# Danh sách các từ khóa để tìm kiếm tiến trình (tên thư mục service)
SERVICES=("discovery-server" "config-server" "api-gateway" "identity-service" "core-service" "blockchain-service" "ai-service" "file-service")

# Colors
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}Stopping all tam-sang microservices...${NC}"

# 1. Thử dừng theo file PID (nếu chạy từ start-all.sh)
if [ -f "$PID_FILE" ]; then
    echo "Dừng các tiến trình từ file PID..."
    while read pid; do
        taskkill //F //PID "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null
    done < "$PID_FILE"
    rm "$PID_FILE"
fi

# 2. Quét và dừng theo từ khóa (Dùng cho cả khi port=0 hoặc chạy make lẻ)
echo "Đang quét và dọn dẹp các tiến trình còn sót lại bằng PowerShell..."
for service in "${SERVICES[@]}"; do
    # Tìm và giết các tiến trình Java/Go/Python có chứa tên service trong Command Line
    powershell.exe "Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*$service*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force }" 2>/dev/null
    echo -e "Đã dọn dẹp: ${service}"
done

echo -e "${RED}Hệ thống đã dừng hoàn toàn.${NC}"
