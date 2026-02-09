# Hướng dẫn thực thi nhanh tam-sang

Thư mục này chứa các kịch bản giúp khởi động và dừng các microservice trong dự án một cách nhanh chóng.

## Các lệnh chính (Sử dụng Makefile)

Bạn có thể chạy các lệnh sau từ thư mục `scripts/`:

| Lệnh | Chức năng |
|------|-----------|
| `make start-all` | Khởi động toàn bộ các service theo đúng thứ tự |
| `make stop-all` | Dừng toàn bộ các service đang chạy (dựa trên port) |
| `make discovery` | Khởi động Eureka Server |
| `make config` | Khởi động Config Server |
| `make gateway` | Khởi động API Gateway |
| `make identity` | Khởi động Identity Service |
| `make core` | Khởi động Core Service |
| `make blockchain` | Khởi động Blockchain Service (Go) |
| `make file` | Khởi động File Service (Go) |
| `make ai` | Khởi động AI Service (Python) |

## Sử dụng Bash Script

Nếu bạn muốn chạy trực tiếp bằng bash:

- **Khởi động tất cả:** `./start-all.sh`
- **Dừng tất cả:** `./stop-all.sh`
- **Khởi động service riêng lẻ:** `./start-service.sh <tên-service>`
  - Ví dụ: `./start-service.sh core`

## Lưu ý

1. **Thứ tự quan trọng:** Luôn đảm bảo `discovery` đã chạy xong trước khi khởi động các service khác. `config` cũng nên được khởi động sớm.
2. **Dừng các service:** Script `stop-all.sh` sẽ tìm kiếm các process đang chiếm dụng các port của microservices (8761, 8888, 8080-8085) và thực hiện `taskkill` (trên Windows) hoặc `kill -9`.
3. **Yêu cầu:** 
   - Windows: Sử dụng Git Bash hoặc WSL để chạy lệnh `.sh` và `make`.
   - Java: Yêu cầu cài đặt JDK phù hợp.
   - Go: Cài đặt Go.
   - Python: Cài đặt PDM cho AI service.
