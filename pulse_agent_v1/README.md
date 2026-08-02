pulse_agent_v1
=====

An OTP application

Architecture
------------

The current setup is split into a supervised HTTP server, a thin API handler, a small service layer, and an ETS-backed store. That keeps the live API simple now while leaving room to swap the store for PostgreSQL, Redis, or another adapter later without rewriting the request layer.

Build
-----

    $ rebar3 compile

Run
---

    $ rebar3 shell

Direct CLI
----------

    $ make install
    $ pulse-agent login --token <TOKEN>
    $ pulse-agent login --api-key <API_KEY>
    $ pulse-agent status
    $ pulse-agent logout

If you want login to require the agent server, set:

    $ export PULSE_AGENT_API_URL=http://localhost:8082

When that variable is present, the CLI checks the server health endpoint before saving the credential.

API
---

Health:

    GET /health
    GET /api/v1/health

Register an agent:

    POST /api/v1/agents/register
    body: agent_id=agent-1&name=worker-1&version=1.0.0

Heartbeat:

    POST /api/v1/agents/heartbeat
    body: agent_id=agent-1&status=active

Logs:

    POST /api/v1/logs
    body: agent_id=agent-1&level=info&message=started

    GET /api/v1/logs

Agents:

    GET /api/v1/agents
