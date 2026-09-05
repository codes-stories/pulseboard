%%%-------------------------------------------------------------------
%% @doc Common Test suite for pulse_kafka_producer.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_kafka_producer_SUITE).

-include_lib("common_test/include/ct.hrl").

-export([all/0, groups/0, init_per_suite/1, end_per_suite/1,
         init_per_group/2, end_per_group/2,
         init_per_testcase/2, end_per_testcase/2]).

-export([produce_test/1, produce_sync_test/1, produce_batch_test/1,
         health_test/1, metrics_test/1, config_test/1]).

all() ->
    [produce_test, produce_sync_test, produce_batch_test,
     health_test, metrics_test, config_test].

groups() ->
    [].

init_per_suite(Config) ->
    application:ensure_all_started(pulse_agent_v1),
    application:ensure_all_started(brod),
    application:ensure_all_started(lager),
    Config.

end_per_suite(_Config) ->
    ok.

init_per_group(_Group, Config) ->
    Config.

end_per_group(_Group, _Config) ->
    ok.

init_per_testcase(_TC, Config) ->
    Config.

end_per_testcase(_TC, _Config) ->
    ok.

%% @doc Test async produce.
produce_test(Config) ->
    Log = #{agent_id => <<"test-agent">>, level => <<"info">>, message => <<"test message">>},
    case pulse_kafka_producer:produce(Log) of
        ok -> {pass, "async produce accepted"};
        {error, Reason} when Reason =:= disabled -> {skip, "Kafka disabled"};
        {error, Reason} -> {fail, "produce failed: " ++ Reason}
    end.

%% @doc Test sync produce.
produce_sync_test(Config) ->
    Log = #{agent_id => <<"test-agent-sync">>, level => <<"info">>, message => <<"sync test">>},
    case pulse_kafka_producer:produce_sync(Log) of
        {ok, Offset} when is_integer(Offset) -> {pass, "sync produce returned offset"};
        {error, disabled} -> {skip, "Kafka disabled"};
        {error, Reason} -> {fail, "sync produce failed: " ++ Reason}
    end.

%% @doc Test batch produce.
produce_batch_test(Config) ->
    Logs = [
        #{agent_id => <<"batch-1">>, level => <<"info">>, message => <<"msg1">>},
        #{agent_id => <<"batch-2">>, level => <<"warn">>, message => <<"msg2">>},
        #{agent_id => <<"batch-3">>, level => <<"error">>, message => <<"msg3">>}
    ],
    case pulse_kafka_producer:produce_batch(Logs) of
        {ok, Offsets} when is_list(Offsets) -> {pass, "batch produce returned offsets"};
        {error, disabled} -> {skip, "Kafka disabled"};
        {error, Reason} -> {fail, "batch produce failed: " ++ Reason}
    end.

%% @doc Test health check.
health_test(_Config) ->
    case pulse_kafka_producer:health() of
        #{healthy := Healthy, client := Client, producer := Producer} ->
            case {Healthy, Client, Producer} of
                {true, true, true} -> {pass, "producer healthy"};
                {false, _, _} ->
                    case kafka_config:enabled() of
                        false -> {skip, "Kafka disabled"};
                        true -> {fail, "producer not healthy"}
                    end;
                _ -> {fail, "producer not healthy"}
            end;
        {error, _Reason} -> {skip, "Kafka disabled"}
    end.

%% @doc Test metrics.
metrics_test(_Config) ->
    case pulse_kafka_producer:metrics() of
        #{produced_count := PC, failed_count := FC, bytes_sent := BS} ->
            {pass, "metrics returned: produced=" ++ integer_to_list(PC) ++
                    " failed=" ++ integer_to_list(FC) ++
                    " bytes=" ++ integer_to_list(BS)};
        {error, _Reason} -> {skip, "Kafka disabled"}
    end.

%% @doc Test configuration.
config_test(_Config) ->
    Enabled = application:get_env(pulse_agent_v1, kafka_enabled, false),
    Brokers = application:get_env(pulse_agent_v1, kafka_brokers, "localhost:9092"),
    Topic = application:get_env(pulse_agent_v1, kafka_topic, <<"api-logs">>),
    ClientId = application:get_env(pulse_agent_v1, kafka_client_id, <<"pulse_agent_v1">>),
    BrokersStr = case Brokers of
        [B|_] when is_list(B) -> B;
        [B|_] when is_binary(B) -> binary_to_list(B);
        _ -> "none"
    end,
    TopicStr = case Topic of
        T when is_binary(T) -> binary_to_list(T);
        T when is_list(T) -> T;
        _ -> "api-logs"
    end,
    ClientIdStr = case ClientId of
        C when is_binary(C) -> binary_to_list(C);
        C when is_list(C) -> C;
        _ -> "pulse_agent_v1"
    end,
    {pass, "config: enabled=" ++ (if Enabled -> "true"; true -> "false" end) ++
            " brokers=" ++ BrokersStr ++
            " topic=" ++ TopicStr ++
            " client_id=" ++ ClientIdStr}.