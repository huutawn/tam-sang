# Hướng dẫn thêm Service mới vào API Gateway

## Tổng quan

API Gateway hiện tại đang sử dụng **Spring Cloud Gateway MVC** với Eureka Service Discovery. Để thêm một service mới (ví dụ: campaign-service), bạn chỉ cần thêm một route bean mới.

## Cách thêm Campaign Service (hoặc bất kỳ service nào)

### Bước 1: Thêm Route Bean vào GatewayConfig

Mở file [GatewayConfig.java](file:///d:/tamsang/api-gateway/src/main/java/com/nht/api_gateway/GatewayConfig.java) và thêm một method `@Bean` mới:

```java
@Bean
public RouterFunction<ServerResponse> campaignServiceRoute() {
    return route("campaign-service")
            .route(request -> request.path().startsWith("/campaign"), 
                   request -> {
                       ServiceInstance instance = loadBalancerClient.choose("CAMPAIGN-SERVICE");
                       if (instance == null) {
                           return ServerResponse.notFound().build();
                       }
                       String uri = instance.getUri().toString();
                       return HandlerFunctions.http(uri).handle(request);
                   })
            .filter(stripPrefix(1))
            .build();
}
```

### Bước 2: Tạo Campaign Service

Campaign service cần:

1. **Đăng ký với Eureka** - Thêm dependency và config:

```yaml
# application.yaml của campaign-service
spring:
  application:
    name: campaign-service  # Tên service (viết thường)

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
    register-with-eureka: true
    fetch-registry: true
```

2. **Dependency trong pom.xml**:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

### Bước 3: Test

1. **Start Eureka Server** (port 8761)
2. **Start Campaign Service** (bất kỳ port nào, ví dụ: 8082)
3. **Start API Gateway** (port 8080)

**Request qua Gateway:**
```bash
# Thay vì gọi trực tiếp: http://localhost:8082/campaigns
# Bạn gọi qua gateway:
curl http://localhost:8080/campaign/campaigns
```

## Giải thích cơ chế hoạt động

### 1. Path Matching
```java
.route(request -> request.path().startsWith("/campaign"), ...)
```
- Gateway kiểm tra nếu request bắt đầu với `/campaign`
- Ví dụ: `/campaign/campaigns`, `/campaign/123`, `/campaign/create`

### 2. Service Discovery
```java
ServiceInstance instance = loadBalancerClient.choose("CAMPAIGN-SERVICE");
```
- Gateway hỏi Eureka: "Service `CAMPAIGN-SERVICE` đang chạy ở đâu?"
- Eureka trả về instance (IP + Port)
- Nếu có nhiều instance → Load balancing tự động

### 3. Strip Prefix
```java
.filter(stripPrefix(1))
```
- Loại bỏ phần prefix đầu tiên khỏi path
- `/campaign/campaigns` → `/campaigns`
- `/campaign/123` → `/123`

## Ví dụ thêm nhiều services

```java
@Configuration
public class GatewayConfig {

    private final LoadBalancerClient loadBalancerClient;

    public GatewayConfig(LoadBalancerClient loadBalancerClient) {
        this.loadBalancerClient = loadBalancerClient;
    }

    // Identity Service: /identity/**
    @Bean
    public RouterFunction<ServerResponse> identityServiceRoute() {
        return route("identity-service")
                .route(request -> request.path().startsWith("/identity"), 
                       request -> {
                           ServiceInstance instance = loadBalancerClient.choose("IDENTITY-SERVICE");
                           if (instance == null) {
                               return ServerResponse.notFound().build();
                           }
                           String uri = instance.getUri().toString();
                           return HandlerFunctions.http(uri).handle(request);
                       })
                .filter(stripPrefix(1))
                .build();
    }

    // Campaign Service: /campaign/**
    @Bean
    public RouterFunction<ServerResponse> campaignServiceRoute() {
        return route("campaign-service")
                .route(request -> request.path().startsWith("/campaign"), 
                       request -> {
                           ServiceInstance instance = loadBalancerClient.choose("CAMPAIGN-SERVICE");
                           if (instance == null) {
                               return ServerResponse.notFound().build();
                           }
                           String uri = instance.getUri().toString();
                           return HandlerFunctions.http(uri).handle(request);
                       })
                .filter(stripPrefix(1))
                .build();
    }

    // Order Service: /order/**
    @Bean
    public RouterFunction<ServerResponse> orderServiceRoute() {
        return route("order-service")
                .route(request -> request.path().startsWith("/order"), 
                       request -> {
                           ServiceInstance instance = loadBalancerClient.choose("ORDER-SERVICE");
                           if (instance == null) {
                               return ServerResponse.notFound().build();
                           }
                           String uri = instance.getUri().toString();
                           return HandlerFunctions.http(uri).handle(request);
                       })
                .filter(stripPrefix(1))
                .build();
    }
}
```

## Pattern để thêm service mới

**Template:**
```java
@Bean
public RouterFunction<ServerResponse> [tên-service]Route() {
    return route("[tên-route]")
            .route(request -> request.path().startsWith("/[prefix]"), 
                   request -> {
                       ServiceInstance instance = loadBalancerClient.choose("[SERVICE-NAME-IN-EUREKA]");
                       if (instance == null) {
                           return ServerResponse.notFound().build();
                       }
                       String uri = instance.getUri().toString();
                       return HandlerFunctions.http(uri).handle(request);
                   })
            .filter(stripPrefix(1))
            .build();
}
```

**Thay thế:**
- `[tên-service]` → tên method (camelCase)
- `[tên-route]` → tên route ID
- `[prefix]` → path prefix (ví dụ: `/campaign`, `/order`)
- `[SERVICE-NAME-IN-EUREKA]` → tên service đăng ký trong Eureka (UPPERCASE)

## Lưu ý quan trọng

1. **Service Name trong Eureka phải UPPERCASE**: `CAMPAIGN-SERVICE`, `IDENTITY-SERVICE`
2. **Path prefix nên lowercase**: `/campaign`, `/identity`
3. **StripPrefix(1)** loại bỏ 1 segment đầu tiên
4. **Service phải đăng ký với Eureka** trước khi Gateway có thể route
5. **Restart Gateway** sau khi thêm route mới

## Kiểm tra

1. **Eureka Dashboard**: http://localhost:8761
   - Xem danh sách services đã đăng ký

2. **Test qua Gateway**:
```bash
# Identity Service
curl http://localhost:8080/identity/users

# Campaign Service
curl http://localhost:8080/campaign/campaigns
```

## Troubleshooting

**Lỗi 404 Not Found:**
- Kiểm tra service đã đăng ký với Eureka chưa
- Kiểm tra tên service trong `loadBalancerClient.choose()` có đúng không
- Kiểm tra path prefix có match không

**Service không xuất hiện trong Eureka:**
- Kiểm tra `eureka.client.register-with-eureka: true`
- Kiểm tra `spring.application.name` đã set chưa
- Kiểm tra Eureka Server URL đúng chưa
