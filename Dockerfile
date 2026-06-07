# ============================================================
# Stage 1: Build
# ============================================================
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Кеширование зависимостей: сначала только pom.xml
COPY pom.xml .
RUN mvn dependency:go-offline -B -q

# Сборка
COPY src ./src
RUN mvn package -DskipTests -B -q

# ============================================================
# Stage 2: Run
# ============================================================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=builder /app/target/*.jar ./app.jar

# Директории для H2 БД и загруженных файлов
RUN mkdir -p /app/data /app/uploaded

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -q --spider http://localhost:8080/ || exit 1

EXPOSE 8080

# Профиль docker + пути для H2 и загрузок
CMD ["java", "-Dspring.profiles.active=docker", "-jar", "app.jar"]