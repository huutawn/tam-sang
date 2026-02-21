# ========================================
# Stage 1: Build native image with GraalVM
# ========================================
FROM ghcr.io/graalvm/native-image-community:21 AS builder

WORKDIR /build

# Copy Maven wrapper and pom.xml first for dependency caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source code
COPY src/ src/

# Build native image (skip tests for faster build)
RUN ./mvnw -Pnative native:compile -DskipTests -B

# ========================================
# Stage 2: Minimal runtime
# ========================================
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy native binary from builder
COPY --from=builder /build/target/config-server ./config-server

# Copy config files (needed at runtime for native classpath resources)
COPY --from=builder /build/src/main/resources/ ./config-resources/

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8888

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8888/actuator/health || exit 1

ENTRYPOINT ["./config-server"]
