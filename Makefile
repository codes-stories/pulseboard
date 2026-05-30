# Pulseboard project tasks.
# Run `make help` to see the available commands.

SHELL := /bin/bash
.DEFAULT_GOAL := help

BACKEND_DIR := backend
FRONTEND_DIR := frontend
AGENT_DIR := pulse_agent
MIGRATIONS_DIR := $(BACKEND_DIR)/migrations
BACKEND_ENV := $(BACKEND_DIR)/.env

# Keep Go build/cache files inside the workspace so sandboxed runs and local
# cleanup are predictable.
GOCACHE ?= $(CURDIR)/$(BACKEND_DIR)/.gocache

# Docker compose files are split by purpose:
# - docker.compose.yaml: base application services
# - services.docker.compose.yaml: backing services such as Postgres/Redis/RabbitMQ
# - dev.docker.compose.yaml: development overrides
COMPOSE := docker compose
COMPOSE_BASE := -f docker.compose.yaml
COMPOSE_SERVICES := -f services.docker.compose.yaml
COMPOSE_DEV := -f docker.compose.yaml -f services.docker.compose.yaml -f dev.docker.compose.yaml

# Load backend environment values for tasks such as database migrations.
ifneq (,$(wildcard $(BACKEND_ENV)))
include $(BACKEND_ENV)
export
endif

.PHONY: help
help: ## Show this help message.
	@awk 'BEGIN {FS = ":.*##"; printf "\nPulseboard commands:\n"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  %-22s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: run-server
run-server: ## Start the Go API server from backend/cmd/api.
	cd $(BACKEND_DIR) && GOCACHE=$(GOCACHE) go run ./cmd/api

.PHONY: run-agent
run-agent: ## Compile and start the Erlang pulse agent shell.
	cd $(AGENT_DIR) && rebar3 compile && rebar3 shell

.PHONY: run-frontend
run-frontend: ## Start the frontend dev server when the frontend directory exists.
	@if [ ! -d "$(FRONTEND_DIR)" ]; then \
		echo "frontend directory not found: $(FRONTEND_DIR)"; \
		exit 1; \
	fi
	cd $(FRONTEND_DIR) && npm run dev

.PHONY: test-server
test-server: ## Run all Go backend tests.
	cd $(BACKEND_DIR) && GOCACHE=$(GOCACHE) go test -v ./...

.PHONY: test-agent
test-agent: ## Run Erlang unit tests for the pulse agent.
	cd $(AGENT_DIR) && rebar3 eunit

.PHONY: test-frontend
test-frontend: ## Run frontend tests when the frontend directory exists.
	@if [ ! -d "$(FRONTEND_DIR)" ]; then \
		echo "frontend directory not found: $(FRONTEND_DIR)"; \
		exit 1; \
	fi
	cd $(FRONTEND_DIR) && npm run test

.PHONY: test
test: test-server test-agent ## Run backend and agent tests.

.PHONY: tidy
tidy: ## Format Go files and tidy backend module dependencies.
	cd $(BACKEND_DIR) && gofmt -w ./cmd ./internal && go mod tidy

.PHONY: build-server
build-server: ## Compile the Go API binary into backend/bin/api.
	cd $(BACKEND_DIR) && GOCACHE=$(GOCACHE) go build -o bin/api ./cmd/api

.PHONY: clean-server
clean-server: ## Remove Go build outputs and local Go cache for the backend.
	cd $(BACKEND_DIR) && GOCACHE=$(GOCACHE) go clean
	rm -rf $(BACKEND_DIR)/bin $(GOCACHE)

.PHONY: clean-agent
clean-agent: ## Remove Erlang build artifacts for the pulse agent.
	cd $(AGENT_DIR) && rebar3 clean

.PHONY: clean-frontend
clean-frontend: ## Run frontend cleanup when the frontend directory exists.
	@if [ ! -d "$(FRONTEND_DIR)" ]; then \
		echo "frontend directory not found: $(FRONTEND_DIR)"; \
		exit 1; \
	fi
	cd $(FRONTEND_DIR) && npm run clean

.PHONY: clean
clean: clean-server clean-agent ## Clean backend and agent build artifacts.

.PHONY: migrate-up
migrate-up: ## Apply all pending database migrations with goose.
	goose -dir $(MIGRATIONS_DIR) postgres "$(DATABASE_URL)" up

.PHONY: migrate-down
migrate-down: ## Roll back the latest database migration with goose.
	goose -dir $(MIGRATIONS_DIR) postgres "$(DATABASE_URL)" down

.PHONY: migrate-status
migrate-status: ## Show the current database migration status.
	goose -dir $(MIGRATIONS_DIR) postgres "$(DATABASE_URL)" status

.PHONY: migrate-create
migrate-create: ## Create a new SQL migration: make migrate-create name=create_users.
	@if [ -z "$(name)" ]; then \
		echo "usage: make migrate-create name=create_users"; \
		exit 1; \
	fi
	mkdir -p $(MIGRATIONS_DIR)
	goose -dir $(MIGRATIONS_DIR) create $(name) sql

.PHONY: services-up
services-up: ## Start backing services from services.docker.compose.yaml.
	$(COMPOSE) $(COMPOSE_SERVICES) up -d

.PHONY: services-down
services-down: ## Stop backing services from services.docker.compose.yaml.
	$(COMPOSE) $(COMPOSE_SERVICES) down

.PHONY: dev-up
dev-up: ## Start the full development Docker stack with dev overrides.
	$(COMPOSE) $(COMPOSE_DEV) up --build

.PHONY: dev-down
dev-down: ## Stop the full development Docker stack.
	$(COMPOSE) $(COMPOSE_DEV) down

.PHONY: dev-logs
dev-logs: ## Follow logs for the full development Docker stack.
	$(COMPOSE) $(COMPOSE_DEV) logs -f

.PHONY: compose-up
compose-up: ## Start the base Docker compose stack.
	$(COMPOSE) $(COMPOSE_BASE) up --build -d

.PHONY: compose-down
compose-down: ## Stop the base Docker compose stack.
	$(COMPOSE) $(COMPOSE_BASE) down

.PHONY: compose-ps
compose-ps: ## Show containers from the base Docker compose stack.
	$(COMPOSE) $(COMPOSE_BASE) ps

# Backward-compatible aliases for the original target names.
.PHONY: Run-Agent Run-Server Run-Migrations Run-Frontend
Run-Agent: run-agent ## Alias for run-agent.
Run-Server: run-server ## Alias for run-server.
Run-Migrations: migrate-up ## Alias for migrate-up.
Run-Frontend: run-frontend ## Alias for run-frontend.

.PHONY: run-test-server run-test-agent run-test-frontend
run-test-server: test-server ## Alias for test-server.
run-test-agent: test-agent ## Alias for test-agent.
run-test-frontend: test-frontend ## Alias for test-frontend.
