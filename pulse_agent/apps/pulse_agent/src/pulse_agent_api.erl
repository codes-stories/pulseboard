%%%-------------------------------------------------------------------
%% @doc pulse_agent connection API.
%%
%% This module exposes a small Erlang API for connecting to and managing
%% the local agent connection state.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_agent_api).

-behaviour(gen_server).

-export([start_link/0]).
-export([connect/0, connect/1, disconnect/0, status/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

-define(SERVER, ?MODULE).

start_link() ->
    gen_server:start_link({local, ?SERVER}, ?MODULE, [], []).

connect() ->
    connect(#{}).

connect(Options) when is_map(Options) ->
    gen_server:call(?SERVER, {connect, Options});
connect(_) ->
    {error, badarg}.

disconnect() ->
    gen_server:call(?SERVER, disconnect).

status() ->
    gen_server:call(?SERVER, status).

init([]) ->
    {ok, #{connected => false, connection => undefined}}.

handle_call({connect, Options}, _From, State) ->
    Connection = #{
        connected => true,
        options => Options
    },
    {reply, {ok, Connection}, State#{connected => true, connection => Connection}};
handle_call(disconnect, _From, State) ->
    {reply, {ok, disconnected}, State#{connected => false, connection => undefined}};
handle_call(status, _From, State) ->
    {reply, State, State};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.