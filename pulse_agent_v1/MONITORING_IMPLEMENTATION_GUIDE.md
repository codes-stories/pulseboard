# pulse_agent_v1 — Monitoring Implementation Guide

## Overview

Transform pulse_agent_v1 from a **log forwarder** into a **unified observability collector** that monitors Go, Python, Node.js, and other language runtimes via OpenTelemetry, Prometheus, and eBPF — all streaming to Kafka.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PULSE_AGENT_V1 (Erlang/OTP)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ OTLP/gRPC    │  │ Prometheus   │  │ Log/HTTP     │  │ eBPF/Kernel  │   │
│  │ Receiver     │  │ Remote Write │  │ Ingestion    │  │ Probe (opt)  │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │            │
│         └─────────────────┼─────────────────┼─────────────────┘            │
│                           ▼                                                 │
│              ┌────────────────────────┐                                    │
│  ┌──────────▶│  Normalization Layer   │──────────┐                         │
│  │           │  (OpenTelemetry Data   │          │                         │
│  │           │   Model → Internal)    │          │                         │
│  │           └───────────┬────────────┘          │                         │
│  │                      │                       │                         │
│  ▼                      ▼                       ▼                         │
│ ┌─────────┐      ┌─────────────┐        ┌─────────────┐                  │
│ │ Traces  │      │  Metrics    │        │    Logs     │                  │
│ │ Pipeline│      │  Pipeline   │        │  Pipeline   │                  │
│ └────┬────┘      └──────┬──────┘        └──────┬──────┘                  │
│      │                  │                      │                          │
│      └──────────────────┼──────────────────────┘                          │
│                         ▼                                                 │
│              ┌─────────────────────┐                                     │
│              │  Kafka Producer     │  (brod - existing)                  │
│              │  Topics:            │                                     │
│              │  - traces           │                                     │
│              │  - metrics          │                                     │
│              │  - logs             │                                     │
│              │  - profiling        │                                     │
│              └─────────┬───────────┘                                     │
└────────────────────────┼─────────────────────────────────────────────────┘
                         ▼
            ┌────────────────────────┐
            │   Downstream Consumers │
            │  - Tempo (traces)      │
            │  - Prometheus/Thanos   │
            │  - Loki (logs)         │
            │  - Pyroscope (profiles)│
            └────────────────────────┘
