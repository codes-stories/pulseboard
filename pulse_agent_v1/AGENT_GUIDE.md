# Pulse Agent V1 — Usage Guide

This guide covers three ways to run the Pulse Agent: from source, as an installed package, and inside a Docker container.

---

## Table of Contents

1. [Quick Start (TL;DR)](#quick-start)
2. [Option A: Running from Source](#option-a-running-from-source)
3. [Option B: Installing the Package](#option-b-installing-the-package)
4. [Option C: Running in Docker](#option-c-running-in-docker)
5. [CLI Commands Reference](#cli-commands-reference)
6. [Environment Variables](#environment-variables)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# Enroll with the backend (one-time setup)
pulse-agent enroll <YOUR_ENROLLMENT_TOKEN>

# Verify login
pulse-agent status

# Start the agent (from source)
rebar3 shell --config config/sys.config
```

---

## Option A: Running from Source

Use this when developing or contributing to the agent.

### Prerequisites

- Erlang/OTP 26+
- rebar3
- git, make, gcc, g++

### Build

```bash
cd pulse_agent_v1

# Fetch dependencies
rebar3 get-deps

# Compile
rebar3 compile
```

### Login from Source

```bash
# Step 1: Enroll with the backend (gets an API key)
export PULSE_BACKEND_API_URL=http://localhost:8080
pulse-agent enroll <ENROLLMENT_TOKEN>

# OR: login directly with an existing token or API key
pulse-agent login <YOUR_TOKEN>
pulse-agent login --api-key <YOUR_API_KEY>

# Step 2: Verify
pulse-agent status
```

Credentials are stored at `~/.pulse_agent_v1/credential`.

### Run the Agent

```bash
# Interactive shell (development)
rebar3 shell --config config/sys.config

# Production release
rebar3 as prod release
_build/prod/rel/pulse_agent_v1/bin/pulse_agent_v1 foreground
```

The agent starts listening on:
- **Port 8082** — HTTP API (health, agent registration, logs)
- **Port 8083** — OTLP ingestion (traces, metrics, logs, profiles)

### Verify It's Running

```bash
curl http://localhost:8082/health
```

---

## Option B: Installing the Package

Use this for production deployments on a single machine.

### Install via Curl (Recommended)

```bash
curl -fsSL https://github.com/gaurav/pulseboard/releases/latest/download/install.sh | bash
```

This automatically:
1. Detects your OS and architecture
2. Downloads the latest `pulse-agent` binary
3. Installs it to `~/.local/bin/pulse-agent`
4. Adds `~/.local/bin` to your PATH if needed

### Install via Make (from source)

```bash
cd pulse_agent_v1
make install    # copies pulse-agent to ~/.local/bin/pulse-agent
```

### Login

```bash
# Enroll (one-time — requires backend access)
export PULSE_BACKEND_API_URL=http://your-backend:8080
pulse-agent enroll <ENROLLMENT_TOKEN>

# OR login with existing credentials
pulse-agent login <YOUR_TOKEN>
pulse-agent login --api-key <YOUR_API_KEY>

# Verify
pulse-agent status
```

### Start the Agent

If installed via the package, build a release first (or use the pre-built release tarball):

```bash
# Build release
rebar3 as prod release

# Run in foreground
pulse_agent_v1 foreground

# OR run as a background daemon (Linux with systemd)
sudo systemctl enable --now pulse-agent
```

### Install as systemd Service (Linux)

```bash
# The installer or Makefile places pulse-agent.service in the right location
sudo cp pulse-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pulse-agent

# Check status
sudo systemctl status pulse-agent
journalctl -u pulse-agent -f
```

### Uninstall

```bash
# Via curl installer's uninstall script
uninstall.sh

# OR via Make
make uninstall
```

---

## Option C: Running in Docker

Use this for containerized deployments or when you don't want to install Erlang.

### Build the Image

```bash
cd pulse_agent_v1

docker build -t pulse-agent-v1 .
```

### Login Inside the Container

Pass credentials as environment variables:

```bash
docker run --rm -it \
  -e PULSE_BACKEND_API_URL=http://your-backend:8080 \
  -e PULSE_BACKEND_API_KEY=your-api-key \
  pulse-agent-v1 \
  pulse-agent status
```

Or mount a credential file:

```bash
# Create credential on host
mkdir -p ~/.pulse_agent_v1
echo "your-api-key" > ~/.pulse_agent_v1/credential

# Run with credential mounted
docker run --rm -it \
  -v ~/.pulse_agent_v1/credential:/home/pulse/.pulse_agent_v1/credential:ro \
  -e PULSE_BACKEND_API_URL=http://your-backend:8080 \
  pulse-agent-v1
```

### Run the Full Agent in Docker

```bash
docker run -d \
  --name pulse-agent \
  -p 8082:8082 \
  -p 8083:8083 \
  -e PULSE_HTTP_PORT=8082 \
  -e PULSE_OTEL_ENABLED=true \
  -e PULSE_OTEL_HTTP_PORT=8083 \
  -e PULSE_BACKEND_API_URL=http://your-backend:8080 \
  -e PULSE_BACKEND_API_KEY=your-api-key \
  -e PULSE_KAFKA_ENABLED=true \
  -e PULSE_KAFKA_BROKERS=kafka:9092 \
  pulse-agent-v1
```

### Docker Compose (with backing services)

```yaml
# docker-compose.yaml
version: "3.8"
services:
  agent:
    build: .
    ports:
      - "8082:8082"
      - "8083:8083"
    environment:
      - PULSE_HTTP_PORT=8082
      - PULSE_OTEL_ENABLED=true
      - PULSE_OTEL_HTTP_PORT=8083
      - PULSE_BACKEND_API_URL=http://backend:8080
      - PULSE_BACKEND_API_KEY=${PULSE_BACKEND_API_KEY}
      - PULSE_KAFKA_ENABLED=true
      - PULSE_KAFKA_BROKERS=kafka:9092
      - PULSE_POSTGRES_ENABLED=true
      - PULSE_POSTGRES_HOST=postgres
      - PULSE_POSTGRES_PORT=5432
      - PULSE_POSTGRES_USERNAME=myuser
      - PULSE_POSTGRES_PASSWORD=mypassword
      - PULSE_POSTGRES_DATABASE=pulse_agent_v1
    depends_on:
      - kafka
      - postgres

  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: pulse_agent_v1
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Verify Docker Deployment

```bash
# Health check
curl http://localhost:8082/health

# Check logs
docker logs -f pulse-agent
```

---

## CLI Commands Reference

The `pulse-agent` CLI is the primary interface. Run `pulse-agent` with no arguments to see help.

### Enroll

Register the agent with the PulseBoard backend and obtain an API key.

```bash
pulse-agent enroll <ENROLLMENT_TOKEN>
pulse-agent enroll --token <ENROLLMENT_TOKEN>
```

**Flow:**
1. Sends `POST /api/v1/agent/enroll` to the backend with hostname, device ID, and token
2. Backend returns an API key
3. API key is saved to `~/.pulse_agent_v1/credential`

**Requires:** `PULSE_BACKEND_API_URL` to point to the backend (default: `http://localhost:8080`).

---

### Login

Store a credential locally for agent authentication.

```bash
pulse-agent login <TOKEN>
pulse-agent login --token <TOKEN>
pulse-agent login --api-key <API_KEY>
pulse-agent login --apikey <API_KEY>
```

**Behavior:**
- If `PULSE_AGENT_API_URL` is set, checks server health before saving
- Saves the credential to `~/.pulse_agent_v1/credential`
- No server-side call is made — purely local storage

---

### Logout

Remove the stored credential.

```bash
pulse-agent logout
```

Deletes `~/.pulse_agent_v1/credential`.

---

### Status

Check whether a credential is stored.

```bash
pulse-agent status
```

Shows the masked credential (first 4 + `...` + last 4 chars).

---

### Monitor (OTP CLI only)

These commands are available when running via the OTP release or `rebar3 escript`:

```bash
pulse-agent monitor api <resource> <method>   # Monitor a specific API resource
pulse-agent monitor performance                # Get performance metrics
pulse-agent monitor pid-info                   # Get Erlang process info
pulse-agent monitor storage                    # Get storage info
```

---

### Remote (OTP CLI only)

```bash
pulse-agent remote login    # Remote login (prints usage)
pulse-agent remote status   # Check remote credential status
pulse-agent remote logout   # Remote logout
```

---

## Environment Variables

### Agent Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PULSE_HTTP_PORT` | `8082` | HTTP API port |
| `PULSE_OTEL_ENABLED` | `true` | Enable OTLP ingestion |
| `PULSE_OTEL_HTTP_PORT` | `8083` | OTLP HTTP port |

### Backend Connection

| Variable | Default | Description |
|----------|---------|-------------|
| `PULSE_BACKEND_API_URL` | `http://localhost:8080` | Backend API base URL |
| `PULSE_BACKEND_API_KEY` | `""` | API key for backend auth |
| `PULSE_BACKEND_SYNC_ENABLED` | `true` | Enable backend log sync |
| `PULSE_BACKEND_SYNC_INTERVAL_MS` | `30000` | Sync interval (ms) |
| `PULSE_BACKEND_SYNC_BATCH_SIZE` | `100` | Batch size for sync |

### Kafka

| Variable | Default | Description |
|----------|---------|-------------|
| `PULSE_KAFKA_ENABLED` | `false` | Enable Kafka producer |
| `PULSE_KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses |
| `PULSE_KAFKA_CLIENT_ID` | `pulse_agent_v1` | Kafka client ID |
| `PULSE_KAFKA_TOPIC` | `api-logs` | Kafka topic |
| `PULSE_KAFKA_ACKS` | `all` | Acknowledgment level |
| `PULSE_KAFKA_BATCH_SIZE` | `16384` | Batch size (bytes) |
| `PULSE_KAFKA_LINGER_MS` | `5` | Linger time (ms) |
| `PULSE_KAFKA_COMPRESSION` | `none` | Compression type |

### PostgreSQL

| Variable | Default | Description |
|----------|---------|-------------|
| `PULSE_POSTGRES_ENABLED` | `false` | Enable PostgreSQL |
| `PULSE_POSTGRES_HOST` | `localhost` | DB host |
| `PULSE_POSTGRES_PORT` | `5432` | DB port |
| `PULSE_POSTGRES_DATABASE` | `pulse_agent_v1` | DB name |
| `PULSE_POSTGRES_USERNAME` | `myuser` | DB username |
| `PULSE_POSTGRES_PASSWORD` | `mypassword` | DB password |

### CLI

| Variable | Default | Description |
|----------|---------|-------------|
| `PULSE_AGENT_API_URL` | _(unset)_ | If set, `login` checks server health first |

---

## Configuration

### YAML Config

Copy and edit `config.yaml.example`:

```bash
cp config.yaml.example config.yaml
```

Sections: `server`, `kafka`, `monitoring`, `health`, `otlp`, `postgres`, `backend`, `redis`, `tls`, `logging`, `metrics`, `service_discovery`, `advanced`.

### OTP Config

Production config lives in `config/sys.config`. Override values via environment variables (env vars take precedence).

### VM Arguments

`config/vm.args` sets Erlang VM options (process limits, node name, distributed cookie).

---

## Troubleshooting

### Agent won't start

```bash
# Check if port is in use
lsof -i :8082

# Check Erlang/OTP version
erl -eval 'io:format("~s~n", [erlang:system_info(otp_release)]), halt().' -noshell
# Should print 26
```

### Login fails

```bash
# Verify credential file exists
cat ~/.pulse_agent_v1/credential

# Check backend is reachable
curl http://localhost:8080/api/v1/health
```

### Docker health check fails

```bash
# Check container logs
docker logs pulse-agent

# Exec into container
docker exec -it pulse-agent /bin/sh
curl http://127.0.0.1:8082/health
```

### Kafka connection issues

```bash
# Verify Kafka is running
docker exec -it kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# Check agent logs for Kafka errors
docker logs pulse-agent 2>&1 | grep -i kafka
```

---

## HTTP API Endpoints

The agent exposes these endpoints on the configured HTTP port (default `8082`):

| Path | Method | Description |
|------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/health` | GET | Health check (alias) |
| `/agents` | GET | List registered agents |
| `/api/v1/agents` | GET | List registered agents (alias) |
| `/agent/register` | POST | Register an agent |
| `/api/v1/agents/register` | POST | Register an agent (alias) |
| `/agent/heartbeat` | POST | Agent heartbeat |
| `/api/v1/agents/heartbeat` | POST | Agent heartbeat (alias) |
| `/agent/logs` | POST | Push agent logs |
| `/api/v1/logs` | POST | Push agent logs (alias) |
| `/v1/traces` | POST | Ingest OTLP traces |
| `/v1/metrics` | POST | Ingest OTLP metrics |
| `/v1/logs` | POST | Ingest OTLP logs |
| `/v1/profiles` | POST | Ingest OTLP profiles |
| `/api/v1/write` | POST | Prometheus remote-write |
