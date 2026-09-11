# PulseBoard Agent Dockerfile
# Multi-stage build for minimal production image

# Build stage
FROM erlang:26-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    make \
    gcc \
    g++ \
    musl-dev \
    openssl-dev \
    ncurses-dev \
    unixodbc-dev \
    cmake

WORKDIR /app

# Copy rebar config first for dependency caching
COPY rebar.config rebar.lock ./

# Fetch dependencies
RUN rebar3 get-deps

# Copy source
COPY src/ src/
COPY config/ config/

# Compile release
RUN rebar3 as prod tar

# Runtime stage
FROM erlang:26-alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    openssl \
    ncurses-libs \
    libstdc++ \
    tzdata

# Create non-root user
RUN addgroup -g 1000 -S pulse && \
    adduser -u 1000 -S pulse -G pulse

WORKDIR /opt/pulse-agent

# Create log directory
RUN mkdir -p /opt/pulse-agent/log && chown pulse:pulse /opt/pulse-agent/log

# Copy release from builder
COPY --from=builder /app/_build/prod/rel/pulse_agent_v1 ./

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Change ownership
RUN chown -R pulse:pulse /opt/pulse-agent

# Switch to non-root user
USER pulse

# Expose ports
EXPOSE 8082 8083

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8082/health || exit 1

# Default command
ENTRYPOINT ["/entrypoint.sh"]