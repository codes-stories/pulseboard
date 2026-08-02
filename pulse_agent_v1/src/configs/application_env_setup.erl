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
    configure_redis/0
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
    ensure_env(postgres_enabled, true),
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
