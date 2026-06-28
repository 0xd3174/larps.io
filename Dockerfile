# Stage 1: Build the frontend with Bun
FROM oven/bun:1 as frontend-builder
WORKDIR /app
COPY shared.json ./
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN bun install
COPY frontend/ ./
RUN bun run build

# Stage 2: Build the Go backend
FROM golang:1.22-alpine as backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o game-backend .

# Stage 3: Final lightweight image
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=backend-builder /app/backend/game-backend ./
COPY --from=frontend-builder /app/frontend/dist ./public
COPY shared.json /app/shared.json

ENV PORT=8080
ENV STATIC_DIR=/app/public
ENV MAP_PATH=/app/public/map.json

EXPOSE 8080

CMD ["./game-backend"]
