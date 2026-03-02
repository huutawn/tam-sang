# Tổng hợp API Endpoints Chi Tiết — Hệ thống Tam Sang

> Base URL qua API Gateway: `http://localhost:8080/{tên-service}/`

---

## 1. Identity Service (`localhost:8080/identity-service`)

### 1.1 Quản lý người dùng (`/users`)

#### `POST /users` — Đăng ký người dùng mới

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |

**Request Body — `UserCreationRequest`:**

| Trường | Kiểu dữ liệu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `email` | `String` | ✅ | min 4 ký tự |
| `password` | `String` | ✅ | min 6 ký tự |
| `firstName` | `String` | ❌ | |
| `lastName` | `String` | ❌ | |

**Response — `ApiResponse<UserResponse>`:**

| Trường | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `code` | `int` | Mã trạng thái (1000 = thành công) |
| `message` | `String` | |
| `result.id` | `String` | UUID người dùng |
| `result.email` | `String` | |
| `result.firstName` | `String` | |
| `result.lastName` | `String` | |
| `result.isBlackList` | `boolean` | |
| `result.ICHash` | `String` | Hash CCCD/CMND |
| `result.KycStatus` | `String` | Trạng thái KYC |
| `result.roles` | `Set<Role>` | Danh sách quyền |

---

#### `GET /users` — Lấy danh sách người dùng

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | Không có tham số |

**Response — `ApiResponse<List<UserResponse>>`:** Mảng các đối tượng `UserResponse` (cấu trúc như trên).

---

#### `GET /users/me/kyc` — Lấy thông tin người dùng hiện tại kèm KYC

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | Không có tham số |
| **Phân quyền** | `@PreAuthorize("isAuthenticated()")` (Lấy email từ SecurityContext) |

**Response — `ApiResponse<UserWithKycResponse>`:**

| Trường | Kiểu dữ liệu |
|---|---|
| `result.id` | `String` |
| `result.email` | `String` |
| `result.firstName` | `String` |
| `result.lastName` | `String` |
| `result.isBlackList` | `boolean` |
| `result.ICHash` | `String` |
| `result.KycStatus` | `String` |
| `result.roles` | `Set<Role>` |
| `result.kycProfile.kycId` | `String` |
| `result.kycProfile.frontImageUrl` | `String` |
| `result.kycProfile.backImageUrl` | `String` |
| `result.kycProfile.fullName` | `String` |
| `result.kycProfile.dob` | `String` |
| `result.kycProfile.idNumber` | `String` |
| `result.kycProfile.idType` | `String` |
| `result.kycProfile.address` | `String` |
| `result.kycProfile.status` | `KycStatus` (enum) |
| `result.kycProfile.rejectionReason` | `String` |

---

#### `GET /users/{userId}/kyc-status` — Kiểm tra trạng thái KYC

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | `@PathVariable` |

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `userId` | `String` | Path | ✅ |

**Response — `ApiResponse<KycStatusResponse>`:**

| Trường | Kiểu dữ liệu |
|---|---|
| `result.verified` | `boolean` |

---

#### `GET /users/exist` — Kiểm tra người dùng tồn tại

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | `@RequestParam` |

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `userEmail` | `String` | Query Param | ✅ |

**Response — `ApiResponse<UserExistResponse>`:**

| Trường | Kiểu dữ liệu |
|---|---|
| `result.userId` | `String` |
| `result.existed` | `boolean` |

---

### 1.2 Xác thực (`/auth`)

#### `GET /auth/public-key` — Lấy RSA Public Key

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | Không có tham số |

**Response — `ResponseEntity<Map<String, String>>`:**

| Trường | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `publicKey` | `String` | PEM format |
| `algorithm` | `String` | "RS256" |
| `keyType` | `String` | "RSA" |

---

#### `POST /auth/token` — Đăng nhập (lấy token)

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |

**Request Body — `AuthenticationRequest`:**

| Trường | Kiểu dữ liệu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `email` | `String` | ✅ | min 4 ký tự |
| `password` | `String` | ✅ | |

**Response — `ApiResponse<AuthenticationResponse>`:**

| Trường | Kiểu dữ liệu |
|---|---|
| `result.token` | `String` |
| `result.refreshToken` | `String` |
| `result.expiryTime` | `Date` |

---

#### `POST /auth/introspect` — Kiểm tra token

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |

**Request Body — `IntrospectRequest`:**

| Trường | Kiểu dữ liệu | Bắt buộc |
|---|---|---|
| `token` | `String` | ✅ |

**Response — `ApiResponse<IntrospectResponse>`:**

