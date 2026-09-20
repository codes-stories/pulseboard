%%%-------------------------------------------------------------------
%% @doc Backend metrics scraper.
%% Periodically scrapes the Go backend's /metrics endpoint and reports
%% the collected system metrics back to the backend via POST.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_backend_metrics_scraper).

-behaviour(gen_server).

-export([
    start_link/0,
    scrape_once/0,
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

-define(DEFAULT_SCRAPE_INTERVAL_MS, 10000).
-define(TIMEOUT_MS, 5000).

-record(metrics, {
    scrape_count = 0,
    errors = 0,
    last_scrape = undefined,
    last_error = undefined
}).

-record(state, {
    running = false,
    timer_ref = undefined,
    backend_url = "http://localhost:8080",
    api_key = undefined,
    scrape_interval_ms = ?DEFAULT_SCRAPE_INTERVAL_MS,
    metrics = #metrics{}
}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

scrape_once() ->
    gen_server:call(?MODULE, scrape_once, 60000).

status() ->
    gen_server:call(?MODULE, status, 5000).

init([]) ->
    BackendUrl = get_env(backend_api_url, "http://localhost:8080"),
    ApiKey = get_env_opt(backend_api_key),
    IntervalMs = get_env_int(metrics_scrape_interval_ms, ?DEFAULT_SCRAPE_INTERVAL_MS),
    State = #state{
        backend_url = BackendUrl,
        api_key = ApiKey,
        scrape_interval_ms = IntervalMs,
        metrics = #metrics{}
    },
    %% Auto-start scraping after a short delay to let the system boot
    erlang:send_after(5000, self(), start_scrape),
    {ok, State}.

handle_call(scrape_once, _From, State) ->
    case perform_scrape(State) of
        {ok, NewState} ->
            {reply, {ok, NewState#state.metrics}, NewState};
        {error, Reason} ->
            {reply, {error, Reason}, State}
    end;

handle_call(status, _From, State) ->
    {reply, State#state.metrics, State};

handle_call(_Request, _From, State) ->
    {reply, {error, unsupported_request}, State}.

handle_cast(start_scrape, State) ->
    case State#state.running of
        true ->
            {noreply, State};
        false ->
            TimerRef = erlang:send_after(0, self(), scrape_tick),
            {noreply, State#state{running = true, timer_ref = TimerRef}}
    end;

handle_cast(stop_scrape, State) ->
    case State#state.timer_ref of
        undefined -> {noreply, State};
        TimerRef ->
            erlang:cancel_timer(TimerRef),
            {noreply, State#state{running = false, timer_ref = undefined}}
    end;

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(start_scrape, State) ->
    case State#state.running of
        true ->
            {noreply, State};
        false ->
            TimerRef = erlang:send_after(0, self(), scrape_tick),
            lager:info("Backend metrics scraper started (interval: ~pms)", [State#state.scrape_interval_ms]),
            {noreply, State#state{running = true, timer_ref = TimerRef}}
    end;

handle_info(scrape_tick, State) ->
    case perform_scrape(State) of
        {ok, NewState} ->
            TimerRef = erlang:send_after(NewState#state.scrape_interval_ms, self(), scrape_tick),
            {noreply, NewState#state{timer_ref = TimerRef}};
        {error, _Reason} ->
            TimerRef = erlang:send_after(State#state.scrape_interval_ms, self(), scrape_tick),
            {noreply, State#state{timer_ref = TimerRef}}
    end;

handle_info(_Info, State) ->
    {noreply, State}.

perform_scrape(State) ->
    case fetch_metrics(State) of
        {ok, MetricsSnapshot} ->
            case report_metrics(State, MetricsSnapshot) of
                ok ->
                    NewMetrics = update_metrics(State#state.metrics, ok),
                    lager:info("Backend metrics scraped and reported successfully"),
                    {ok, State#state{metrics = NewMetrics}};
                {error, Reason} ->
                    lager:warning("Failed to report metrics: ~p", [Reason]),
                    NewMetrics = update_metrics(State#state.metrics, error),
                    {ok, State#state{metrics = NewMetrics}}
            end;
        {error, Reason} ->
            lager:warning("Failed to scrape backend metrics: ~p", [Reason]),
            NewMetrics = update_metrics(State#state.metrics, error),
            {error, State#state{metrics = NewMetrics}}
    end.

fetch_metrics(State) ->
    Url = State#state.backend_url ++ "/api/v1/backend/metrics",
    Headers = build_headers(State#state.api_key),
    case httpc:request(get, {Url, Headers}, [{timeout, ?TIMEOUT_MS}], [{sync, true}]) of
        {ok, {{_, 200, _}, _, Body}} ->
            case jiffy:decode(Body, [return_maps]) of
                {_MetricMap} when is_map(_MetricMap) ->
                    {ok, _MetricMap};
                Map when is_map(Map) ->
                    {ok, Map};
                _ ->
                    {error, {parse_error, invalid_json}}
            end;
        {ok, {{_, Status, _}, _, Body}} ->
            {error, {http_error, Status, Body}};
        {error, Reason} ->
            {error, {request_error, Reason}}
    end.

report_metrics(State, MetricsSnapshot) ->
    Url = State#state.backend_url ++ "/api/v1/agent/system-metrics",
    Payload = jiffy:encode(#{
        <<"metrics">> => MetricsSnapshot,
        <<"collected_at">> => format_timestamp(maps:get(<<"collected_at">>, MetricsSnapshot, undefined))
    }),
    Headers = build_headers(State#state.api_key),
    case httpc:request(post, {Url, Headers, "application/json", Payload},
                       [{timeout, ?TIMEOUT_MS}], [{sync, true}]) of
        {ok, {{_, Status, _}, _, _}} when Status >= 200, Status < 300 ->
            ok;
        {ok, {{_, Status, _}, _, Body}} ->
            {error, {http_error, Status, Body}};
        {error, Reason} ->
            {error, Reason}
    end.

format_timestamp(undefined) ->
    list_to_binary(iso8601(erlang:system_time(millisecond)));
format_timestamp(Timestamp) when is_binary(Timestamp) ->
    Timestamp;
format_timestamp(_) ->
    list_to_binary(iso8601(erlang:system_time(millisecond))).

iso8601(Ms) ->
    Sec = Ms div 1000,
    {{Y,Mo,D},{H,Mi,S}} = calendar:system_time_to_universal_time(Sec, second),
    io_lib:format("~4..0B-~2..0B-~2..0BT~2..0B:~2..0B:~2..0BZ", [Y,Mo,D,H,Mi,S]).

build_headers(undefined) ->
    [{"accept", "application/json"}, {"content-type", "application/json"}];
build_headers(ApiKey) ->
    [{"accept", "application/json"}, {"content-type", "application/json"},
     {"authorization", "Bearer " ++ to_string(ApiKey)}].

to_string(Bin) when is_binary(Bin) -> binary_to_list(Bin);
to_string(List) when is_list(List) -> List.

update_metrics(#metrics{scrape_count = SC, errors = E} = _Metrics, ok) ->
    #metrics{
        scrape_count = SC + 1,
        last_scrape = erlang:system_time(millisecond)
    };
update_metrics(#metrics{errors = E} = _Metrics, error) ->
    #metrics{
        errors = E + 1,
        last_error = erlang:system_time(millisecond)
    }.

terminate(_Reason, #state{timer_ref = TimerRef}) ->
    case TimerRef of
        undefined -> ok;
        _ -> erlang:cancel_timer(TimerRef)
    end,
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.

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

get_env_int(Key, Default) ->
    case get_env(Key, integer_to_list(Default)) of
        Val when is_list(Val) -> list_to_integer(Val);
        Val when is_integer(Val) -> Val;
        _ -> Default
    end.

env_var(Key) ->
    "PULSE_" ++ string:to_upper(atom_to_list(Key)).
