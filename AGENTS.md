# AGENTS.md

PulseBoard is a monorepo of four components, each with its own toolchain. Use the root `Makefile` for almost everything; run `make help` to list targets.

## Components

- `backend/` — Go API (chi router, pgxpool). Entry: `backend/cmd/api/main.go`. Domain packages under `internal/` (`auth`, `agents`, `monitors`, `users`, `roles`).
- `pluseboard-monitoring/` — Next.js 16 frontend (App Router). Has its own `AGENTS.md` (Next.js breaking-changes warning) — read it before touching frontend code.
- `pulse_agent/` — Erlang/OTP agent v0 (rebar3 umbrella); the one the root Makefile targets (`AGENT_DIR := pulse_agent`).
- `pulse_agent_v1/` — newer, separate Erlang agent (cowboy HTTP server on :8082 + `pulse-agent` CLI installed via its own `make install`). Distinct from `pulse_agent/` — don't confuse them.

## Commands

- All dev/test/build tasks are make targets: `make run-server`, `make run-agent`, `make run-frontend`, `make test`, `make tidy`, `make build-server`.
- Go version is pinned to exactly `1.26.3`; make targets fail fast on a mismatch.
- Makefile pins `GOCACHE` to `backend/.gocache` to keep Go builds workspace-local (also where `make clean` removes them).
- Backend tests: `make test-server` (`cd backend && go test -v ./...`). Agent: `make test-agent` (eunit), `make test-agent-ct` (common test, suites under `pulse_agent/apps/pulse_agent/test`). Frontend: `make test-frontend` = `npm run lint` (eslint flat config).
- CI (`.github/workflows/go.yml`, backend only) enforces `gofmt -l` clean and `go mod tidy` with no diff — run `make tidy` before committing Go changes.

## Env & database

- `backend/.env` is sourced by the Makefile (provides `DATABASE_URL` for migrate targets). The server starts without a DB connection if `DATABASE_URL` is empty.
- Migrations: goose SQL files in `backend/migrations/`. `make migrate-create name=<x>` then `make migrate-up`. Requires `goose` on PATH.

## Docker compose

- Files are split by purpose: `services.docker.compose.yaml` holds backing services (postgres/redis/rabbitmq) via `make services-up`. The root `docker.compose.yaml` and `dev.docker.compose.yaml` are currently empty stubs; full copies live under `backend/`.

## PR / branch conventions (CI-enforced)

- PRs must target `main`; source branches must match `<prefix>-<type>[/optional-path]-<TicketId>` (prefixes: `backend`, `PM`, `PA_v1`, `gitworkflow`; types: `feature,bug,fixes,setup,hotfix,refactor,docs,chore`).
- PR descriptions must contain non-empty `#### Description of Change`, `#### Checklist` (≥1 bullet), and `#### Release Notes` sections.

## Notes

- `solution` and `solution.cpp` at the repo root are untracked scratch files; ignore them.