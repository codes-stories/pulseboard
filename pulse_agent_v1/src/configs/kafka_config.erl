%%%-------------------------------------------------------------------
%% @doc Kafka configuration and environment setup.
%% @end
%%%-------------------------------------------------------------------

-module(kafka_config).

-export([
    start_link/0,
    brokers/0,
    client_id/0,
    topic/0,
    acks/0,
    batch_size/0,
    linger_ms/0,
    compression/0,
    enabled/0,
    producer_config/0,
    ensure_defaults/0
]).

-record(state, {
    enabled = false,
    brokers = [],
    client_id = <<"pulse_agent_v1">>,
    topic = <<"api-logs">>,
    acks = all,
    batch_size = 16384,
    linger_ms = 5,
    compression = none
}).

%% @doc Start the Kafka configuration worker.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Get Kafka brokers list.
brokers() ->
    case application:get_env(pulse_agent_v1, kafka_brokers) of
        {ok, Brokers} when is_list(Brokers) -> Brokers;
        {ok, Brokers} when is_binary(Brokers) -> string:tokens(binary_to_list(Brokers), ",");
        _ -> ["localhost:9092"]
    end.

%% @doc Get Kafka client ID.
client_id() ->
    application:get_env(pulse_agent_v1, kafka_client_id, <<"pulse_agent_v1">>).

%% @doc Get Kafka topic for API logs.
topic() ->
    application:get_env(pulse_agent_v1, kafka_topic, <<"api-logs">>).

%% @doc Get Kafka acks setting.
acks() ->
    case application:get_env(pulse_agent_v1, kafka_acks) of
        {ok, <<"all">>} -> all;
        {ok, <<"1">>} -> 1;
        {ok, <<"0">>} -> 0;
        _ -> all
    end.

%% @doc Get Kafka batch size.
batch_size() ->
    application:get_env(pulse_agent_v1, kafka_batch_size, 16384).

%% @doc Get Kafka linger.ms.
linger_ms() ->
    application:get_env(pulse_agent_v1, kafka_linger_ms, 5).

%% @doc Get Kafka compression type.
compression() ->
    case application:get_env(pulse_agent_v1, kafka_compression) of
        {ok, <<"snappy">>} -> snappy;
        {ok, <<"gzip">>} -> gzip;
        {ok, <<"zstd">>} -> zstd;
        _ -> none
    end.

%% @doc Check if Kafka is enabled.
enabled() ->
    application:get_env(pulse_agent_v1, kafka_enabled, false).

%% @doc Get full producer configuration for brod.
producer_config() ->
    #{
        required_acks => acks(),
        batch_size => batch_size(),
        linger_ms => linger_ms(),
        compression => compression()
    }.

%% @doc Populate defaults from environment variables.
ensure_defaults() ->
    ensure_env(kafka_enabled, false),
    ensure_env(kafka_brokers, "localhost:9092"),
    ensure_env(kafka_client_id, "pulse_agent_v1"),
    ensure_env(kafka_topic, "api-logs"),
    ensure_env(kafka_acks, "all"),
    ensure_env(kafka_batch_size, 16384),
    ensure_env(kafka_linger_ms, 5),
    ensure_env(kafka_compression, "none"),
    ok.

ensure_env(Key, Default) ->
    case application:get_env(pulse_agent_v1, Key) of
        undefined ->
            Value = env_override(Key, Default),
            application:set_env(pulse_agent_v1, Key, Value);
        _ ->
            ok
    end.

env_override(Key, Default) ->
    case os:getenv(env_var_name(Key)) of
        false -> Default;
        Value -> convert_env_value(Default, Value)
    end.

env_var_name(Key) ->
    string:to_upper(atom_to_list(Key)).

convert_env_value(Default, Value) when is_integer(Default) ->
    list_to_integer(Value);
convert_env_value(Default, Value) when is_boolean(Default) ->
    case string:to_lower(Value) of
        "true" -> true;
        "1" -> true;
        "yes" -> true;
        _ -> false
    end;
convert_env_value(_Default, Value) ->
    Value.