| Trường | Kiểu dữ liệu |
|---|---|
| `result.valid` | `boolean` |

---

#### `POST /auth/refresh` — Làm mới token

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |

**Request Body — `RefreshRequest`:**

| Trường | Kiểu dữ liệu | Bắt buộc |
|---|---|---|
| `token` | `String` | ✅ |
| `refreshToken` | `String` | ✅ |

**Response — `ApiResponse<AuthenticationResponse>`:** (cấu trúc giống `/auth/token`).

---

#### `POST /auth/logout` — Đăng xuất

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |

**Request Body — `LogoutRequest`:**

| Trường | Kiểu dữ liệu | Bắt buộc |
|---|---|---|
| `token` | `String` | ✅ |

**Response — `ApiResponse<Void>`:** `result` = `null`.

---

### 1.3 Định danh KYC (`/kyc`)

#### `POST /kyc/submit` — Nộp hồ sơ KYC

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `multipart/form-data` |
| **Cơ chế** | `@RequestPart` |

**Request FormData:**

| Trường | Kiểu dữ liệu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `frontImage` | `MultipartFile` | ✅ | Ảnh mặt trước CCCD |
| `backImage` | `MultipartFile` | ✅ | Ảnh mặt sau CCCD |

**Response — `ApiResponse<KycSubmitResponse>`:**

| Trường | Kiểu dữ liệu |
|---|---|
| `result.kycId` | `String` |
| `result.userId` | `String` |
| `result.status` | `KycStatus` (enum) |
| `result.createdAt` | `LocalDateTime` |

---

#### `GET /kyc/{kycId}` — Lấy hồ sơ KYC theo ID

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | `@PathVariable` |

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `kycId` | `String` | Path | ✅ |

**Response — `ApiResponse<KycProfileResponse>`:**

| Trường | Kiểu dữ liệu |
|---|---|
| `result.kycId` | `String` |
| `result.userId` | `String` |
| `result.frontImageUrl` | `String` |
| `result.backImageUrl` | `String` |
| `result.fullName` | `String` |
| `result.dob` | `String` |
| `result.idNumber` | `String` |
| `result.idType` | `String` |
| `result.address` | `String` |
| `result.status` | `KycStatus` (enum) |
| `result.rejectionReason` | `String` |
| `result.createdAt` | `LocalDateTime` |
| `result.updatedAt` | `LocalDateTime` |

---

#### `GET /kyc/valid/{userId}` — Kiểm tra KYC hợp lệ

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `userId` | `String` | Path | ✅ |

**Response — `ApiResponse<ValidKycResponse>`:**

| Trường | Kiểu dữ liệu |
|---|---|
| `result.userId` | `String` |
| `result.isValid` | `Boolean` |
| `result.message` | `String` |
| `result.status` | `String` |
| `result.isError` | `Boolean` |

---

#### `GET /kyc/user/{userId}` — Lấy hồ sơ KYC theo userId

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `userId` | `String` | Path | ✅ |

**Response — `ApiResponse<KycProfileResponse>`:** (cấu trúc giống `GET /kyc/{kycId}`).

---
---

## 2. Core Service (`localhost:8080/core-service`)

### 2.1 Quản lý Chiến dịch (`/campaigns`)

#### `POST /campaigns` — Tạo chiến dịch mới

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |
| **Phân quyền** | `@PreAuthorize("isAuthenticated()")` |

**Request Body — `CreateCampaignRequest`:**

| Trường | Kiểu dữ liệu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `title` | `String` | ✅ | Tiêu đề chiến dịch |
| `content` | `String` | ❌ | Nội dung mô tả |
| `targetAmount` | `BigDecimal` | ✅ | Số tiền mục tiêu (> 0) |
| `images` | `List<String>` | ❌ | Danh sách URL ảnh |
| `startDate` | `LocalDateTime` | ❌ | Ngày bắt đầu |
| `endDate` | `LocalDateTime` | ❌ | Ngày kết thúc |

**Response — `ResponseEntity<ApiResponse<Campaign>>`:** Trả về toàn bộ document Campaign từ MongoDB.

---

#### `GET /campaigns` — Lấy danh sách chiến dịch (phân trang)

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | `@RequestParam` |

| Tham số | Kiểu | Vị trí | Bắt buộc | Default |
|---|---|---|---|---|
| `page` | `int` | Query | ❌ | `1` |
| `size` | `int` | Query | ❌ | `10` |

**Response — `ResponseEntity<PageResponse<CampaignPageResponse>>`:**

**PageResponse wrapper:**

