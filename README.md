# PulseBoard

<p align="center">
  <a href="https://github.com/gauravkrrr/pulseboard">
    <img src="https://img.shields.io/github/license/gauravkrrr/pulseboard?style=for-the-badge" alt="License">
  </a>
  <a href="https://github.com/gauravkrrr/pulseboard/actions/workflows/go.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/gauravkrrr/pulseboard/go.yml?branch=main&style=for-the-badge" alt="Go Backend CI">
  </a>
  <a href="https://goreportcard.com/report/github.com/gauravkrrr/pulseboard">
    <img src="https://goreportcard.com/badge/github.com/gauravkrrr/pulseboard?style=for-the-badge" alt="Go Report Card">
  </a>
</p>

Welcome to PulseBoard! This project is a backend service designed to provide real-time monitoring and analytics. It features a robust authentication system, database integration, and a flexible middleware architecture.

## System Design

The PulseBoard system is composed of several key components that work together to deliver a reliable and scalable service.

### Components

*   **Backend API (Go):** The core of the application, written in Go. It handles all incoming API requests, business logic, and communication with the database. It uses the `chi` router for high-performance routing and a modular structure.
*   **PostgreSQL Database:** The primary data store for the application. It stores user data, session information, and other application-specific data.
*   **Pulse Agent (Erlang/OTP):** A lightweight and highly concurrent agent written in Erlang. It's designed to run on client systems to collect and forward metrics to the Backend API.
*   **Frontend Application:** A web-based user interface (inferred from CORS settings) that interacts with the Backend API to display data and manage the system.
*   **Reverse Proxy / Load Balancer:** An optional but recommended component for production environments to handle SSL termination, load balancing, and correctly identify client IP addresses.

### Architecture Diagram

Here is a high-level diagram illustrating the system architecture and the flow of requests.

```mermaid
graph TD
    subgraph "Client Layer"
        User[<i class='fa fa-user'></i> User] --> FE[Frontend App<br>(localhost:3000)];
        Agent[Pulse Agent];
    end

    subgraph "Infrastructure"
        Proxy[Reverse Proxy / Load Balancer];
    end

    subgraph "Backend Service (Go)"
        Router[chi Router];
        subgraph "Middleware Chain"
            direction LR
            RealIP[RealIP] --> Logger --> Recoverer --> CORS --> IPBlock;
        end
        AuthN[Auth Module<br>(JWT, Handlers)];
        DB[Database Pool<br>(pgxpool)];
    end

    subgraph "Data Store"
        Postgres[(PostgreSQL DB)];
    end

    %% Connections
    FE --> Proxy;
    Agent --> Proxy;
    Proxy --> Router;
    Router --> RealIP;
    IPBlock --> AuthN;
    AuthN --> DB;
    DB --> Postgres;

    style User fill:#f9f,stroke:#333,stroke-width:2px
    style Agent fill:#ccf,stroke:#333,stroke-width:2px
```

### Request Workflow

1.  **Request Initiation:** A client (either the Frontend App or a Pulse Agent) sends an HTTP request to the service.
2.  **Proxy Layer:** The request is first received by the Reverse Proxy. The proxy adds the `X-Forwarded-For` header (containing the client's real IP) and forwards the request to the Go backend.
3.  **Middleware Chain:** The `chi` router receives the request and passes it through a series of middleware:
    *   `RealIP`: Identifies the true client IP address from the request headers.
    *   `Logger`: Logs the details of the incoming request.
    *   `Recoverer`: Catches any panics and prevents the server from crashing.
    *   `CORS`: Handles Cross-Origin Resource Sharing to allow requests from the frontend.
    *   `IPBlockMiddleware`: Checks if the client's IP is in the blocklist and denies access if it is.
4.  **Routing & Logic:** If the request passes through the middleware, it is dispatched to the appropriate handler (e.g., the `auth` module).
5.  **Database Interaction:** The handler executes business logic, which may involve querying the PostgreSQL database via the `pgxpool` connection pool.
6.  **Response:** The handler generates a response (e.g., JSON data or an HTTP status code) and sends it back to the client.

## Getting Started
This section will guide you through setting up the project for local development.

### Prerequisites

Before you begin, ensure you have the following tools installed:

*   **Go:** Version `1.26.3` (as specified in `backend/go.mod`).
*   **Erlang/OTP:** Version `24.0` (for the Pulse Agent).
*   **Node.js & npm:** For running the frontend application.
*   PostgreSQL
*   **Docker & Docker Compose:** For running backing services like Postgres.
*   **Make:** To use the convenient commands defined in the `Makefile`.
*   **goose:** For managing database migrations.

### Project Structure
The repository is organized into three main components:
```
├── backend/       # Go API server, database migrations, and core business logic.
├── frontend/      # Frontend application code (React/Vue/etc.).
└── pulse_agent/   # Erlang/OTP agent for data collection.
```
### Installation & Running

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd pulseboard
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file in the `backend/` directory or export the following environment variables:
    ```sh
    export PORT="8080"
    export DATABASE_URL="postgres://user:password@localhost:5432/pulsedb"
    export JWT_SECRET="your-strong-jwt-secret"
    export CORS_ALLOWED_ORIGIN="http://localhost:3000"
    ```

3.  **Start Backing Services:**
    Use Docker Compose to start the PostgreSQL database.
    ```sh
    make services-up
    ```

4.  **Run Database Migrations:**
    Apply the latest database schema.
    ```sh
    make migrate-up
    ```

5.  **Run the Applications:**
    You can run each part of the project in a separate terminal.
    *   **Backend API:** `make run-server`
    *   **Pulse Agent:** `make run-agent`
    *   **Frontend:** `make run-frontend`

## Development Workflow with Make

The `Makefile` at the root of the project provides a set of commands to streamline common development tasks. Run `make help` to see all available commands.

### Key Makefile Commands

| Command | Description |
| :--- | :--- |
| `make dev-up` | Starts the complete development environment using Docker Compose. |
| `make run-server` | Starts the Go backend API server locally. |
| `make run-agent` | Compiles and starts the Erlang Pulse Agent shell. |
| `make run-frontend` | Starts the frontend development server. |
| `make test` | Runs all backend and agent tests. |
| `make tidy` | Formats Go code and tidies module dependencies. |
| `make build-server` | Compiles the Go API into a binary at `backend/bin/api`. |
| `make migrate-up` | Applies all pending database migrations. |
| `make migrate-down` | Rolls back the most recent database migration. |
| `make clean` | Removes all build artifacts for the backend and agent. |

---
*This README was generated by Gemini Code Assist.*