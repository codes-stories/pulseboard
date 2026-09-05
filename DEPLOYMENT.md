# PulseBoard Complete Deployment Guide

## Overview

PulseBoard is a full-stack observability platform consisting of:
- **Backend API** (Go 1.26) - REST API with PostgreSQL, Kafka, Redis
- **Frontend** (Next.js 16) - React 19 dashboard
- **Agent** (Erlang/OTP 26) - Telemetry collector with OTLP, Prometheus, Kafka

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agents    │────▶│ Pulse Agent │────▶│   Kafka     │
│ (Go/Py/Node)│     │  (Erlang)   │     │   Cluster   │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌──────────────────┐
                    │  PostgreSQL │     │  Consumers       │
                    │  (Metadata) │     │ - Tempo          │
                    └─────────────┘     │ - Prometheus     │
                                        │ - Loki           │
                                        │ - Pyroscope      │
                                        └──────────────────┘
```

## Quick Start

### Prerequisites
- Docker 24+ and Docker Compose v2
- 4GB+ RAM available
- Ports 3000, 8080, 8082, 8083, 5432, 6379, 9092, 2181 available

### One-Command Deployment

```bash
# Clone and deploy
git clone https://github.com/gaurav/pulseboard.git
cd pulseboard

# Set environment variables
export POSTGRES_PASSWORD=secure_password
export JWT_SECRET=your_jwt_secret_here

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Verify deployment
curl http://localhost:8080/health   # Backend
curl http://localhost:8082/health   # Agent HTTP
curl http://localhost:8083/health   # Agent OTLP
curl http://localhost:3000/         # Frontend
```

## Configuration

### Environment Variables (.env)

```bash
# Database
POSTGRES_DB=pulseboard
POSTGRES_USER=pulseboard
POSTGRES_PASSWORD=secure_password

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# Kafka
KAFKA_BROKERS=kafka:9092
KAFKA_ENABLED=true
KAFKA_TOPIC=api-logs

# Agent
OTEL_ENABLED=true
OTEL_HTTP_PORT=8083
OTEL_PROTOBUF_ENABLED=false

# Backend
BACKEND_API_URL=http://backend:8080
```

### Agent Configuration (config.yaml)

```yaml
server:
  http_port: 8082
  otlp_port: 8083

kafka:
  enabled: true
  brokers: ["kafka:9092"]
  topic: "api-logs"
  acks: "all"
  batch_size: 16384
  linger_ms: 5
  compression: "snappy"

otlp:
  enabled: true
  http_port: 8083

postgres:
  enabled: false
```

## Service Endpoints

| Service | Port | Health Check |
|---------|------|--------------|
| Backend API | 8080 | `GET /health` |
| Frontend | 3000 | `GET /` |
| Agent HTTP | 8082 | `GET /health` |
| Agent OTLP | 8083 | `GET /health` |

## Agent Installation

### One-Line Install (Linux/macOS)

```bash
curl -fsSL https://github.com/gaurav/pulseboard/releases/latest/download/install.sh | bash

# Configure
pulse-agent config

# Start
pulse-agent start
```

### Manual Binary

```bash
# Linux AMD64
curl -L https://github.com/gaurav/pulseboard/releases/download/v1.0.0/pulse-agent-linux-amd64.tar.gz | tar xz
sudo mv pulse-agent /usr/local/bin/

# Verify
pulse-agent --version
```

### Agent Configuration

```bash
# Environment variables
export PULSE_AGENT_KAFKA_BROKERS="kafka1:9092,kafka2:9092"
export PULSE_AGENT_KAFKA_TOPIC="api-logs"
export PULSE_AGENT_OTEL_ENABLED="true"
export PULSE_AGENT_OTEL_PORT="8083"

# Start as service
sudo pulse-agent install-service
sudo systemctl enable --now pulse-agent
```

## Instrumentation

### Go
```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
)

exporter, _ := otlptracehttp.New(context.Background(),
    otlptracehttp.WithEndpoint("localhost:8083"),
    otlptracehttp.WithInsecure(),
)
tp := trace.NewTracerProvider(trace.WithBatcher(exporter))
otel.SetTracerProvider(tp)
```

### Python
```bash
pip install opentelemetry-instrument
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:8083 opentelemetry-instrument python app.py
```

### Node.js
```bash
npm install @opentelemetry/auto-instrumentations-node
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:8083 node --require @opentelemetry/auto-instrumentations-node/register app.js
```

## Monitoring & Health Checks

```bash
# All services
curl http://localhost:8080/health    # Backend
curl http://localhost:8082/health    # Agent HTTP
curl http://localhost:8083/health    # Agent OTLP
curl http://localhost:3000/          # Frontend

# Infrastructure
docker compose -f docker-compose.prod.yml ps
```

## Troubleshooting

### Agent Won't Start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs pulse-agent

# Check Kafka connectivity
kafka-console-producer --broker-list kafka:9092 --topic test < /dev/null
```

### Database Migration Issues
```bash
# Check migration status
make migrate-status

# Force rollback
make migrate-down

# Re-run
make migrate-up
```

### Frontend Build Failures
```bash
cd pluseboard-monitoring
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Production Checklist

- [ ] Set strong `POSTGRES_PASSWORD` and `JWT_SECRET`
- [ ] Configure TLS certificates for production
- [ ] Set up Kafka replication (3+ brokers)
- [ ] Configure PostgreSQL backups
- [ ] Set up monitoring alerts for:
  - `pulse_agent_kafka_lag > 10000`
  - `backend_request_duration_seconds p99 > 2s`
  - `postgres_connections_active > 80%`
- [ ] Configure log rotation
- [ ] Set up backup strategy for PostgreSQL

## Scaling

### Horizontal Scaling
```yaml
# docker-compose.override.yml
services:
  backend:
    deploy:
      replicas: 3
  pulse-agent:
    deploy:
      replicas: 2
```

### Kafka Partitioning
- Create topics with 12+ partitions for throughput
- Use keyed messages for ordering guarantees

## Support

- **Documentation**: https://docs.pulseboard.io
- **Issues**: https://github.com/gaurav/pulseboard/issues
- **Discord**: https://discord.gg/pulseboard