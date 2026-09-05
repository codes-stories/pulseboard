%%%-------------------------------------------------------------------
%% @doc Prometheus Remote Write handler.
%% Handles /api/v1/write endpoint for Prometheus remote write protocol.
%% Accepts protobuf-encoded WriteRequest (Content-Type: application/x-protobuf).
%% @end
%%%-------------------------------------------------------------------

-module(pulse_prom_remote_write).

-export([init/2]).

-define(PROM_PROTOBUF, <<"application/x-protobuf">>).
-define(PROM_PROTOBUF_GZIP, <<"application/x-protobuf; encoding=gzip">>).

init(Req0, #{resource := Resource} = _Opts) ->
    Method = cowboy_req:method(Req0),
    dispatch(Resource, Method, Req0).

dispatch(write, <<"POST">>, Req0) ->
    handle_remote_write(Req0);
dispatch(_Resource, _Method, Req0) ->
    respond_error(Req0, 405, method_not_allowed).

handle_remote_write(Req0) ->
    ContentType = get_content_type(Req0),
    case ContentType of
        ?PROM_PROTOBUF ->
            handle_protobuf(Req0);
        CT when CT =:= ?PROM_PROTOBUF_GZIP ->
            handle_protobuf(Req0);
        _ ->
            respond_error(Req0, 415, unsupported_media_type)
    end.

get_content_type(Req0) ->
    case cowboy_req:header(<<"content-type">>, Req0) of
        undefined -> <<>>;
        CT -> CT
    end.

handle_protobuf(Req0) ->
    case cowboy_req:read_body(Req0) of
        {ok, Body, Req1} ->
            case decode_write_request(Body) of
                {ok, Timeseries} ->
                    case pulse_kafka_producer:produce_batch(Timeseries) of
                        {ok, _Offsets} ->
                            respond(Req1, 200, #{status => <<"ok">>, count => length(Timeseries)});
                        {error, Reason} ->
                            respond_error(Req1, 500, {kafka_error, Reason})
                    end;
                {error, Reason} ->
                    respond_error(Req1, 400, {protobuf_decode_error, Reason})
            end;
        {more, _Partial, Req1} ->
            respond_error(Req1, 413, request_too_large)
    end.

%% @doc Decode Prometheus WriteRequest protobuf.
%% For now, this is a placeholder - in production use protobuffs with generated code
%% from Prometheus remote_write.proto
decode_write_request(_Body) ->
    {error, {protobuf_not_implemented, "Use protobuffs with generated code from Prometheus remote_write.proto"}}.

respond(Req0, Status, Payload) ->
    Req1 = pulse_http:reply_json(Req0, Status, Payload),
    {ok, Req1, undefined}.

respond_error(Req0, Status, Reason) ->
    respond(Req0, Status, #{
        status => <<"error">>,
        reason => pulse_agent_service:reason_text(Reason)
    }).