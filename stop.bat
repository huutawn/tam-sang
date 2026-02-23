@echo off
echo Stopping Tamsang Services...
docker-compose -f docker-compose.yml -f docker-compose.service.yml down
echo Services stopped!
pause
