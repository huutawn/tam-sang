# ============================================
# Stage 1: Build fat JAR
# ============================================
FROM eclipse-temurin:21-jdk-alpine AS builder

RUN apk add --no-cache maven

WORKDIR /build

# Copy pom first for dependency caching
COPY pom.xml ./
RUN mvn dependency:resolve -DskipTests -q

# Copy source code and build
COPY src ./src
RUN mvn package -DskipTests -q

# Extract layered JAR for optimized image
RUN java -Djarmode=layertools -jar target/*.jar extract --destination extracted

# ============================================
# Stage 2: Optimized runtime image
# ============================================
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -g 1000 appuser && adduser -D -u 1000 -G appuser appuser

WORKDIR /app

# Copy layers individually for better Docker caching
COPY --from=builder /build/extracted/dependencies/ ./
COPY --from=builder /build/extracted/spring-boot-loader/ ./
COPY --from=builder /build/extracted/snapshot-dependencies/ ./
COPY --from=builder /build/extracted/application/ ./

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8761

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8761/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "org.springframework.boot.loader.launch.JarLauncher"]