```

---

## Technology Choices & Rationale

### 1. OpenTelemetry Collector (OTel Collector) — **Primary Ingestion**

| Aspect | Decision |
|--------|----------|
| **What** | Vendor-neutral telemetry collector (CNI project) |
| **Why** | Single binary handles traces, metrics, logs; supports 30+ receivers/exporters; battle-tested at scale |
| **Protocols** | OTLP/gRPC, OTLP/HTTP, Jaeger, Zipkin, Prometheus, StatsD, Kafka, syslog, file |
| **Deployment** | Sidecar (per-pod), DaemonSet (per-node), Gateway (cluster) |
| **Integration** | Your Erlang app calls OTel Collector via OTLP/gRPC or HTTP; or OTel Collector scrapes your services |

**In pulse_agent_v1:** Embed OTel Collector as a managed child process, or run separately and have Erlang forward to it. For simplicity: **Erlang forwards OTLP JSON to Collector via HTTP/gRPC**.

---

### 2. Prometheus Remote Write — **Metrics Ingestion**

| Aspect | Decision |
|--------|----------|
| **What** | Prometheus native protocol for pushing metrics |
| **Why** | Native Prometheus ecosystem; efficient compression; works with Thanos/Cortex/Mimir |
| **Use Case** | Services expose `/metrics`; OTel Collector scrapes → remote-writes to your Kafka via Erlang, or Erlang receives remote-write directly |
| **In pulse_agent_v1** | Add `/api/v1/write` endpoint (Prometheus remote-write protobuf) → normalize → Kafka `metrics` topic |

---

### 3. OpenTelemetry Protocol (OTLP) — **Traces & Logs**

| Aspect | Decision |
|--------|----------|
| **What** | CNCF standard for telemetry data (protobuf over gRPC/HTTP) |
| **Why** | Language SDKs auto-instrument; single format for traces + logs + metrics |
| **In pulse_agent_v1** | Add `/v1/traces`, `/v1/logs`, `/v1/metrics` OTLP/HTTP endpoints → convert to internal → Kafka |

---

### 4. OpenTelemetry SDKs (Per-Language) — **Auto-Instrumentation**

| Language | Package | Zero-Code Instrumentation |
|----------|---------|---------------------------|
| **Go** | `go.opentelemetry.io/otel` + `go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp` | `import _ "go.opentelemetry.io/contrib/instrumentation/runtime"` |
| **Python** | `opentelemetry-instrument` | `opentelemetry-instrument python app.py` |
| **Node.js** | `@opentelemetry/auto-instrumentations-node` | `node --require @opentelemetry/auto-instrumentations-node/register app.js` |
| **Java** | `opentelemetry-javaagent.jar` | `-javaagent:opentelemetry-javaagent.jar` |
| **.NET** | `OpenTelemetry.AutoInstrumentation` | `dotnet OpenTelemetry.AutoInstrumentation.ClrProfiler` |
| **Rust** | `opentelemetry` + `tracing-opentelemetry` | Feature flags |

**Result:** Services emit traces/metrics/logs **without code changes**.

---

### 5. eBPF (Optional, Advanced) — **Zero-Code Kernel Observability**

| Tool | What It Gives You |
|------|-------------------|
| **bpftrace** | Ad-hoc one-liners: `bpftrace -e 'tracepoint:syscalls:sys_enter_open { printf("%s %s\n", comm, str(args->filename)); }'` |
| **Cilium Tetragon** | Service map, exec/events, network flows, file access |
| **Parca** | Continuous profiling (CPU, memory, goroutines) |
| **Pixie** | Full-body observability: latency, errors, throughput per service |

**In pulse_agent_v1:** Run as separate privileged DaemonSet; forward events to Kafka via `pulse_kafka_producer`. Not embedded in Erlang VM.

---

### 6. Kafka (Existing) — **Unified Event Bus**

| Topic | Schema | Consumers |
|--------|--------|-----------|
| `traces` | OTLP Span protobuf | Tempo, Jaeger |
| `metrics` | Prometheus remote-write protobuf | Prometheus, Thanos, Mimir |
| `logs` | OTLP LogRecord protobuf | Loki, Elasticsearch |
| `profiling` | Parca/pprof format | Pyroscope, Parca |

**Why Kafka:** Durability, replay, backpressure, multiple consumers, exactly-once.

---

## Data Flow per Signal

### Traces
```
Service (OTel SDK) 
  → OTLP/gRPC → OTel Collector 
  → OTLP/HTTP → pulse_agent_v1 `/v1/traces` 
  → Normalize → Kafka `traces` 
  → Tempo
```

### Metrics
```
Service `/metrics` 
  → OTel Collector (Prometheus receiver) 
  → Remote Write → pulse_agent_v1 `/api/v1/write` 
  → Normalize → Kafka `metrics` 
  → Prometheus/Thanos
```

### Logs
```
Service (stdout/stderr) 
  → Filebeat/Fluent Bit → OTel Collector (filelog receiver) 
  → OTLP/HTTP → pulse_agent_v1 `/v1/logs` 
  → Parse/Enrich → Kafka `logs` 
  → Loki
```

### Profiling (Continuous)
```
Service (OTel SDK + runtime) 
  → OTLP Profiles → pulse_agent_v1 `/v1/profiles` 
  → Kafka `profiling` 
  → Pyroscope/Parca
