%%%-------------------------------------------------------------------
%% @doc OpenTelemetry Protocol (OTLP) HTTP handler.
%% Handles /v1/traces, /v1/metrics, /v1/logs, /v1/profiles endpoints.
%% Accepts both JSON and Protobuf (Content-Type: application/x-protobuf).
%% @end
%%%-------------------------------------------------------------------

-module(pulse_otlp_handler).

-export([init/2]).

-define(OTLP_JSON, <<"application/json">>).
-define(OTLP_PROTOBUF, <<"application/x-protobuf">>).
-define(OTLP_JSON_FALLBACK, <<"application/json; charset=utf-8">>).

init(Req0, #{resource := Resource} = _Opts) ->
    Method = cowboy_req:method(Req0),
    dispatch(Resource, Method, Req0).

dispatch(traces, <<"POST">>, Req0) ->
    handle_otlp_request(traces, Req0);
dispatch(metrics, <<"POST">>, Req0) ->
    handle_otlp_request(metrics, Req0);
dispatch(logs, <<"POST">>, Req0) ->
    handle_otlp_request(logs, Req0);
dispatch(profiles, <<"POST">>, Req0) ->
    handle_otlp_request(profiles, Req0);
dispatch(_Resource, _Method, Req0) ->
    respond_error(Req0, 405, method_not_allowed).

handle_otlp_request(Type, Req0) ->
    ContentType = get_content_type(Req0),
    case ContentType of
        ?OTLP_PROTOBUF ->
            handle_protobuf(Type, Req0);
        CT when CT =:= ?OTLP_JSON; CT =:= ?OTLP_JSON_FALLBACK ->
            handle_json(Type, Req0);
        _ ->
            respond_error(Req0, 415, unsupported_media_type)
    end.

get_content_type(Req0) ->
    case cowboy_req:header(<<"content-type">>, Req0) of
        undefined -> <<>>;
        CT -> CT
    end.

handle_json(Type, Req0) ->
    case cowboy_req:read_body(Req0) of
        {ok, Body, Req1} ->
            case jiffy:decode(Body, [return_maps]) of
                {ok, Payload} ->
                    process_payload(Type, Payload, Req1);
                {error, Reason} ->
                    respond_error(Req1, 400, {invalid_json, Reason})
            end;
        {more, _Partial, Req1} ->
            respond_error(Req1, 413, request_too_large)
    end.

handle_protobuf(Type, Req0) ->
    %% For now, return 501 - protobuf decoding requires generated .hrl files
    %% In production, use gpb or protobuffs with generated code from OTLP .proto
    respond_error(Req0, 501, {protobuf_not_implemented, "Use JSON for now, protobuf requires generated code"}).

process_payload(Type, Payload, Req0) ->
    case pulse_telemetry_normalize:normalize(Type, Payload) of
        {ok, Normalized} ->
            case pulse_kafka_producer:produce_batch(Normalized) of
                {ok, _Offsets} ->
                    respond(Req0, 200, #{status => <<"ok">>, type => Type, count => length(Normalized)});
                {error, Reason} ->
                    respond_error(Req0, 500, {kafka_error, Reason})
            end;
        {error, Reason} ->
            respond_error(Req0, 400, {normalization_error, Reason})
    end.

respond(Req0, Status, Payload) ->
    Req1 = pulse_http:reply_json(Req0, Status, Payload),
    {ok, Req1, undefined}.

respond_error(Req0, Status, Reason) ->
    respond(Req0, Status, #{
        status => <<"error">>,
        reason => pulse_agent_service:reason_text(Reason)
    }).