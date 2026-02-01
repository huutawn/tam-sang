# Hướng Dẫn Triển Khai Production - TamSang

## Kiến Trúc Nginx-Friendly

Dự án TamSang được thiết kế để dễ dàng triển khai với Nginx làm reverse proxy.

### Cấu Trúc URL

```
https://tamsang.org/
├── /                          → Next.js Frontend (SSR/SSG)
├── /_next/static/             → Next.js Static Assets
├── /api/auth/*                → Next.js BFF (Auth handlers)
└── /api/*                     → Java Backend API
```

---

## Luồng Request

### 1. Frontend Pages (SSR/SSG)
```
User → https://tamsang.org/
     → Nginx
     → Next.js (Port 3000)
     → Render HTML
```

### 2. Authentication (BFF Pattern)
```
User → POST https://tamsang.org/api/auth/login
     → Nginx
     → Next.js BFF (Port 3000)
     → Java Backend (Port 8080)
     → Set HttpOnly Cookie
     → Return to User
```

### 3. API Calls (Public)
```
User → GET https://tamsang.org/api/campaigns/featured
     → Nginx
     → Next.js BFF (Port 3000) - Proxy
     → Java Backend (Port 8080) /api/campaigns/featured
     → Return data
```

### 4. API Calls (Protected)
```
User → GET https://tamsang.org/api/campaigns/me
     → Nginx
     → Next.js BFF (Port 3000)
     → Đọc token từ Cookie
     → Java Backend (Port 8080) /api/campaigns/me + Bearer token
     → Return data
```

---

## Cấu Hình Environment Variables

### Development (.env.local)
```bash
# Backend URL (internal network)
BACKEND_URL=http://localhost:8080

# Public API URL (for client-side)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Production (.env.production)
```bash
# Backend URL (internal network - same VPC)
BACKEND_URL=http://10.0.1.100:8080

# Public API URL (external domain)
NEXT_PUBLIC_API_URL=https://tamsang.org/api
```

---

## Triển Khai với Docker

### 1. Dockerfile cho Next.js
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### 2. docker-compose.yml
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - nextjs
      - backend

  nextjs:
    build: ./tamsang-fe
    environment:
      - BACKEND_URL=http://backend:8080
      - NEXT_PUBLIC_API_URL=https://tamsang.org/api
    expose:
      - "3000"

  backend:
    image: tamsang/backend:latest
    environment:
      - SPRING_PROFILES_ACTIVE=production
    expose:
      - "8080"
```

---

## Checklist Triển Khai

### Trước khi Deploy
- [ ] Cập nhật `BACKEND_URL` trong `.env.production`
- [ ] Cập nhật `NEXT_PUBLIC_API_URL` trong `.env.production`
- [ ] Build Next.js: `npm run build`
- [ ] Test production build: `npm start`
- [ ] Kiểm tra CORS settings ở Backend

### Nginx Configuration
- [ ] Copy `nginx.conf.example` thành `nginx.conf`
- [ ] Cập nhật `upstream` addresses
- [ ] Cấu hình SSL certificate (Let's Encrypt)
- [ ] Test config: `nginx -t`
- [ ] Reload Nginx: `nginx -s reload`

### Security
- [ ] Bật HTTPS (TLS 1.2+)
- [ ] Cấu hình HSTS header
- [ ] Giới hạn rate limiting
- [ ] Cấu hình firewall (chỉ cho phép Nginx access Backend)
- [ ] Kiểm tra HttpOnly Cookie settings

---

## Monitoring & Logging

### Nginx Access Logs
```bash
tail -f /var/log/nginx/access.log
```

### Next.js Logs
```bash
docker logs -f nextjs
```

### Backend Logs
```bash
docker logs -f backend
```

---

## Troubleshooting

### Lỗi 502 Bad Gateway
- Kiểm tra Next.js container đang chạy: `docker ps`
- Kiểm tra Backend container đang chạy
- Kiểm tra network connectivity giữa Nginx và containers

### Cookie không được set
- Kiểm tra `proxy_set_header Cookie $http_cookie;` trong Nginx
- Kiểm tra `SameSite` và `Secure` flags trong BFF
- Kiểm tra HTTPS đã được bật chưa

### Token không được gửi tới Backend
- Kiểm tra BFF logs: `console.log("Token:", accessToken)`
- Kiểm tra Backend có nhận được header `Authorization` không
- Kiểm tra Cookie expiry time

---

## Performance Optimization

### Nginx Caching
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

location /api/campaigns/featured {
    proxy_cache my_cache;
    proxy_cache_valid 200 5m;
    proxy_pass http://nextjs_backend;
}
```

### Next.js Image Optimization
Sử dụng `next/image` component để tự động optimize images.

### CDN
Cân nhắc sử dụng CDN (Cloudflare, AWS CloudFront) cho static assets.

---

## Rollback Plan

Nếu deployment gặp vấn đề:

1. Revert Nginx config:
   ```bash
   cp nginx.conf.backup nginx.conf
   nginx -s reload
   ```

2. Rollback Docker images:
   ```bash
   docker-compose down
   docker-compose up -d --force-recreate
   ```

3. Kiểm tra logs để xác định nguyên nhân

---

## Liên Hệ

Nếu gặp vấn đề trong quá trình deployment, liên hệ:
- DevOps Team: devops@tamsang.org
- Backend Team: backend@tamsang.org
- Frontend Team: frontend@tamsang.org
