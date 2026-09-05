-module(pulse_router).

-export([
    routes/0
]).

routes() ->
    [
        %%% Define the routes for the HTTP server. Each route maps a URL path to a handler module and a resource.
        %% how it works {"path", handler_module, #{resource => resource_name}}
        {"/health", pulse_api_handler, #{resource => health}},
        {"/api/v1/health", pulse_api_handler, #{resource => health}},

        {"/agents", pulse_api_handler, #{resource => agents}},
        {"/api/v1/agents", pulse_api_handler, #{resource => agents}},

        {"/agent/register", pulse_api_handler, #{resource => register_agent}},
        {"/api/v1/agents/register", pulse_api_handler, #{resource => register_agent}},

        {"/agent/heartbeat", pulse_api_handler, #{resource => heartbeat}},
        {"/api/v1/agents/heartbeat", pulse_api_handler, #{resource => heartbeat}},

        {"/agent/logs", pulse_api_handler, #{resource => logs}},
        {"/api/v1/logs", pulse_api_handler, #{resource => logs}},

        %%% OTLP endpoints for telemetry ingestion
        {"/v1/traces", pulse_otlp_handler, #{resource => traces}},
        {"/v1/metrics", pulse_otlp_handler, #{resource => metrics}},
        {"/v1/logs", pulse_otlp_handler, #{resource => logs}},
        {"/v1/profiles", pulse_otlp_handler, #{resource => profiles}},

        %%% Prometheus Remote Write endpoint
        {"/api/v1/write", pulse_prom_remote_write, #{resource => write}}
    ].
