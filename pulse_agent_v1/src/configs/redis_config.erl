%%%-------------------------------------------------------------------
%% @doc Redis configuration helper for future cache/session support.
%% @end
%%%-------------------------------------------------------------------

-module(redis_config).

-export([
    enabled/0,
    host/0,
    port/0,
    database/0,
    connection_options/0
]).

enabled() ->
    application:get_env(pulse_agent_v1, redis_enabled, false).

host() ->
    application:get_env(pulse_agent_v1, redis_host, "localhost").

port() ->
    application:get_env(pulse_agent_v1, redis_port, 6379).

database() ->
    application:get_env(pulse_agent_v1, redis_database, 0).

connection_options() ->
    [
        {host, host()},
        {port, port()},
        {database, database()}
    ].
