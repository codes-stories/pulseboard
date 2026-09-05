%%%-------------------------------------------------------------------
%% @doc Backend API log synchronization.
%% Polls the backend API for logs and publishes them to Kafka.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_backend_sync).

-behaviour(gen_server).

-export([
    start_link/0,
    sync_once/0,
    sync_loop/0,
    stop_sync/0,
    status/0
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

-define(SYNC_INTERVAL_MS, 30000).
-define(DEFAULT_BATCH_SIZE, 100).
-define(MAX_RETRIES, 3).
-define(RETRY_BACKOFF_MS, 5000).

-record(metrics, {
    sync_count = 0,
    logs_fetched = 0,
    logs_published = 0,
    errors = 0,
    last_sync = undefined,
    last_error = undefined,
    sync_interval = 30000
}).

-record(state, {
    running = false,
    timer_ref = undefined,
    backend_url = <<"http://localhost:8080">>,
    api_key = undefined,
    batch_size = ?DEFAULT_BATCH_SIZE,
    last_cursor = undefined,
    metrics = #metrics{}
}).

%% @doc Start the backend sync worker.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Perform a single sync operation.
sync_once() ->
    gen_server:call(?MODULE, sync_once, 60000).

%% @doc Start periodic sync loop.
sync_loop() ->
    gen_server:cast(?MODULE, start_sync).

%% @doc Stop periodic sync loop.
stop_sync() ->
    gen_server:cast(?MODULE, stop_sync).

%% @doc Get sync status.
status() ->
    gen_server:call(?MODULE, status, 5000).

%% @doc Initialize the sync worker.
init([]) ->
    BackendUrl = get_env(backend_api_url, "http://localhost:8080"),
    ApiKey = get_env_opt(backend_api_key),
    BatchSize = get_env_int(backend_sync_batch_size, ?DEFAULT_BATCH_SIZE),
    IntervalMs = get_env_int(backend_sync_interval_ms, ?SYNC_INTERVAL_MS),
    {ok, #state{
        backend_url = BackendUrl,
        api_key = ApiKey,
        batch_size = BatchSize,
        metrics = #metrics{sync_interval = IntervalMs}
    }}.

%% @doc Handle synchronous calls.
handle_call(sync_once, _From, State) ->
    case perform_sync(State) of
        {ok, NewState} ->
            {reply, {ok, NewState#state.metrics}, NewState};
        {error, Reason} ->
            {reply, {error, Reason}, State}
    end;

handle_call(status, _From, State) ->
    {reply, State#state.metrics, State};

handle_call(_Request, _From, State) ->
    {reply, {error, unsupported_request}, State}.

%% @doc Handle asynchronous casts.
handle_cast(start_sync, State) ->
    case State#state.running of
        true ->
            {noreply, State};
        false ->
            TimerRef = erlang:send_after(0, self(), sync_tick),
            {noreply, State#state{running = true, timer_ref = TimerRef}}
    end;

handle_cast(stop_sync, State) ->
    case State#state.timer_ref of
        undefined -> {noreply, State};
        TimerRef ->
            erlang:cancel_timer(TimerRef),
            {noreply, State#state{running = false, timer_ref = undefined}}
    end;

handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle timer tick for periodic sync.
handle_info(sync_tick, State) ->
    case perform_sync(State) of
        {ok, NewState} ->
            Interval = NewState#state.metrics#metrics.sync_interval,
            TimerRef = erlang:send_after(Interval, self(), sync_tick),
            {noreply, NewState#state{timer_ref = TimerRef}};
        {error, _Reason} = Error ->
            Interval = State#state.metrics#metrics.sync_interval,
            TimerRef = erlang:send_after(Interval, self(), sync_tick),
            {noreply, State#state{timer_ref = TimerRef}}
    end;

handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Perform the actual sync operation.
perform_sync(State) ->
    StartTime = erlang:system_time(millisecond),
    case fetch_logs(State) of
        {ok, Logs, NewCursor} ->
            case publish_logs(Logs) of
                ok ->
                    Duration = erlang:system_time(millisecond) - StartTime,
                    NewMetrics = update_metrics(State#state.metrics, ok, length(Logs), StartTime),
                    pulse_logger:log_backend_sync(sync, length(Logs), Duration, #{}),
                    {ok, State#state{last_cursor = NewCursor, metrics = NewMetrics}};
                {error, Reason} ->
                    handle_sync_error(State, StartTime, Reason)
            end;
        {error, Reason} ->
            handle_sync_error(State, StartTime, Reason)
    end.

%% @doc Fetch logs from backend API.
fetch_logs(State) ->
    Url = build_logs_url(State),
    Headers = build_headers(State),
    case httpc:request(get, {Url, Headers}, [], [{sync, true}]) of
        {ok, {{_, 200, _}, _, Body}} ->
            case parse_response(Body) of
                {ok, Logs, Cursor} -> {ok, Logs, Cursor};
                {error, Reason} -> {error, {parse_error, Reason}}
            end;
        {ok, {{_, Status, _}, _, Body}} ->
            {error, {http_error, Status, Body}};
        {error, Reason} ->
            {error, {request_error, Reason}}
    end.

%% @doc Build the logs API URL with cursor pagination.
build_logs_url(State) ->
    Base = to_string(State#state.backend_url) ++ "/api/v1/logs",
    case State#state.last_cursor of
        undefined -> Base;
        Cursor -> Base ++ "?cursor=" ++ to_string(Cursor) ++ "&limit=" ++ integer_to_list(State#state.batch_size)
    end.

to_string(Bin) when is_binary(Bin) -> binary_to_list(Bin);
to_string(Str) when is_list(Str) -> Str.

%% @doc Build request headers.
build_headers(State) ->
    BaseHeaders = [{"accept", "application/json"}],
    case State#state.api_key of
        undefined -> BaseHeaders;
        Key -> [{"authorization", "Bearer " ++ to_string(Key)} | BaseHeaders]
    end.

%% @doc Parse JSON response from backend.
parse_response(Body) ->
    case jiffy:decode(Body, [return_maps]) of
        #{status := <<"ok">>, logs := Logs} when is_list(Logs) ->
            Cursor = get_cursor(Logs),
            {ok, Logs, Cursor};
        #{status := <<"ok">>} ->
            {ok, [], undefined};
        {error, Reason} ->
            {error, Reason};
        Other ->
            {error, {unexpected_format, Other}}
    end.

%% @doc Extract cursor from last log entry.
get_cursor(Logs) ->
    case lists:last(Logs) of
        #{id := Id} when is_integer(Id) -> integer_to_binary(Id);
        #{cursor := Cursor} when is_binary(Cursor) -> Cursor;
        _ -> undefined
    end.

%% @doc Publish logs to Kafka.
publish_logs(Logs) ->
    case Logs of
        [] -> ok;
        _ ->
            case pulse_kafka_producer:produce_batch(Logs) of
                {ok, _Offsets} -> ok;
                {error, Reason} ->
                    pulse_logger:log_kafka_error(batch_produce, Reason, #{}),
                    {error, Reason}
            end
    end.

%% @doc Update metrics.
update_metrics(#metrics{sync_count = SC, logs_fetched = LF, logs_published = LP, errors = E, last_sync = LS, last_error = LE, sync_interval = SI} = Metrics, ok, Count, StartTime) ->
    Metrics#metrics{
        sync_count = SC + 1,
        logs_fetched = LF + Count,
        logs_published = LP + Count,
        last_sync = StartTime,
        last_error = undefined
    };
update_metrics(#metrics{sync_count = SC, logs_fetched = LF, logs_published = LP, errors = E, last_sync = LS, last_error = LE, sync_interval = SI} = Metrics, error, _Count, StartTime) ->
    Metrics#metrics{
        errors = E + 1,
        last_sync = StartTime
    }.

%% @doc Handle sync errors with retry logic.
handle_sync_error(State, StartTime, Reason) ->
    NewMetrics = update_metrics(State#state.metrics, error, 0, StartTime),
    lager:log(error, "Backend sync failed: ~p", [Reason]),
    {error, State#state{metrics = NewMetrics}}.

%% @doc Cleanup on termination.
terminate(_Reason, #state{running = true, timer_ref = TimerRef}) ->
    erlang:cancel_timer(TimerRef),
    ok;
terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.

%% Helper functions
get_env(Key, Default) ->
    case application:get_env(?MODULE, Key) of
        {ok, Val} -> Val;
        _ -> case os:getenv(env_var(Key)) of
            false -> Default;
            Val -> Val
        end
    end.

get_env_opt(Key) ->
    case application:get_env(?MODULE, Key) of
        {ok, Val} -> Val;
        _ -> case os:getenv(env_var(Key)) of
            false -> undefined;
            Val -> Val
        end
    end.

get_env_int(Key, Default) ->
    case get_env(Key, integer_to_list(Default)) of
        Val when is_list(Val) -> list_to_integer(Val);
        Val when is_integer(Val) -> Val;
        _ -> Default
    end.

env_var(Key) ->
    "PULSE_" ++ string:to_upper(atom_to_list(Key)).