```

---

## Implementation in pulse_agent_v1

### New Modules to Add

| Module | Responsibility |
|--------|----------------|
| `pulse_otlp_handler` | HTTP endpoints for `/v1/traces`, `/v1/metrics`, `/v1/logs`, `/v1/profiles` (OTLP JSON/Protobuf) |
| `pulse_prom_remote_write` | `/api/v1/write` Prometheus remote-write handler (protobuf decode) |
| `pulse_telemetry_normalize` | Convert OTLP/Prometheus → internal unified format |
| `pulse_ebpf_bridge` | (Optional) Manage bpftrace/Cilium subprocess, feed events to Kafka |
| `pulse_service_discovery` | Discover targets (Consul, K8s API, DNS SRV, static config) |

### Extended Supervisor Children

```erlang
Children = [
    %% existing...
    {id, otlp_handler, start, {pulse_otlp_handler, start_link, []}, transient, 5000, worker},
    {id, prom_remote_write, start, {pulse_prom_remote_write, start_link, []}, transient, 5000, worker},
    {id, telemetry_normalize, start, {pulse_telemetry_normalize, start_link, []}, permanent, 5000, worker},
    {id, service_discovery, start, {pulse_service_discovery, start_link, []}, transient, 5000, worker},
    %% optional eBPF
    {id, ebpf_bridge, start, {pulse_ebpf_bridge, start_link, []}, transient, 5000, worker}
].
```

---

## Configuration (New Keys)

```erlang
% pulse_agent_v1 app env
{otel_enabled, true},
{otel_http_port, 8083},              % separate port for OTLP
{prom_remote_write_enabled, true},
{prom_remote_write_port, 8084},
{kafka_topics, #{
    traces => <<"traces">>,
    metrics => <<"metrics">>,
    logs => <<"logs">>,
    profiling => <<"profiling">>
}},
{service_discovery, #{
    enabled => true,
    backends => [kubernetes, consul, dns, static],
    kubernetes => #{namespace => <<"default">>, label_selector => <<"app.kubernetes.io/managed-by=opentelemetry">>},
    static_targets => [{"service-a", "localhost:9090"}, {"service-b", "localhost:9091"}]
}},
{ebpf, #{
    enabled => false,
    tools => [cilium_tetragon, parca],
    tetragon_socket => <<"/var/run/tetragon/tetragon.sock">>
}}
```

---

## Phased Implementation Plan

### Phase 1: Foundation (Week 1-2) ✅ **Start Here**

| Task | Description | Files |
|------|-------------|-------|
| 1.1 | Add OTLP/HTTP endpoints (`/v1/traces`, `/v1/logs`, `/v1/metrics`) | `pulse_otlp_handler.erl`, `pulse_router.erl` |
| 1.2 | Add Prometheus remote-write endpoint (`/api/v1/write`) | `pulse_prom_remote_write.erl` |
| 1.3 | Create normalization layer (OTLP → internal maps) | `pulse_telemetry_normalize.erl` |
| 1.4 | Wire into supervisor, add config keys | `pulse_agent_v1_sup.erl`, `application_env_setup.erl` |
| 1.5 | Unit tests for each endpoint | `test/pulse_otlp_handler_SUITE.erl` |
| 1.6 | Integration test: send OTLP trace → verify Kafka `traces` topic | `test/pulse_otlp_integration_SUITE.erl` |

**Deliverable:** `curl -X POST localhost:8083/v1/traces -d @trace.json` → message in Kafka `traces` topic.

---

### Phase 2: Service Discovery & Scraping (Week 2-3)

| Task | Description | Files |
|------|-------------|-------|
| 2.1 | Implement `pulse_service_discovery` (static + DNS + Consul) | `pulse_service_discovery.erl` |
| 2.2 | Add Prometheus scrape config generator | `pulse_prom_scraper.erl` |
| 2.3 | Integrate with OTel Collector (scrape configs → Collector) | Config generation |
| 2.4 | Health check scheduler for discovered targets | `pulse_health_scheduler.erl` |
| 2.5 | Tests: discover static targets, verify scrape | `test/pulse_service_discovery_SUITE.erl` |

**Deliverable:** Agent discovers 3 static targets, scrapes `/metrics`, forwards to Kafka.

---

### Phase 3: OTel Collector Integration (Week 3-4)

| Task | Description |
|------|-------------|
| 3.1 | Package OTel Collector config as Erlang priv file |
| 3.2 | Add `pulse_otel_collector` supervisor child (managed process) |
| 3.3 | Generate Collector config from `pulse_service_discovery` |
| 3.4 | Collector → Erlang via OTLP/HTTP (Erlang as exporter) |
| 3.5 | Or: Erlang as receiver, Collector as processor/exporter |

**Deliverable:** OTel Collector runs as managed child, receives from services, forwards to Erlang.

---

### Phase 4: Log Pipeline Enhancement (Week 4)

| Task | Description |
|------|-------------|
| 4.1 | Enhance `/v1/logs` with structured parsing (JSON, logfmt, syslog) |
| 4.2 | Add log → metric extraction (error rate, latency p50/p95/p99) |
| 4.3 | Add Loki-compatible labels (service, namespace, pod, level) |
| 4.4 | Batch + compress logs before Kafka send |

---

### Phase 5: Profiling & eBPF (Week 5-6) — *Optional*

| Task | Description |
|------|-------------|
| 5.1 | Add `/v1/profiles` OTLP Profiles endpoint |
| 5.2 | `pulse_ebpf_bridge`: spawn `cilium-tetragon` / `parca` as port program |
| 5.3 | Forward Tetragon events → Kafka `profiling` / `security` topics |
| 5.4 | Parca agent integration for continuous profiling |

---

### Phase 6: Production Hardening (Week 6-7)

| Task | Description |
|------|-------------|
| 6.1 | Backpressure: Kafka producer buffer limits, circuit breaker |
| 6.2 | Retry with exponential backoff for failed Kafka sends |
| 6.3 | Dead letter queue for malformed OTLP/Prometheus payloads |
| 6.4 | Metrics: expose `/metrics` on Erlang (prometheus_exporter) |
| 6.5 | Distributed tracing headers propagation (W3C trace-context) |
| 6.6 | TLS/mTLS for all ingestion endpoints |
| 6.6 | Load testing: 10k spans/s, 100k metrics/s |
| 6.7 | Documentation: runbook, scaling guide, troubleshooting |

---

### Phase 7: Language-Specific Quickstarts (Week 7-8)

| Language | Deliverable |
|----------|-------------|
| Go | `examples/go/main.go` + `Dockerfile` + `otelcol-config.yaml` |
| Python | `examples/python/app.py` + `requirements.txt` + `opentelemetry-instrument` |
| Node.js | `examples/node/app.js` + `package.json` + `@opentelemetry/auto-instrumentations-node` |
| Java | `examples/java/pom.xml` + `opentelemetry-javaagent.jar` |
| Generic | `docker-compose.observability.yml` (agent + collector + Tempo + Loki + Prometheus + Grafana) |

---

## Quickstart for New Language (Template)

```markdown
# Monitor a [Language] Service