| Trường | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `currentPage` | `int` | Trang hiện tại |
| `totalPages` | `int` | Tổng số trang |
| `pageSize` | `int` | Kích thước trang |
| `totalElements` | `long` | Tổng số phần tử |
| `data` | `List<CampaignPageResponse>` | Danh sách chiến dịch |

**CampaignPageResponse:**

| Trường | Kiểu dữ liệu |
|---|---|
| `id` | `String` |
| `title` | `String` |
| `content` | `String` |
| `targetAmount` | `BigDecimal` |
| `usedAmount` | `BigDecimal` |
| `currentAmount` | `BigDecimal` |
| `images` | `List<String>` |
| `status` | `CampaignStatus` (enum) |
| `startDate` | `LocalDateTime` |
| `endDate` | `LocalDateTime` |
| `ownerId` | `String` |
| `hasUsedQuickWithdrawal` | `Boolean` |
| `likeCount` | `Long` |
| `viewCount` | `Long` |
| `commentCount` | `Long` |

---

#### `GET /campaigns/me` — Lấy danh sách chiến dịch của người dùng hiện tại (phân trang)

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | `@RequestParam` |
| **Phân quyền** | `@PreAuthorize("isAuthenticated()")` (Lấy userId từ JWT) |

| Tham số | Kiểu | Vị trí | Bắt buộc | Default |
|---|---|---|---|---|
| `page` | `int` | Query | ❌ | `1` |
| `size` | `int` | Query | ❌ | `10` |

**Response — `ResponseEntity<PageResponse<CampaignPageResponse>>`:** Cấu trúc giống `GET /campaigns` nhưng chỉ trả về campaigns có `ownerId` = userId hiện tại.

---

#### `GET /campaigns/{id}` — Lấy chi tiết chiến dịch

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `id` | `String` | Path | ✅ |

**Response — `ResponseEntity<ApiResponse<CampaignResponse>>`:**

| Trường | Kiểu dữ liệu |
|---|---|
| `result.id` | `String` |
| `result.title` | `String` |
| `result.content` | `String` |
| `result.targetAmount` | `BigDecimal` |
| `result.currentAmount` | `BigDecimal` |
| `result.walletBalance` | `BigDecimal` |
| `result.images` | `List<String>` |
| `result.status` | `CampaignStatus` (enum) |
| `result.startDate` | `LocalDateTime` |
| `result.endDate` | `LocalDateTime` |
| `result.ownerId` | `String` |
| `result.hasUsedQuickWithdrawal` | `Boolean` |
| `result.likeCount` | `Long` |
| `result.viewCount` | `Long` |
| `result.commentCount` | `Long` |

---

#### `POST /campaigns/{id}/close` — Đóng chiến dịch

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | `@PathVariable` |
| **Phân quyền** | `@PreAuthorize("hasRole('ADMIN')")` |

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `id` | `String` | Path | ✅ |

**Response — `ResponseEntity<ApiResponse<Void>>`:** `result` = `null`.

---

### 2.2 Quản lý Quyên góp (`/donations`)

#### `POST /donations/init` — Khởi tạo quyên góp

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |

**Request Body — `InitDonationRequest`:**

| Trường | Kiểu dữ liệu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `campaignId` | `String` | ✅ | ID chiến dịch |
| `amount` | `BigDecimal` | ✅ | Số tiền (> 0) |
| `donorName` | `String` | ✅ | Tên người quyên góp |
| `message` | `String` | ❌ | Lời nhắn |

**Response — `ResponseEntity<ApiResponse<String>>`:** `result` = URL thanh toán hoặc mã giao dịch.

---

#### `POST /donations/complete` — Hoàn tất quyên góp

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |

**Request Body — `DonationCompleteRequest`:**

| Trường | Kiểu dữ liệu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `donationId` | `String` | ❌ | ID giao dịch quyên góp |
| `campaignId` | `String` | ❌ | ID chiến dịch |
| `amount` | `BigDecimal` | ❌ | Số tiền |
| `donorName` | `String` | ❌ | |
| `message` | `String` | ❌ | |
| `transactionHash` | `String` | ❌ | Hash giao dịch blockchain |
| `blockIndex` | `Long` | ❌ | Chỉ số block |

**Response — `ResponseEntity<ApiResponse<Void>>`:** `result` = `null`.

---

#### `GET /donations/recent` — Lấy 10 quyên góp hoàn thành mới nhất

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | Không có tham số |
| **Phân quyền** | Public (không cần token) |

**Response — `ResponseEntity<ApiResponse<List<LiveDonationResponse>>>`:**

