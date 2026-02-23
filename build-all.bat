@echo off
echo ====================================================
echo BUILDING ALL SERVICES LOCALLY (PLAN B)
echo ====================================================

echo [1/7] Building discovery-server...
cd discovery-server
call mvnw clean package -DskipTests
cd ..

echo [2/7] Building config-server...
cd config-server
call mvnw clean package -DskipTests
cd ..

echo [3/7] Building api-gateway...
cd api-gateway
call mvnw clean package -DskipTests
cd ..

echo [4/7] Building core-service...
cd core-service
call mvnw clean package -DskipTests
cd ..

echo [5/7] Building identity-service...
cd identity-service
call mvnw clean package -DskipTests
cd ..

echo [6/7] Building file-service...
cd file-service
set CGO_ENABLED=0
set GOOS=linux
go build -o file-service .
cd ..

echo [7/7] Building blockchain-service...
cd blockchain-service
set CGO_ENABLED=0
set GOOS=linux
go build -o blockchain-service ./cmd/server
cd ..

echo ====================================================
echo ALL SERVICES BUILT! STARTING DOCKER...
echo ====================================================

docker-compose -f docker-compose.yml -f docker-compose.service.yml up -d --build

echo ====================================================
echo DEPLOYMENT COMPLETE!
echo Check Eureka at http://localhost:8761
echo ====================================================
pause
