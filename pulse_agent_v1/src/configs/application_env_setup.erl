%%%-------------------------------------------------------------------
%% @doc Centralized application environment bootstrap.
%% @end
%%
%% Keep default runtime settings here so the application callback remains
%% small and future infrastructure changes stay isolated from request code.
%%%-------------------------------------------------------------------

-module(application_env_setup).

-export([
    setup/0,
    ensure_defaults/0,
    configure_http/0,
    configure_postgres/0,
    configure_redis/0,
    configure_kafka/0,
    configure_backend_sync/0,
    configure_otlp/0
]).

%% @doc Apply the full default environment set.
setup() ->
    ensure_defaults(),
    ok.

%% @doc Populate defaults only when the caller has not already provided them.
%% This lets releases and deployment tooling override settings without code
%% changes while keeping local boot behavior predictable.
ensure_defaults() ->
    configure_http(),
    configure_postgres(),
    configure_redis(),
    configure_kafka(),
    configure_backend_sync(),
    configure_otlp(),
    ok.

%% @doc Default the HTTP listener to the port used by the current setup.
configure_http() ->
    ensure_env(http_port, 8082).

%% @doc Keep PostgreSQL settings explicit and overrideable from the process
%% environment.
%%
%% This lets a Docker-based PostgreSQL container drive the runtime values
%% without changing application code, while still keeping safe defaults for
%% local development.
configure_postgres() ->
    ensure_env(postgres_enabled, false),
    ensure_env(postgres_host, "localhost"),
    ensure_env(postgres_port, 5432),
    ensure_env(postgres_database, "pulse_agent_v1"),
    ensure_env(postgres_username, "myuser"),
    ensure_env(postgres_password, "mypassword").

%% @doc Keep Redis settings explicit even while the cache layer is disabled.
%% This keeps the environment contract stable when a cache/session adapter is
%% added later.
configure_redis() ->
    ensure_env(redis_enabled, false),
    ensure_env(redis_host, "localhost"),
    ensure_env(redis_port, 6379),
    ensure_env(redis_database, 0).

%% @doc Kafka configuration for log streaming.
configure_kafka() ->
    ensure_env(kafka_enabled, false),
    ensure_env(kafka_brokers, "localhost:9092"),
    ensure_env(kafka_client_id, "pulse_agent_v1"),
    ensure_env(kafka_topic, "api-logs"),
    ensure_env(kafka_acks, "all"),
    ensure_env(kafka_batch_size, 16384),
    ensure_env(kafka_linger_ms, 5),
    ensure_env(kafka_compression, "none").

%% @doc Backend sync configuration for fetching API logs.
configure_backend_sync() ->
    ensure_env(backend_api_url, "http://localhost:8080"),
    ensure_env(backend_sync_enabled, false),
    ensure_env(backend_sync_interval_ms, 30000),
    ensure_env(backend_sync_batch_size, 100),
    ensure_env(backend_api_key, "").

%% @doc OTLP configuration for telemetry ingestion.
configure_otlp() ->
    ensure_env(otel_enabled, true),
    ensure_env(otel_http_port, 8083),
    ensure_env(otel_protobuf_enabled, false).

ensure_env(Key, Default) ->
    case application:get_env(pulse_agent_v1, Key) of
        undefined ->
            Value = env_override(Key, Default),
            application:set_env(pulse_agent_v1, Key, Value);
        _ ->
            ok
    end.

env_override(Key, Default) ->
    case os:getenv(env_var_name(Key)) of
        false -> Default;
        Value -> convert_env_value(Default, Value)
    end.

env_var_name(Key) ->
    string:to_upper(atom_to_list(Key)).

convert_env_value(Default, Value) when is_integer(Default) ->
    list_to_integer(Value);
convert_env_value(Default, Value) when is_boolean(Default) ->
    case string:to_lower(Value) of
        "true" -> true;
        "1" -> true;
        "yes" -> true;
        _ -> false
    end;
convert_env_value(_Default, Value) ->
    Value.