| Trường | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `result[].id` | `String` | UUID donation |
| `result[].donorFullName` | `String` | Tên người quyên góp |
| `result[].campaignTitle` | `String` | Tên chiến dịch |
| `result[].amount` | `BigDecimal` | Số tiền |
| `result[].createdAt` | `LocalDateTime` | Thời điểm tạo |

**WebSocket:** Khi có donation mới được hoàn thành, server sẽ broadcast qua STOMP tới topic `/topic/donations/live-feed` với payload `LiveDonationResponse`.

---

### 2.3 Webhook (`/webhook`)

#### `POST /webhook/payment` — Xử lý webhook thanh toán

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |

**Request Body — `PaymentWebhookRequest`:**

| Trường | Kiểu dữ liệu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `id` | `String` | ✅ | ID giao dịch |
| `gateway` | `String` | ❌ | Cổng thanh toán |
| `transactionDate` | `String` | ❌ | Ngày giao dịch |
| `accountNumber` | `String` | ❌ | Số tài khoản |
| `code` | `String` | ❌ | Mã |
| `content` | `String` | ❌ | Nội dung chuyển |
| `transferType` | `String` | ❌ | Loại chuyển khoản |
| `transferAmount` | `BigDecimal` | ❌ | Số tiền |
| `accumulated` | `String` | ❌ | Tổng tích lũy |
| `subAccount` | `String` | ❌ | Tài khoản phụ |
| `referenceCode` | `String` | ❌ | Mã tham chiếu |
| `description` | `String` | ❌ | Mô tả |

**Response — `ResponseEntity<ApiResponse<Void>>`:** `result` = `null`.

---

### 2.4 Quản lý Bằng chứng (`/proofs`)

#### `POST /proofs` — Tải lên bằng chứng

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `multipart/form-data` |
| **Cơ chế** | `@RequestParam` + `MultipartFile` |

**Request FormData / Params:**

| Trường | Kiểu dữ liệu | Vị trí | Bắt buộc |
|---|---|---|---|
| `withdrawalRequestId` | `String` | Param | ✅ |
| `file` | `MultipartFile` | FormData | ✅ |
| `description` | `String` | Param | ❌ |

**Response — `ResponseEntity<ApiResponse<ProofResponse>>`:**

| Trường | Kiểu dữ liệu |
|---|---|
| `result.id` | `String` |
| `result.withdrawalRequestId` | `String` |
| `result.imageUrl` | `String` |
| `result.description` | `String` |
| `result.aiStatus` | `AiStatus` (enum) |
| `result.aiScore` | `Integer` |
| `result.aiAnalysis` | `String` |
| `result.createdAt` | `Instant` |

---

#### `GET /proofs/{id}` — Lấy bằng chứng theo ID

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `id` | `String` | Path | ✅ |

**Response — `ResponseEntity<ApiResponse<ProofResponse>>`:** (cấu trúc giống trên).

---

#### `GET /proofs` — Lấy bằng chứng theo withdrawal

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `withdrawalId` | `String` | Query Param | ✅ |

**Response — `ResponseEntity<ApiResponse<List<ProofResponse>>>`:** Mảng `ProofResponse`.

---

#### `GET /proofs/admin` — Lấy danh sách bằng chứng cho Admin (phân trang, sort theo status)

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | `@RequestParam` |
| **Ghi chú** | Sắp xếp theo `aiStatus` ASC rồi `createdAt` DESC |

| Tham số | Kiểu | Vị trí | Bắt buộc | Default |
|---|---|---|---|---|
| `aiStatus` | `AiStatus` (enum) | Query | ❌ | `null` |
| `page` | `int` | Query | ❌ | `0` |
| `size` | `int` | Query | ❌ | `10` |

**Response — `ResponseEntity<ApiResponse<Page<ProofResponse>>>`:** Phân trang Spring Data. Nếu `aiStatus` được chỉ định (`PROCESSING`, `VERIFIED`, `REJECTED`), chỉ trả về proof có trạng thái tương ứng.

---

#### `POST /proofs/internal/hybrid-callback` — Callback kết quả AI (nội bộ)

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |
| **Ghi chú** | Chỉ gọi nội bộ từ AI-Service |

**Request Body — `HybridReasoningCallbackRequest`:**

| Trường | Kiểu dữ liệu | JSON Property | Bắt buộc | Ghi chú |
|---|---|---|---|---|
| `proofId` | `String` | `proof_id` | ✅ | |
| `trustScore` | `Integer` | `trust_score` | ✅ | 0–100 |
| `isValid` | `Boolean` | `is_valid` | ✅ | |
| `analysisSummary` | `String` | `analysis_summary` | ❌ | |
| `trustHash` | `String` | `trust_hash` | ❌ | |
| `geminiTotalAmount` | `Double` | `gemini_total_amount` | ❌ | |
| `geminiItemsCount` | `Integer` | `gemini_items_count` | ❌ | |
| `geminiPriceWarnings` | `List<String>` | `gemini_price_warnings` | ❌ | |
| `clipSceneScore` | `Double` | `clip_scene_score` | ❌ | |
| `duplicateDetected` | `Boolean` | `duplicate_detected` | ❌ | |
| `timestamp` | `Instant` | `timestamp` | ❌ | |

