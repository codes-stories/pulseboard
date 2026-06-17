%%%-------------------------------------------------------------------
%% @doc pulse_agent public API
%% @end
%%%-------------------------------------------------------------------

-module(pulse_agent_app).

-behaviour(application).

-export([start/2, stop/1]).

start(_StartType, _StartArgs) ->
    pulse_agent_sup:start_link().

stop(_State) ->
    ok.

%% internal functions
