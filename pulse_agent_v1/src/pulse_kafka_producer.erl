%%%-------------------------------------------------------------------
%% @doc Kafka producer for publishing API logs.
%% Uses brod client for async message production with batching.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_kafka_producer).

-behaviour(gen_server).

-export([
    start_link/0,
    produce/1,
    produce_sync/1,
    produce_batch/1,
    health/0,
    metrics/0
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

-define(CLIENT_NAME, pulse_agent_v1_client).
-define(PRODUCER_NAME, pulse_agent_v1_producer).
-define(DEFAULT_TOPIC, <<"api-logs">>).

-record(metrics, {
    produced_count = 0,
    failed_count = 0,
    bytes_sent = 0,
    last_error = undefined,
    last_produce_time = undefined,
    sync_interval = 30000
}).

-record(state, {
    client_started = false,
    producer_started = false,
    topic = ?DEFAULT_TOPIC,
    config = #{},
    metrics = #metrics{}
}).

%% @doc Start the Kafka producer supervisor.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Async produce a single log message.
%% Returns {ok, Ref} | {error, Reason}
produce(LogMap) when is_map(LogMap) ->
    gen_server:cast(?MODULE, {produce, LogMap}).

%% @doc Sync produce a single log message (waits for ack).
%% Returns {ok, Offset} | {error, Reason}
produce_sync(LogMap) when is_map(LogMap) ->
    gen_server:call(?MODULE, {produce_sync, LogMap}, 10000).

%% @doc Produce a batch of log messages.
%% Returns {ok, [Offsets]} | {error, Reason}
produce_batch(LogMaps) when is_list(LogMaps) ->
    gen_server:call(?MODULE, {produce_batch, LogMaps}, 30000).

%% @doc Check producer health.
health() ->
    gen_server:call(?MODULE, health, 5000).

%% @doc Get producer metrics.
metrics() ->
    gen_server:call(?MODULE, metrics, 5000).

%% @doc Initialize the producer.
init([]) ->
    case kafka_config:enabled() of
        true ->
            case ensure_client_started() of
                ok ->
                    Config = kafka_config:producer_config(),
                    Topic = kafka_config:topic(),
                    case ensure_producer_started(Topic) of
                        ok ->
                            lager:info("Kafka producer started for topic ~p", [Topic]),
                            {ok, #state{
                                client_started = true,
                                producer_started = true,
                                topic = Topic,
                                config = Config
                            }};
                        {error, Reason} ->
                            lager:error("Failed to start Kafka producer: ~p", [Reason]),
                            {stop, {producer_start_failed, Reason}}
                    end;
                {error, Reason} ->
                    lager:error("Failed to start Kafka client: ~p", [Reason]),
                    {stop, {client_start_failed, Reason}}
            end;
        false ->
            {ok, #state{}}
    end.

%% @doc Ensure Kafka client is started.
ensure_client_started() ->
    case application:ensure_all_started(brod) of
        {ok, _} -> ok;
        {error, {already_started, brod}} -> ok;
        {error, Reason} -> {error, Reason}
    end.

%% @doc Ensure Kafka producer is started for the topic.
ensure_producer_started(Topic) ->
    Client = ?CLIENT_NAME,
    Brokers = kafka_config:brokers(),
    case brod:start_client(Brokers, Client, [
        {reconnect_cool_down_seconds, 10},
        {auto_start_producers, true},
        {default_producer_config, kafka_config:producer_config()}
    ]) of
        ok ->
            ok;
        {error, {already_started, Client}} ->
            ok;
        Error ->
            Error
    end.

%% @doc Handle synchronous calls.
handle_call({produce_sync, LogMap}, _From, State) ->
    case produce_to_kafka(State#state.topic, LogMap) of
        {ok, Offset} ->
            NewMetrics = update_metrics(State#state.metrics, ok, LogMap),
            {reply, {ok, Offset}, State#state{metrics = NewMetrics}};
        {error, Reason} ->
            NewMetrics = update_metrics(State#state.metrics, error, Reason),
            {reply, {error, Reason}, State#state{metrics = NewMetrics}}
    end;

handle_call({produce_batch, LogMaps}, _From, State) ->
    case produce_batch_to_kafka(State#state.topic, LogMaps) of
        {ok, Offsets} ->
            NewMetrics = update_batch_metrics(State#state.metrics, ok, length(LogMaps)),
            {reply, {ok, Offsets}, State#state{metrics = NewMetrics}};
        {error, Reason} ->
            NewMetrics = update_batch_metrics(State#state.metrics, error, Reason),
            {reply, {error, Reason}, State#state{metrics = NewMetrics}}
    end;

handle_call(health, _From, State) ->
    Healthy = State#state.client_started andalso State#state.producer_started,
    {reply, #{healthy => Healthy, client => State#state.client_started, producer => State#state.producer_started}, State};

handle_call(metrics, _From, State) ->
    {reply, State#state.metrics, State};

handle_call(_Request, _From, State) ->
    {reply, {error, unsupported_request}, State}.

%% @doc Handle asynchronous casts.
handle_cast({produce, LogMap}, State) ->
    case produce_to_kafka(State#state.topic, LogMap) of
        ok ->
            NewMetrics = update_metrics(State#state.metrics, ok, LogMap),
            {noreply, State#state{metrics = NewMetrics}};
        {error, Reason} ->
            lager:warning("Kafka async produce failed: ~p", [Reason]),
            NewMetrics = update_metrics(State#state.metrics, error, Reason),
            {noreply, State#state{metrics = NewMetrics}}
    end;

handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle info messages (e.g., brod acks).
handle_info({brod_produce_ack, _Client, _Topic, _Partition, _Offset, _Ref}, State) ->
    {noreply, State};
handle_info({brod_produce_error, _Client, _Topic, _Partition, _Reason, _Ref}, State) ->
    lager:error("Kafka produce error: ~p", [_Reason]),
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Produce a single message to Kafka.
produce_to_kafka(Topic, LogMap) ->
    Key = maps:get(agent_id, LogMap, <<>>),
    Value = jiffy:encode(LogMap),
    Client = ?CLIENT_NAME,
    Partition = random_partition(Key),
    case brod:produce_sync(Client, Topic, Partition, Key, Value) of
        {ok, Offset} -> {ok, Offset};
        {error, Reason} -> {error, Reason}
    end.

%% @doc Produce a batch of messages to Kafka.
produce_batch_to_kafka(Topic, LogMaps) ->
    Client = ?CLIENT_NAME,
    Messages = [
        #{
            key => maps:get(agent_id, Log, <<>>),
            value => jiffy:encode(Log)
        } || Log <- LogMaps
    ],
    Partition = random_partition(<<"batch">>),
    case brod:produce_sync(Client, Topic, Partition, Messages) of
        {ok, Offsets} -> {ok, Offsets};
        {error, Reason} -> {error, Reason}
    end.

%% @doc Simple consistent partitioning by key.
random_partition(Key) ->
    case Key of
        <<>> -> rand:uniform(100);
        _ -> erlang:phash2(Key, 100)
    end.

%% @doc Update metrics for single produce.
update_metrics(#metrics{produced_count = PC, bytes_sent = BS, failed_count = FC, last_error = LE, last_produce_time = LPT} = Metrics, ok, LogMap) ->
    Bytes = byte_size(jiffy:encode(LogMap)),
    Metrics#metrics{
        produced_count = PC + 1,
        bytes_sent = BS + Bytes,
        last_produce_time = erlang:system_time(millisecond)
    };
update_metrics(#metrics{produced_count = PC, bytes_sent = BS, failed_count = FC, last_error = LE, last_produce_time = LPT} = Metrics, error, Reason) ->
    Metrics#metrics{
        failed_count = FC + 1,
        last_error = Reason,
        last_produce_time = erlang:system_time(millisecond)
    }.

%% @doc Update metrics for batch produce.
update_batch_metrics(#metrics{produced_count = PC, failed_count = FC, last_error = LE, last_produce_time = LPT} = Metrics, ok, Count) ->
    Metrics#metrics{
        produced_count = PC + Count,
        last_produce_time = erlang:system_time(millisecond)
    };
update_batch_metrics(#metrics{produced_count = PC, failed_count = FC, last_error = LE, last_produce_time = LPT} = Metrics, error, Reason) ->
    Metrics#metrics{
        failed_count = FC + 1,
        last_error = Reason,
        last_produce_time = erlang:system_time(millisecond)
    }.

terminate(_Reason, #state{client_started = true} = State) ->
    try
        brod:stop_client(?CLIENT_NAME)
    catch
        _:_ -> ok
    end,
    ok;
terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.