# SupplyCanvas Custom Galene Build
# Builds Galene with server-side participant filtering for observers

FROM golang:1.23-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /build

# Copy Galene source from submodule
COPY . .

# Download Go dependencies
RUN go mod download

# Build Galene binary
# CGO_ENABLED=0 for static binary
# -ldflags='-s -w' to strip debug info and reduce size
RUN CGO_ENABLED=0 go build -ldflags='-s -w' -o galene .

# Runtime image
FROM alpine:latest

# Install CA certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Create galene user
RUN addgroup -S galene && adduser -S galene -G galene

# Create directories
RUN mkdir -p /opt/galene/groups /opt/galene/data /opt/galene/recordings

# Copy binary from builder
COPY --from=builder /build/galene /usr/local/bin/galene

# Copy static files
COPY --from=builder /build/static /opt/galene/static

# Set ownership
RUN chown -R galene:galene /opt/galene

# Switch to galene user
USER galene

# Working directory
WORKDIR /opt/galene

# Expose port 8080 (configured via environment)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Run Galene
# Configuration via environment variables:
# GALENE_HTTP, GALENE_DATA, GALENE_GROUPS, GALENE_RECORDINGS, GALENE_TURN, GALENE_INSECURE
ENTRYPOINT ["/usr/local/bin/galene"]