**Response — `ResponseEntity<ApiResponse<Void>>`:** `result` = `null`.

---

### 2.5 Quản lý Rút tiền (`/withdrawals`)

#### `POST /withdrawals` — Tạo yêu cầu rút tiền (kèm selfie xác thực)

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |

**Request Body — `CreateWithdrawalRequest`:**

| Trường | Kiểu dữ liệu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `campaignId` | `String` | ✅ | |
| `amount` | `BigDecimal` | ✅ | Số tiền (> 0) |
| `reason` | `String` | ✅ | Lý do rút tiền |
| `type` | `WithdrawalType` (enum) | ❌ | |
| `quick` | `Boolean` | ❌ | Rút nhanh? |
| `selfieImageUrl` | `String` | ✅ | URL ảnh selfie để xác thực khuôn mặt |

**Response — `ResponseEntity<ApiResponse<WithdrawalRequestResponse>>`:**

| Trường | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `result.id` | `String` | |
| `result.campaignId` | `String` | |
| `result.amount` | `BigDecimal` | |
| `result.reason` | `String` | |
| `result.bankAccount` | `String` | |
| `result.type` | `WithdrawalType` (enum) | |
| `result.quick` | `Boolean` | |
| `result.aiAnalysisResult` | `String` | |
| `result.selfieImageUrl` | `String` | URL ảnh selfie đã nộp |
| `result.faceVerificationStatus` | `FaceVerificationStatus` (enum) | `PENDING`, `VERIFIED`, `WARNING`, `FAILED` |
| `result.faceVerificationLog` | `String` | Log chi tiết từ AI (score, details) |
| `result.status` | `WithdrawalStatus` (enum) | |
| `result.createdAt` | `Instant` | |

> **Lưu ý:** Khi tạo withdrawal, hệ thống tự động gửi sự kiện Kafka `face-verification-request` để AI Service xác thực selfie vs ảnh CCCD (KYC). Kết quả sẽ cập nhật qua callback.

---

#### `GET /withdrawals/{id}` — Lấy chi tiết yêu cầu rút tiền

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `id` | `String` | Path | ✅ |

**Response — `ResponseEntity<ApiResponse<WithdrawalRequestResponse>>`:** (cấu trúc giống trên).

---

#### `GET /withdrawals` — Lấy danh sách yêu cầu rút tiền (phân trang)

| Tham số | Kiểu | Vị trí | Bắt buộc | Default |
|---|---|---|---|---|
| `status` | `WithdrawalStatus` (enum) | Query | ❌ | `null` |
| `page` | `int` | Query | ❌ | `0` |
| `size` | `int` | Query | ❌ | `10` |

**Response — `ResponseEntity<ApiResponse<Page<WithdrawalRequestResponse>>>`:** Phân trang Spring Data.

---

#### `GET /withdrawals/admin` — Lấy danh sách rút tiền cho Admin (phân trang, sort theo status)

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | `@RequestParam` |
| **Ghi chú** | Sắp xếp theo `faceVerificationStatus` ASC rồi `createdAt` DESC |

| Tham số | Kiểu | Vị trí | Bắt buộc | Default |
|---|---|---|---|---|
| `faceStatus` | `FaceVerificationStatus` (enum) | Query | ❌ | `null` |
| `page` | `int` | Query | ❌ | `0` |
| `size` | `int` | Query | ❌ | `10` |

**Response — `ResponseEntity<ApiResponse<Page<WithdrawalRequestResponse>>>`:** Phân trang Spring Data. Nếu `faceStatus` được chỉ định, chỉ trả về các withdrawal có trạng thái xác thực khuôn mặt tương ứng.

---

#### `PUT /withdrawals/{id}/approve` — Duyệt yêu cầu rút tiền

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `id` | `String` | Path | ✅ |

**Response — `ResponseEntity<ApiResponse<WithdrawalRequestResponse>>`:** (cấu trúc giống trên).

---

#### `PUT /withdrawals/{id}/reject` — Từ chối yêu cầu rút tiền

| Giao tiếp | Chi tiết |
|---|---|
| **Cơ chế** | `@PathVariable` + `@RequestBody` |

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `id` | `String` | Path | ✅ |

