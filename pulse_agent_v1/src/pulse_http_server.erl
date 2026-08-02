%%%-------------------------------------------------------------------
%% @doc Supervised Cowboy listener.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_http_server).

-behaviour(gen_server).

-include_lib("kernel/include/logger.hrl").

-export([
    start_link/0
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

-record(state, {
    listener,
    port
}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

init([]) ->
    Port = application:get_env(pulse_agent_v1, http_port, 8082),
    ?LOG_INFO("Starting HTTP listener on port ~p", [Port]),
    io:format("Starting HTTP listener on port ~p~n", [Port]),
    Dispatch = cowboy_router:compile([
        {'_', pulse_router:routes()}
    ]),
    case
        cowboy:start_clear(
            pulse_http_listener,
            [{port, Port}],
            #{env => #{dispatch => Dispatch}}
        )
    of
        {ok, _Pid} ->
            ?LOG_INFO("HTTP listener started on port ~p", [Port]),
            {ok, #state{listener = pulse_http_listener, port = Port}};
        Error ->
            ?LOG_ERROR("HTTP listener failed to start"),
            {stop, Error}
    end.

handle_call(_Request, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, #state{listener = Listener}) ->
    ?LOG_INFO("Stopping HTTP listener"),
    try cowboy:stop_listener(Listener) of
        _ -> ok
    catch
        _:Reason ->
            ?LOG_WARNING("HTTP listener shutdown failed: ~p", [Reason]),
            ok
    end,
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
