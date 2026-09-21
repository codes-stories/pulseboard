%%%-------------------------------------------------------------------
%% @doc Backend log pusher.
%% Sends ingested OTLP logs to the Go backend's agent log API.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_backend_log_pusher).

-export([
    push_logs/1,
    push_log/2
]).

-define(TIMEOUT_MS, 5000).

%% @doc Push a batch of normalized log entries to the Go backend.
-spec push_logs(list(map())) -> ok | {error, term()}.
push_logs(Logs) when is_list(Logs) ->
    ApiKey = get_env_opt(backend_api_key),
    BackendUrl = get_env(backend_api_url, "http://localhost:8080"),
    lists:foreach(fun(Log) -> push_single_log(BackendUrl, ApiKey, Log) end, Logs),
    ok.

%% @doc Push a single log entry to the Go backend.
-spec push_log(string(), map()) -> ok | {error, term()}.
push_log(BackendUrl, Log) ->
    ApiKey = get_env_opt(backend_api_key),
    push_single_log(BackendUrl, ApiKey, Log).

push_single_log(BackendUrl, ApiKey, Log) ->
    Url = BackendUrl ++ "/api/v1/agent/logs",
    Level = maps:get(<<"level">>, Log, maps:get(level, Log, <<"info">>)),
    Message = maps:get(<<"message">>, Log, maps:get(message, Log, <<>>)),
    Context = maps:get(<<"attributes">>, Log, maps:get(context, Log, #{})),

    Payload = jiffy:encode(#{
        <<"level">> => to_binary(Level),
        <<"message">> => to_binary(Message),
        <<"context">> => ensure_map(Context)
    }),

    Headers = build_headers(ApiKey),
    case httpc:request(post, {Url, Headers, "application/json", Payload},
                       [{timeout, ?TIMEOUT_MS}], [{sync, true}]) of
        {ok, {{_, Status, _}, _, _}} when Status >= 200, Status < 300 ->
            ok;
        {ok, {{_, Status, _}, _, Body}} ->
            lager:warning("Backend log push failed: HTTP ~p: ~s", [Status, Body]),
            {error, {http_error, Status}};
        {error, Reason} ->
            lager:warning("Backend log push error: ~p", [Reason]),
            {error, Reason}
    end.

build_headers(undefined) ->
    [{"accept", "application/json"}, {"content-type", "application/json"}];
build_headers(ApiKey) ->
    [{"accept", "application/json"}, {"content-type", "application/json"},
     {"authorization", "Bearer " ++ ApiKey}].

to_binary(Bin) when is_binary(Bin) -> Bin;
to_binary(List) when is_list(List) -> list_to_binary(List);
to_binary(Atom) when is_atom(Atom) -> atom_to_binary(Atom, utf8);
to_binary(Int) when is_integer(Int) -> integer_to_binary(Int);
to_binary(Float) when is_float(Float) -> float_to_binary(Float, [{decimals, 2}]);
to_binary(_) -> <<>>.

ensure_map(Map) when is_map(Map) -> Map;
ensure_map(_) -> #{}.

get_env(Key, Default) ->
    case application:get_env(pulse_agent_v1, Key) of
        {ok, Val} -> Val;
        _ -> case os:getenv(env_var(Key)) of
            false -> Default;
            Val -> Val
        end
    end.

get_env_opt(Key) ->
    case application:get_env(pulse_agent_v1, Key) of
        {ok, Val} -> Val;
        _ -> case os:getenv(env_var(Key)) of
            false -> undefined;
            Val -> Val
        end
    end.

env_var(Key) ->
    "PULSE_" ++ string:to_upper(atom_to_list(Key)).