**Request Body — `RejectWithdrawalRequest`:**

| Trường | Kiểu dữ liệu | Bắt buộc |
|---|---|---|
| `reason` | `String` | ✅ |

**Response — `ResponseEntity<ApiResponse<WithdrawalRequestResponse>>`:** (cấu trúc giống trên).

---

#### `POST /withdrawals/internal/face-verification-callback` — Callback xác thực khuôn mặt (nội bộ)

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | `@RequestBody` |
| **Ghi chú** | Chỉ gọi nội bộ từ AI-Service |

**Request Body — `FaceVerificationCallbackRequest`:**

| Trường | Kiểu dữ liệu | JSON Property | Bắt buộc | Ghi chú |
|---|---|---|---|---|
| `withdrawalId` | `String` | `withdrawal_id` | ✅ | |
| `verified` | `Boolean` | `verified` | ✅ | |
| `score` | `Integer` | `score` | ❌ | 0–100 |
| `status` | `String` | `status` | ✅ | `VERIFIED`, `WARNING`, `FAILED` |
| `analysisLog` | `String` | `analysis_log` | ❌ | Chi tiết phân tích AI |

**Response — `ResponseEntity<ApiResponse<Void>>`:** `result` = `null`.

---
---

## 3. Blockchain Service (`localhost:8080/blockchain-service`)

> Response wrapper chung: `{ "code": int, "message": string, "result": object }`

### 3.1 Hợp đồng thông minh (`/v1/contracts`)

#### `POST /v1/contracts/sign` — Ký kết hợp đồng

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | JSON Body (`c.ShouldBindJSON`) |
| **Phân quyền** | Auth middleware (Bearer token) |

**Request Body — `ContractCreateRequest`:**

| Trường | Kiểu dữ liệu | JSON Key | Bắt buộc | Ghi chú |
|---|---|---|---|---|
| `CampaignID` | `string` | `campaign_id` | ✅ | |
| `CampaignName` | `string` | `campaign_name` | ✅ | |
| `Description` | `string` | `description` | ❌ | |
| `OrganizerName` | `string` | `organizer_name` | ✅ | |
| `OrganizerID` | `string` | `organizer_id` | ❌ | |
| `OrganizerIDNumber` | `string` | `organizer_id_number` | ❌ | Số CCCD |
| `TargetAmount` | `float64` | `target_amount` | ❌ | |
| `Currency` | `string` | `currency` | ❌ | |
| `StartDate` | `string` | `start_date` | ❌ | |
| `EndDate` | `string` | `end_date` | ❌ | |

**Response — `ContractSignResponse`:**

| Trường | Kiểu dữ liệu | JSON Key |
|---|---|---|
| `ContractID` | `string` | `contract_id` |
| `CampaignID` | `string` | `campaign_id` |
| `ContentHash` | `string` | `content_hash` |
| `Signature` | `string` | `signature` |
| `SignatureAlg` | `string` | `signature_algorithm` |
| `SignedAt` | `time.Time` | `signed_at` |
| `PublicKeyID` | `string` | `public_key_id` |

---

#### `GET /v1/contracts/{contractId}` — Lấy chi tiết hợp đồng

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `contractId` | `string` | Path | ✅ |

**Response (result):**

| Trường | JSON Key |
|---|---|
| `id` | `id` |
| `campaign_id` | `campaign_id` |
| `campaign_name` | `campaign_name` |
| `description` | `description` |
| `organizer_name` | `organizer_name` |
| `organizer_id` | `organizer_id` |
| `target_amount` | `target_amount` |
| `currency` | `currency` |
| `content_hash` | `content_hash` |
| `signature_alg` | `signature_alg` |
| `public_key_id` | `public_key_id` |
| `signed_at` | `signed_at` |
| `start_date` | `start_date` |
| `end_date` | `end_date` |
| `created_at` | `created_at` |

---

#### `GET /v1/contracts/{contractId}/verify` — Xác minh hợp đồng

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `contractId` | `string` | Path | ✅ |

**Response (result):**

| Trường | Kiểu dữ liệu |
|---|---|
| `contract_id` | `string` |
| `is_valid` | `bool` |

---

#### `GET /v1/contracts/campaign/{campaignId}` — Lấy hợp đồng theo campaign

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `campaignId` | `string` | Path | ✅ |

**Response (result):** Gồm `id`, `campaign_id`, `campaign_name`, `content_hash`, `signature_alg`, `signed_at`.

---

#### `GET /v1/contracts/{contractId}/download` — Tải PDF hợp đồng

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `contractId` | `string` | Path | ✅ |

