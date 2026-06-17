%%%-------------------------------------------------------------------
%% @doc pulse_agent connection API.
%%
%% This module establishes and tracks a backend connection for the agent.
%% The backend endpoint is intentionally simple so the Go service can
%% implement the matching handler later.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_agent_api).

-behaviour(gen_server).

-export([start_link/0]).
-export([connect/0, connect/1, disconnect/0, status/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

-define(SERVER, ?MODULE).
-define(DEFAULT_BACKEND_URL, "http://127.0.0.1:8080").
-define(DEFAULT_CONNECT_PATH, "/api/agent/connect").
-define(DEFAULT_DISCONNECT_PATH, "/api/agent/disconnect").
-define(DEFAULT_TIMEOUT, 5000).

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
    {ok, #{connected => false, connection => undefined, last_error => undefined}}.

handle_call({connect, Options}, _From, State) ->
    case establish_connection(Options) of
        {ok, Connection} ->
            NewState = State#{connected => true, connection => Connection, last_error => undefined},
            {reply, {ok, Connection}, NewState};
        {error, Reason} ->
            NewState = State#{connected => false, connection => undefined, last_error => Reason},
            {reply, {error, Reason}, NewState}
    end;
handle_call(disconnect, _From, State) ->
    case maps:get(connected, State, false) of
        true ->
            maybe_notify_disconnect(State),
            {reply, {ok, disconnected}, State#{connected => false, connection => undefined}};
        false ->
            {reply, {ok, not_connected}, State}
    end;
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

ensure_http_apps_started() ->
    _ = application:ensure_all_started(inets),
    _ = application:ensure_all_started(ssl),
    ok.

establish_connection(Options) ->
    ensure_http_apps_started(),
    BackendUrl = option(backend_url, Options, config(backend_url, ?DEFAULT_BACKEND_URL)),
    ConnectPath = option(connect_path, Options, config(connect_path, ?DEFAULT_CONNECT_PATH)),
    AgentId = option(agent_id, Options, default_agent_id()),
    Timeout = option(timeout, Options, config(request_timeout, ?DEFAULT_TIMEOUT)),
    Metadata = option(metadata, Options, #{}),
    RequestUrl = join_url(BackendUrl, ConnectPath),
    Payload = encode_payload([{agent_id, AgentId}, {node, node()}, {hostname, hostname()}, {metadata, format_metadata(Metadata)}, {timestamp, integer_to_list(erlang:system_time(second))}]),
    Headers = [{"content-type", "application/x-www-form-urlencoded"}],
    case httpc:request(post, {RequestUrl, Headers, "application/x-www-form-urlencoded", Payload}, [{timeout, Timeout}], []) of
        {ok, {{_, StatusCode, _}, RespHeaders, RespBody}} when StatusCode >= 200, StatusCode < 300 ->
            {ok, #{connected => true, backend_url => BackendUrl, connect_url => RequestUrl, agent_id => AgentId, timeout => Timeout, response_code => StatusCode, response_headers => RespHeaders, response_body => RespBody, connected_at => erlang:system_time(second)}};
        {ok, {{_, StatusCode, ReasonPhrase}, RespHeaders, RespBody}} ->
            {error, #{reason => backend_rejected, status_code => StatusCode, status_text => ReasonPhrase, response_headers => RespHeaders, response_body => RespBody}};
        {error, Reason} ->
            {error, Reason}
    end.

maybe_notify_disconnect(State) ->
    BackendUrl = maps:get(backend_url, State, config(backend_url, ?DEFAULT_BACKEND_URL)),
    DisconnectPath = config(disconnect_path, ?DEFAULT_DISCONNECT_PATH),
    RequestUrl = join_url(BackendUrl, DisconnectPath),
    Headers = [{"content-type", "application/x-www-form-urlencoded"}],
    _ = httpc:request(post, {RequestUrl, Headers, "application/x-www-form-urlencoded", encode_payload([{agent_id, maps:get(agent_id, State, default_agent_id())}])}, [{timeout, config(request_timeout, ?DEFAULT_TIMEOUT)}], []),
    ok.

config(Key, Default) ->
    case application:get_env(pulse_agent, Key) of
        {ok, Value} -> Value;
        undefined -> Default
    end.

option(Key, Options, Default) ->
    maps:get(Key, Options, Default).

default_agent_id() ->
    case inet:gethostname() of
        {ok, Hostname} ->
            lists:flatten([atom_to_list(node()), "@", Hostname]);
        {error, _} ->
            atom_to_list(node())
    end.

hostname() ->
    case inet:gethostname() of
        {ok, Hostname} -> Hostname;
        {error, _} -> "unknown"
    end.

join_url(BaseUrl, Path) ->
    Base = trim_trailing_slash(BaseUrl),
    case Path of
        [] -> Base;
        [$/ | _] -> Base ++ Path;
        _ -> Base ++ "/" ++ Path
    end.

trim_trailing_slash(Url) when is_list(Url) ->
    case lists:reverse(Url) of
        [$/ | Rest] -> lists:reverse(Rest);
        _ -> Url
    end;
trim_trailing_slash(Url) ->
    Url.

encode_payload(Pairs) ->
    lists:join("&", [encode_pair(Key, Value) || {Key, Value} <- Pairs]).

encode_pair(Key, Value) ->
    EncodedKey = uri_string:quote(atom_to_list(Key)),
    EncodedValue = uri_string:quote(value_to_string(Value)),
    lists:flatten([EncodedKey, "=", EncodedValue]).

value_to_string(Value) when is_list(Value) ->
    Value;
value_to_string(Value) when is_binary(Value) ->
    binary_to_list(Value);
value_to_string(Value) when is_atom(Value) ->
    atom_to_list(Value);
value_to_string(Value) when is_integer(Value) ->
    integer_to_list(Value);
value_to_string(Value) when is_float(Value) ->
    lists:flatten(io_lib:format("~p", [Value]));
value_to_string(Value) ->
    lists:flatten(io_lib:format("~p", [Value])).

format_metadata(Metadata) when is_map(Metadata) ->
    case maps:to_list(Metadata) of
        [] -> "";
        Pairs ->
            lists:join(";", [lists:flatten([value_to_string(Key), "=", value_to_string(Value)]) || {Key, Value} <- Pairs])
    end;
format_metadata(Metadata) ->
    value_to_string(Metadata).