## 1. Add OpenTelemetry
```bash
# Go
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp

# Python
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp

# Node.js
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/exporter-collector
```

## 2. Configure Exporter
```yaml
# otelcol-config.yaml
exporters:
  otlphttp:
    endpoint: "http://pulse-agent:8083/v1/traces"
```

## 3. Run
```bash
# Go
OTEL_EXPORTER_OTLP_ENDPOINT=http://pulse-agent:8083 go run main.go

# Python
OTEL_EXPORTER_OTLP_ENDPOINT=http://pulse-agent:8083 opentelemetry-instrument python app.py

# Node.js
OTEL_EXPORTER_OTLP_ENDPOINT=http://pulse-agent:8083 node --require @opentelemetry/auto-instrumentations-node/register app.js
```

## 4. Verify
- Check Kafka `traces` topic
- Open Tempo/Grafana → search traces
```

---

## Dependencies to Add

```erlang
% rebar.config additions
{deps, [
    %% existing...
    {opentelemetry, "1.3.0"},           % OTel Erlang SDK
    {opentelemetry_exporter, "1.3.0"},  % OTLP exporter
    {prometheus_exporter, "1.0.0"},     % Expose /metrics from Erlang
    {protobuffs, "0.12.0"},             % Protobuf for Prometheus remote-write
    {meck, "0.9.0"}                     % Mocking for tests
]}.
```

---

## Monitoring the Monitor (Self-Observability)

| Metric | Alert Threshold |
|--------|-----------------|
| `pulse_agent_kafka_producer_failed_total` | > 10/min |
| `pulse_agent_otlp_request_duration_seconds` | p99 > 5s |
| `pulse_agent_kafka_lag` | > 10000 |
| `pulse_agent_memory_bytes` | > 80% limit |
| `pulse_agent_supervisor_restarts` | > 5/min |

Expose via `:prometheus_exporter` on `localhost:9090/metrics`.

---

## Getting Started (Your Next Step)

```bash
# 1. Add deps to rebar.config
# 2. Create pulse_otlp_handler.erl (start with /v1/traces)
# 3. Add route in pulse_router.erl
# 4. Add supervisor child
# 5. Test: curl -X POST localhost:8083/v1/traces -H "Content-Type: application/json" -d '{"resourceSpans":[]}'
# 6. Verify in Kafka: kafkacat -b localhost:9092 -t traces -C -c 1
```

---

## References

- [OpenTelemetry Specification](https://github.com/open-telemetry/opentelemetry-specification)
- [OTel Collector Config](https://opentelemetry.io/docs/collector/configuration/)
- [Prometheus Remote Write](https://prometheus.io/docs/specs/remote_write_spec/)
- [OTLP Protobuf Definitions](https://github.com/open-telemetry/opentelemetry-proto)
- [Erlang OTel SDK](https://github.com/open-telemetry/opentelemetry-erlang)
- [brod Kafka Client](https://github.com/kafka4beam/brod)