**Response:** Binary PDF file (`Content-Type: application/pdf`).

---

### 3.2 Ví điện tử (`/v1/wallets`)

#### `POST /v1/wallets` — Tạo ví mới

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `application/json` |
| **Cơ chế** | JSON Body |
| **Phân quyền** | Auth middleware |

**Request Body — `WalletCreateRequest`:**

| Trường | Kiểu dữ liệu | JSON Key | Bắt buộc | Ghi chú |
|---|---|---|---|---|
| `CampaignID` | `string` | `campaign_id` | ✅ | |
| `PrivateKey` | `string` | `private_key` | ❌ | Tự sinh nếu trống |
| `PublicKey` | `string` | `public_key` | ❌ | |
| `SeedPhrase` | `string` | `seed_phrase` | ❌ | Tự sinh nếu trống |

**Response — `WalletResponse`:**

| Trường | Kiểu dữ liệu | JSON Key |
|---|---|---|
| `ID` | `string` | `id` |
| `CampaignID` | `string` | `campaign_id` |
| `Address` | `string` | `address` |
| `PublicKey` | `string` | `public_key` |
| `Balance` | `float64` | `balance` |
| `TotalDeposits` | `float64` | `total_deposits` |
| `TotalWithdrawals` | `float64` | `total_withdrawals` |
| `Currency` | `string` | `currency` |
| `Status` | `string` | `status` |
| `IsVerified` | `bool` | `is_verified` |
| `LastVerifiedAt` | `time.Time` | `last_verified_at` |
| `CreatedAt` | `time.Time` | `created_at` |

---

#### `GET /v1/wallets/{walletId}` — Lấy thông tin ví

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `walletId` | `string` | Path | ✅ |

**Response — `WalletResponse`:** (cấu trúc giống trên).

---

#### `GET /v1/wallets/campaign/{campaignId}` — Lấy ví theo campaign

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `campaignId` | `string` | Path | ✅ |

**Response — `WalletResponse`:** (cấu trúc giống trên).

---

#### `POST /v1/wallets/{walletId}/freeze` — Đóng băng ví

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `walletId` | `string` | Path | ✅ |

**Response:** `{ "code": 0, "message": "Wallet frozen successfully" }`.

---

#### `POST /v1/wallets/{walletId}/unfreeze` — Mở khóa ví

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `walletId` | `string` | Path | ✅ |

**Response:** `{ "code": 0, "message": "Wallet unfrozen successfully" }`.

---

### 3.3 Kiểm toán (`/v1/audit`)

#### `GET /v1/audit/verify/{walletId}` — Xác minh chuỗi khối

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `walletId` | `string` | Path | ✅ |

**Response — `AuditResult`:**

| Trường | Kiểu dữ liệu | JSON Key |
|---|---|---|
| `WalletID` | `string` | `wallet_id` |
| `IsValid` | `bool` | `is_valid` |
| `TotalBlocks` | `int64` | `total_blocks` |
| `VerifiedAt` | `time.Time` | `verified_at` |
| `InvalidBlocks` | `[]InvalidBlock` | `invalid_blocks` |
| `ChainIntegrity` | `string` | `chain_integrity` |

**InvalidBlock:**

| Trường | Kiểu | JSON Key |
|---|---|---|
| `BlockIndex` | `int64` | `block_index` |
| `ExpectedHash` | `string` | `expected_hash` |
| `ActualHash` | `string` | `actual_hash` |
| `Reason` | `string` | `reason` |

---

#### `GET /v1/audit/history/{walletId}` — Lịch sử giao dịch

| Tham số | Kiểu | Vị trí | Bắt buộc | Default |
|---|---|---|---|---|
| `walletId` | `string` | Path | ✅ | |
| `offset` | `int` | Query | ❌ | `0` |
| `limit` | `int` | Query | ❌ | `20` (max 100) |

**Response (result):**

| Trường | Kiểu dữ liệu |
|---|---|
| `wallet_id` | `string` |
| `blocks` | `Array` (xem bên dưới) |
| `total` | `int64` |
| `offset` | `int` |
| `limit` | `int` |

**Mỗi phần tử trong `blocks`:**

| Trường | Kiểu dữ liệu |
|---|---|
| `id` | `string` (UUID) |
| `block_index` | `int64` |
| `transaction_id` | `string` (UUID) |
| `previous_hash` | `string` |
| `current_hash` | `string` |
| `transaction_data` | `string` (JSON encoded) |
| `created_at` | `time.Time` |

---

#### `GET /v1/audit/count/{walletId}` — Đếm số block

