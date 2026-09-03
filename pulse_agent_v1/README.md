# pulse_agent_v1

An OTP application for collecting and forwarding agent metrics, logs, and heartbeats to the PulseBoard backend with Kafka integration for log streaming.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Agents/CLI    │────▶│  pulse_agent_v1  │────▶│   Backend API   │
│  (HTTP/CLI)     │     │   (Cowboy HTTP)  │     │   (Go/Chi)      │
└─────────────────┘     └────────┬─────────┘     └────────┬────────┘
                                 │                        │
                                 ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   PostgreSQL    │     │     Kafka       │
                        │   (Persistence) │     │  (Log Streaming)│
                        └─────────────────┘     └─────────────────┘
```

### Components

- **Cowboy HTTP Server** (`pulse_http_server`, `pulse_api_handler`) — REST endpoints for health, agent registration, heartbeats, and logs
- **Service Layer** (`pulse_agent_service`) — Business logic, validation, orchestration
- **ETS Store** (`ets_config`) — In-memory caching with PostgreSQL persistence
- **PostgreSQL Adapter** (`psql_config`) — Schema management and persistence
- **Kafka Producer** (`pulse_kafka_producer`) — Async log publishing to Kafka topics
- **Backend Sync** (`pulse_backend_sync`) — Fetches API logs from backend API
- **CLI** (`pulse-agent`) — Local credential management and server health checks

## Implementation Approach & Phases

### Phase 1: Foundation & Logging Infrastructure (Current)
- [ ] Add structured logging with `lager` (or OTP logger with handlers)
- [ ] Set up Common Test (CT) infrastructure with test suites
- [ ] Add Kafka client dependency (`kcli` or `kafka_client`)
- [ ] Create configuration schema for Kafka (brokers, topics, security)

### Phase 2: Kafka Integration
- [ ] Implement `pulse_kafka_producer` gen_server for async message production
- [ ] Add producer pooling and batching for throughput
- [ ] Implement delivery guarantees (at-least-once with idempotent writes)
- [ ] Add metrics: produced count, latency, errors, backpressure signals

### Phase 3: Backend API Log Fetching
- [ ] Implement `pulse_backend_sync` to poll backend `/api/v1/logs` endpoint
- [ ] Support cursor-based pagination and incremental sync
- [ ] Transform backend log format to internal Kafka message format
- [ ] Add retry/backoff and circuit breaker for backend failures

### Phase 4: Log Pipeline Integration
- [ ] Wire Kafka producer into `ets_config:append_log/1` and `pulse_agent_service:append_log/1`
- [ ] Dual-write: persist to PostgreSQL + publish to Kafka (async, non-blocking)
- [ ] Add log enrichment (agent metadata, timestamps, correlation IDs)
- [ ] Implement dead-letter queue for failed Kafka publishes

### Phase 5: Observability & Hardening
- [ ] Health checks for Kafka connectivity
- [ ] Prometheus metrics export (`prometheus_exporter`)
- [ ] Distributed tracing headers propagation
- [ ] Configuration validation at startup
- [ ] Load testing and chaos scenarios

### Phase 6: Advanced Features (Future)
- [ ] Log compaction and retention policies in Kafka
- [ ] Schema registry integration (Avro/Protobuf)
- [ ] Multi-topic routing by log level or agent type
- [ ] Backfill/replay capability for historical logs

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/health` | Health check (v1) |
| GET | `/api/v1/agents` | List registered agents |
| POST | `/api/v1/agents/register` | Register new agent |
| POST | `/api/v1/agents/heartbeat` | Agent heartbeat |
| POST | `/api/v1/logs` | Ingest log entry |
| GET | `/api/v1/logs` | List stored logs |

## Build & Run

```bash
# Compile
rebar3 compile

# Run tests (eunit + CT)
rebar3 eunit
rebar3 ct

# Run shell
rebar3 shell

# Install CLI
make install
pulse-agent login --token <TOKEN>
pulse-agent status
```

## Configuration

Environment variables (or `sys.config`):

```bash
# HTTP
export PULSE_HTTP_PORT=8082

# PostgreSQL
export PULSE_POSTGRES_ENABLED=true
export PULSE_POSTGRES_HOST=localhost
export PULSE_POSTGRES_PORT=5432
export PULSE_POSTGRES_DATABASE=pulse_agent_v1
export PULSE_POSTGRES_USERNAME=myuser
export PULSE_POSTGRES_PASSWORD=mypassword

# Kafka
export PULSE_KAFKA_BROKERS=localhost:9092
export PULSE_KAFKA_TOPIC=api-logs
export PULSE_KAFKA_CLIENT_ID=pulse_agent_v1
export PULSE_KAFKA_ACKS=all
export PULSE_KAFKA_BATCH_SIZE=16384
export PULSE_KAFKA_LINGER_MS=5

# Backend Sync
export PULSE_BACKEND_API_URL=http://localhost:8080
export PULSE_BACKEND_SYNC_INTERVAL_MS=30000
export PULSE_BACKEND_API_KEY=<api-key>
```

## Testing

```bash
# Unit tests (eunit)
rebar3 eunit

# Common Test suites
rebar3 ct

# Specific suite
rebar3 ct --suite=test/pulse_kafka_producer_SUITE

# With coverage
rebar3 cover
```

## Project Structure

```
src/
├── pulse_agent_v1_app.erl          # Application callback
├── pulse_agent_v1_sup.erl          # Top-level supervisor
├── pulse_http_server.erl           # Cowboy listener setup
├── pulse_api_handler.erl           # HTTP request dispatch
├── pulse_router.erl                # Route definitions
├── pulse_agent_service.erl         # Business logic
├── pulse_kafka_producer.erl        # Kafka producer (Phase 2)
├── pulse_backend_sync.erl          # Backend log fetcher (Phase 3)
├── pulse_logger.erl                # Logging wrapper (Phase 1)
├── configs/
│   ├── application_env_setup.erl   # Env defaults
│   ├── ets_config.erl              # ETS + PG persistence
│   ├── psql_config.erl             # PostgreSQL adapter
│   ├── redis_config.erl            # Redis placeholder
│   └── kafka_config.erl            # Kafka configuration (Phase 1)
├── cli/
│   ├── pulse_cli.erl               # CLI entry point
│   ├── pulse_login.erl
│   ├── pulse_logout.erl
│   ├── pulse_status.erl
│   └── pulse_cli_store.erl
└── ct/
    ├── pulse_kafka_producer_SUITE.erl
    ├── pulse_backend_sync_SUITE.erl
    └── pulse_agent_service_SUITE.erl
```

## Dependencies

| Dep | Version | Purpose |
|-----|---------|---------|
| cowboy | 2.12 | HTTP server |
| epgsql | 4.8 | PostgreSQL client |
| kafka_client / kcli | TBD | Kafka producer |
| lager | 3.9 | Structured logging |
| proper | 1.3 | Property-based testing (CT) |

## CI/CD

- `make test` → runs `rebar3 eunit && rebar3 ct`
- `make dialyzer` → static analysis
- `make xref` → cross-reference checks
- GitHub Actions: `.github/workflows/erlang.yml` (to be added)

## License

MIT