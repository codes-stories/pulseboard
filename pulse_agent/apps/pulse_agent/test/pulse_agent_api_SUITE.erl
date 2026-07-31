%%%-------------------------------------------------------------------
%% @doc Common Test smoke coverage for the agent's local status API.
%%%-------------------------------------------------------------------

-module(pulse_agent_api_SUITE).

-include_lib("common_test/include/ct.hrl").

-export([all/0, init_per_suite/1, end_per_suite/1]).
-export([status_has_expected_defaults/1, invalid_connect_options_are_rejected/1]).

all() ->
    [status_has_expected_defaults, invalid_connect_options_are_rejected].

init_per_suite(Config) ->
    {ok, _} = application:ensure_all_started(pulse_agent),
    Config.

end_per_suite(_Config) ->
    ok = application:stop(pulse_agent),
    ok.

status_has_expected_defaults(_Config) ->
    Status = pulse_agent_api:status(),
    false = maps:get(connected, Status),
    undefined = maps:get(connection, Status),
    undefined = maps:get(last_error, Status),
    ok.

invalid_connect_options_are_rejected(_Config) ->
    {error, badarg} = pulse_agent_api:connect(not_a_map),
    ok.
