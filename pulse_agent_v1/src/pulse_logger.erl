%%%-------------------------------------------------------------------
%% @doc Structured logging wrapper for pulse_agent_v1.
%% Provides consistent log interface over lager with context enrichment.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_logger).

-compile({no_auto_import, [error/3]}).

-export([
    debug/2,
    debug/3,
    info/2,
    info/3,
    warning/2,
    warning/3,
    error/2,
    error/3,
    critical/2,
    critical/3,
    log/4,
    with_context/2,
    set_correlation_id/1,
    get_correlation_id/0,
    clear_correlation_id/0
]).

-define(APP, pulse_agent_v1).

%% @doc Log debug message.
debug(Msg, Args) when is_list(Args) ->
    debug(Msg, Args, #{}).

debug(Msg, Args, Context) when is_list(Args), is_map(Context) ->
    lager:log(debug, ?APP, Msg, Args, enrich_context(Context)).

%% @doc Log info message.
info(Msg, Args) when is_list(Args) ->
    info(Msg, Args, #{}).

info(Msg, Args, Context) when is_list(Args), is_map(Context) ->
    lager:log(info, ?APP, Msg, Args, enrich_context(Context)).

%% @doc Log warning message.
warning(Msg, Args) when is_list(Args) ->
    warning(Msg, Args, #{}).

warning(Msg, Args, Context) when is_list(Args), is_map(Context) ->
    lager:log(warning, ?APP, Msg, Args, enrich_context(Context)).

%% @doc Log error message.
error(Msg, Args) when is_list(Args) ->
    error(Msg, Args, #{}).

error(Msg, Args, Context) when is_list(Args), is_map(Context) ->
    lager:log(error, ?APP, Msg, Args, enrich_context(Context)).

%% @doc Log critical message.
critical(Msg, Args) when is_list(Args) ->
    critical(Msg, Args, #{}).

critical(Msg, Args, Context) when is_list(Args), is_map(Context) ->
    lager:log(critical, ?APP, Msg, Args, enrich_context(Context)).

%% @doc Generic log function.
log(Level, Msg, Args, Context) when is_atom(Level), is_list(Args), is_map(Context) ->
    lager:log(Level, ?APP, Msg, Args, enrich_context(Context)).

%% @doc Execute function with additional context.
with_context(Context, Fun) when is_map(Context), is_function(Fun, 0) ->
    put(log_context, merge_context(Context)),
    try Fun() after
        erase(log_context)
    end.

%% @doc Set correlation ID for request tracing.
set_correlation_id(CorrelationId) when is_binary(CorrelationId) ->
    put(correlation_id, CorrelationId).

%% @doc Get current correlation ID.
get_correlation_id() ->
    get(correlation_id).

%% @doc Clear correlation ID.
clear_correlation_id() ->
    erase(correlation_id).

%% @doc Enrich context with correlation ID and timestamp.
enrich_context(Context) ->
    Base = maps:merge(Context, #{timestamp => timestamp()}),
    case get_correlation_id() of
        undefined -> Base;
        CorrId -> maps:put(correlation_id, CorrId, Base)
    end.

%% @doc Merge process dictionary context with provided context.
merge_context(Context) ->
    case get(log_context) of
        undefined -> Context;
        Existing when is_map(Existing) -> maps:merge(Existing, Context)
    end.

%% @doc Generate timestamp in milliseconds.
timestamp() ->
    erlang:system_time(millisecond).

%% @doc Log API request.
log_request(Method, Path, StatusCode, DurationMs, Context) ->
    info("HTTP ~s ~s ~w ~wms", [Method, Path, StatusCode, DurationMs], Context).

%% @doc Log agent event.
log_agent_event(Event, AgentId, Context) ->
    info("Agent ~s: ~s", [AgentId, Event], Context).

%% @doc Log log ingestion.
log_ingestion(AgentId, Level, MessageSize, Context) ->
    debug("Log ingested: agent=~s level=~s size=~w", [AgentId, Level, MessageSize], Context).

%% @doc Log Kafka produce.
log_kafka_produce(Topic, Partition, Offset, LatencyMs, Context) ->
    debug("Kafka produce: topic=~s partition=~w offset=~w latency=~wms", [Topic, Partition, Offset, LatencyMs], Context).

%% @doc Log Kafka error.
log_kafka_error(Operation, Error, Context) ->
    error("Kafka ~s failed: ~p", [Operation, Error], Context).

%% @doc Log backend sync.
log_backend_sync(Operation, Count, DurationMs, Context) ->
    info("Backend sync ~s: count=~w duration=~wms", [Operation, Count, DurationMs], Context).