| Tham số | Kiểu | Vị trí | Bắt buộc |
|---|---|---|---|
| `walletId` | `string` | Path | ✅ |

**Response (result):**

| Trường | Kiểu dữ liệu |
|---|---|
| `wallet_id` | `string` |
| `block_count` | `int64` |

---

#### `GET /v1/audit/balance/{walletId}` — Tính số dư từ chain

| Tham số | Kiểu | Vị trí | Bắt buộc | Default |
|---|---|---|---|---|
| `walletId` | `string` | Path | ✅ | |
| `currency` | `string` | Query | ❌ | `"VND"` |

**Response — `WalletBalanceResponse`:**

| Trường | Kiểu dữ liệu | JSON Key | Ghi chú |
|---|---|---|---|
| `WalletID` | `string` | `wallet_id` | |
| `CampaignID` | `string` | `campaign_id` | |
| `CachedBalance` | `float64` | `cached_balance` | Số dư cached trong DB |
| `CalculatedBalance` | `float64` | `calculated_balance` | Tính từ hash-chain |
| `TotalDeposits` | `float64` | `total_deposits` | |
| `TotalWithdrawals` | `float64` | `total_withdrawals` | |
| `TransactionCount` | `int64` | `transaction_count` | |
| `Currency` | `string` | `currency` | |
| `IsVerified` | `bool` | `is_verified` | Chain hợp lệ & balance khớp |
| `BalanceMatch` | `bool` | `balance_match` | cached == calculated |
| `CalculatedAt` | `time.Time` | `calculated_at` | |

---

#### `GET /v1/audit/verified-balance/{walletId}` — Số dư đã xác minh

| Tham số | Kiểu | Vị trí | Bắt buộc | Default |
|---|---|---|---|---|
| `walletId` | `string` | Path | ✅ | |
| `currency` | `string` | Query | ❌ | `"VND"` |

**Response — `WalletBalanceResponse`:** (cấu trúc giống trên). Xác minh chain trước khi tính balance.

---
---

## 4. File Service (`localhost:8080/file-service`)

### 4.1 Upload tập tin (`/files`)

#### `POST /files/upload` — Tải lên một tập tin

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `multipart/form-data` |
| **Cơ chế** | `c.FormFile("file")` |

**Request FormData:**

| Trường | Kiểu dữ liệu | Bắt buộc |
|---|---|---|
| `file` | `File` | ✅ |

**Response — `APIResponse`:**

| Trường | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `code` | `int` | |
| `message` | `string` | |
| `timestamp` | `time.Time` | |
| `request_id` | `string` | |
| `data` | `FileMetadata` | Chi tiết file |

**FileMetadata:**

| Trường | Kiểu dữ liệu | JSON Key |
|---|---|---|
| `FileID` | `string` | `file_id` |
| `URL` | `string` | `url` |
| `Filename` | `string` | `filename` |
| `Size` | `int64` | `size` |
| `ContentType` | `string` | `content_type` |
| `Checksum` | `string` | `checksum` |
| `UploadedAt` | `time.Time` | `uploaded_at` |

---

#### `POST /files/upload/batch` — Tải lên nhiều tập tin

| Giao tiếp | Chi tiết |
|---|---|
| **Content-Type** | `multipart/form-data` |
| **Cơ chế** | `c.MultipartForm()` |

**Request FormData:**

| Trường | Kiểu dữ liệu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `files` | `[]File` | ✅ | Mảng nhiều file |

**Response — `APIResponse` (data = `MultipleFilesResponse`):**

| Trường | Kiểu dữ liệu | JSON Key |
|---|---|---|
| `Files` | `[]FileMetadata` | `files` |
| `Total` | `int` | `total` |
| `Successful` | `int` | `successful` |
| `Failed` | `int` | `failed` |

---
---

## 5. AI Service (`localhost:8080/ai-service`)

> AI Service sử dụng **FastAPI (Python)** và giao tiếp chính qua **Kafka** (bất đồng bộ).
> Chỉ có 2 endpoint REST đơn giản dùng để healthcheck.

#### `GET /` — Root status

**Response:**

```json
{
  "service": "ai-service",
  "version": "1.0.0",
  "status": "running"
}
```

---

#### `GET /health` — Healthcheck

**Response:**

```json
{
  "status": "healthy"
}
```

---

### Giao tiếp Kafka (bất đồng bộ)

AI Service **lắng nghe** message từ Kafka topic, xử lý phân tích ảnh bằng CLIP + Gemini, sau đó gọi **HTTP callback** ngược về Core Service qua endpoint `POST /proofs/internal/hybrid-callback` với body `HybridReasoningCallbackRequest` (xem mục 2.4).
