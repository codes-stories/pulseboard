%%%-------------------------------------------------------------------
%% @doc pulse_agent_v1 public API
%% @end
%%%-------------------------------------------------------------------

-module(pulse_agent_v1_app).

-behaviour(application).

-export([start/2, stop/1]).

start(_StartType, _StartArgs) ->
    ok = application_env_setup:setup(),
    {ok, _} = application:ensure_all_started(cowboy),
    {ok, _} = application:ensure_all_started(epgsql),
    {ok, _} = application:ensure_all_started(lager),
    {ok, _} = application:ensure_all_started(brod),
    pulse_agent_v1_sup:start_link().

stop(_State) ->
    ok.

%% internal functions
