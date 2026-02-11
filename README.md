# Tâm Sáng - Nền Tảng Từ Thiện Mở & Minh Bạch 💝

**Tâm Sáng** là một hệ thống platform từ thiện hiện đại, minh bạch và tin cậy, ứng dụng công nghệ **Blockchain** để công khai mọi giao dịch và **AI** để tự động xác minh bằng chứng giải ngân.

![Tam Sang Architecture](https://via.placeholder.com/1200x600?text=Microservices+Architecture:+Java+Spring+Cloud,+Go,+Python+AI)

## 🚀 Tính Năng Nổi Bật

### 1. Minh Bạch Tuyệt Đối (Blockchain) 🔗
- Mọi giao dịch quyên góp đều được ghi nhận trên **Hash-Chain** nội bộ (tương tự Blockchain).
- Mỗi chiến dịch có một **Ví (Wallet)** riêng biệt, công khai số dư, tổng thu/chi.
- Người dùng có thể tự kiểm toán (audit) toàn bộ lịch sử dòng tiền, đảm bảo tính toàn vẹn dữ liệu.
- Ký hợp đồng điện tử (Digital Signature) giữa tổ chức và hệ thống.

### 2. Xác Minh Tự Động (AI Hybird Reasoning) 🤖
- **OCR (PaddleOCR)**: Tự động trích xuất thông tin CMND/CCCD để eKYC.
- **Face Verification (DeepFace)**: Xác minh khuôn mặt chủ tài khoản với giấy tờ tùy thân.
- **Proof Check (CLIP + Gemini)**: Phân tích hóa đơn, hình ảnh giải ngân để xác định xem tiền có được dùng đúng mục đích cam kết hay không.
    - Phát hiện hóa đơn trùng lặp / giả mạo.
    - Đối chiếu các mặt hàng trong hóa đơn với mô tả chiến dịch.

### 3. Quyên Góc Dễ Dàng & Real-time ⚡
- Tích hợp cổng thanh toán **PayOS** (QR Code).
- Thông báo thời gian thực (Real-time updates) qua **WebSocket** khi có quyên góp mới.
- Dashboard theo dõi tiến độ chiến dịch trực quan.

---

## 🏗️ Kiến Trúc Hệ Thống (Microservices)

Hệ thống được xây dựng theo kiến trúc Microservices, bao gồm 5 services chính và các thành phần hạ tầng:

| Service | Vai Trò | Công Nghệ Chính |
|---------|---------|-----------------|
| **Core Service** | Quản lý nghiệp vụ chính: Chiến dịch, Quyên góp, Rút tiền, Proof | **Java 21**, Spring Boot 3.5, PostgreSQL, MongoDB, Kafka, Redis |
| **Identity Service** | Quản lý người dùng, Auth (JWT), eKYC flow | **Java 21**, Spring Boot 3.5, PostgreSQL, Keycloak |
| **Blockchain Service** | Quản lý sổ cái (Ledger), Ví, Ký số, Audit log | **Go 1.21**, Gin, GORM, PostgreSQL |
| **File Service** | Lưu trữ và xử lý file, hình ảnh an toàn | **Go 1.21**, Gin, MinIO (S3 compatible) |
| **AI Service** | OCR, Face Match, Phân tích ngữ nghĩa (Reasoning) | **Python 3.10**, FastAPI, PaddleOCR, DeepFace, Gemini API, ChromaDB |

### Hạ Tầng & DevOps
- **Service Discovery**: Netflix Eureka
- **API Gateway**: Spring Cloud Gateway (Single Entry Point)
- **Config Server**: Spring Cloud Config (Quản lý cấu hình tập trung)
- **Message Broker**: Apache Kafka (Event-driven architecture)
- **Caching**: Redis
- **Containerization**: Docker & Docker Compose

---

## 🛠️ Cài Đặt & Chạy Dự Án

### Yêu cầu tiên quyết
- Docker & Docker Compose
- JDK 21
- Python 3.10+
- Go 1.21+

### Bước 1: Khởi tạo hạ tầng
Chạy các container cơ sở dữ liệu và message broker:
```bash
docker-compose up -d postgres-tamsang mongodb redis kafka minio kafka-ui
```

### Bước 2: Cấu hình môi trường
Tạo các file `.env` từ `.env.example` trong từng thư mục service:
- `core-service/.env`
- `identity-service/.env`
- `ai-service/.env` (Cần GEMINI_API_KEY)
- `file-service/.env`

### Bước 3: Khởi chạy Microservices
Thứ tự khởi chạy khuyến nghị:
1. `discovery-server` (Port 8761)
2. `config-server` (Port 8888)
3. `api-gateway` (Port 8080)
4. `identity-service` & `file-service`
5. `core-service` & `blockchain-service`
6. `ai-service`

### Bước 4: Truy cập
- **API Gateway**: `http://localhost:8080`
- **Eureka Dashboard**: `http://localhost:8761`
- **Kafka UI**: `http://localhost:8081`
- **MinIO Console**: `http://localhost:9001`
- **Frontend**: Chạy riêng tại thư mục `tamsang-fe`

---

## 📚 Tài Liệu API

| Service | Tài Liệu (Swagger/OpenAPI) | URL Cục Bộ (Direct) |
|---------|----------------------------|---------------------|
| **Core** | `/core/v3/api-docs` | `http://localhost:8081/swagger-ui.html` |
| **Identity** | `/identity/v3/api-docs` | `http://localhost:8082/swagger-ui.html` |
| **Blockchain** | `/blockchain/docs` | `http://localhost:8083/swagger/index.html` |
| **AI** | `/ai/docs` | `http://localhost:8084/docs` |

---

## 🤝 Đóng Góp
Dự án được phát triển bởi **Hữu Tân (huutawn)** và cộng sự. Mọi đóng góp vui lòng tạo Pull Request hoặc Open Issue.

## 📄 License
MIT License.
