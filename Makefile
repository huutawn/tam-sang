.PHONY: up down down-cl restart logs build-all status

# Khởi chạy hệ thống (Dùng images có sẵn, không build lại)
up:
	docker-compose -f docker-compose.yml -f docker-compose.service.yml up -d

# Tắt hệ thống
down:
	docker-compose -f docker-compose.yml -f docker-compose.service.yml down

# Tắt hệ thống và xóa volumes (reset data)
down-cl:
	docker-compose -f docker-compose.yml -f docker-compose.service.yml down -v

# Khởi động lại hệ thống
restart: down up

# Xem logs của toàn bộ hệ thống
logs:
	docker-compose -f docker-compose.yml -f docker-compose.service.yml logs -f

# Build lại toàn bộ code (Plan B Host Build)
build-all:
	build-all.bat

# Xem trạng thái các container
status:
	docker-compose -f docker-compose.yml -f docker-compose.service.yml ps
