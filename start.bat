@echo off
echo Starting Tamsang Services...
docker-compose -f docker-compose.yml -f docker-compose.service.yml up -d
echo Services started!
pause
