%%%-------------------------------------------------------------------
%% @doc Common Test suite for pulse_prom_remote_write.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_prom_remote_write_SUITE).

-include_lib("common_test/include/ct.hrl").

-export([all/0, groups/0, init_per_suite/1, end_per_suite/1,
         init_per_group/2, end_per_group/2,
         init_per_testcase/2, end_per_testcase/2]).

-export([write_endpoint_test/1, invalid_content_type_test/1, empty_payload_test/1]).

all() ->
    [write_endpoint_test, invalid_content_type_test, empty_payload_test].

groups() ->
    [].

init_per_suite(Config) ->
    application:ensure_all_started(pulse_agent_v1),
    application:ensure_all_started(brod),
    application:ensure_all_started(lager),
    application:ensure_all_started(inets),
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

%% @doc Test /api/v1/write endpoint
write_endpoint_test(_Config) ->
    %% For now, protobuf decoding is not implemented, so we expect 501
    Payload = <<>>,
    case httpc:request(post, {"http://localhost:8082/api/v1/write", [], "application/x-protobuf", <<>>}, [], [{sync, true}]) of
        {ok, {{_, 501, _}, _, Body}} ->
            {ok, Decoded} = jiffy:decode(Body, [return_maps]),
            case maps:get(status, Decoded) of
                <<"error">> ->
                    Reason = maps:get(reason, Decoded, <<>>),
                    case binary_to_list(Reason) of
                        "protobuf_not_implemented" ++ _ ->
                            {pass, "501 for protobuf not implemented"};
                        _ -> {fail, "unexpected error reason"}
                    end;
                _ -> {fail, "unexpected status"}
            end;
        {ok, {{_, Status, _}, _, _}} ->
            {fail, "expected 501, got: " ++ integer_to_list(Status)};
        {error, Reason} ->
            {fail, "request failed: " ++ Reason}
    end.

%% @doc Test invalid content type returns 415
invalid_content_type_test(_Config) ->
    case httpc:request(post, {"http://localhost:8082/api/v1/write", [], "text/plain", <<>>}, [], [{sync, true}]) of
        {ok, {{_, 415, _}, _, Body}} ->
            {ok, Decoded} = jiffy:decode(Body, [return_maps]),
            case maps:get(status, Decoded) of
                <<"error">> -> {pass, "415 for invalid content type"};
                _ -> {fail, "unexpected status"}
            end;
        {ok, {{_, Status, _}, _, _}} ->
            {fail, "expected 415, got: " ++ integer_to_list(Status)};
        {error, Reason} ->
            {fail, "request failed: " ++ Reason}
    end.

%% @doc Test empty payload returns 501 (protobuf not implemented)
empty_payload_test(_Config) ->
    case httpc:request(post, {"http://localhost:8082/api/v1/write", [], "application/x-protobuf", <<>>}, [], [{sync, true}]) of
        {ok, {{_, 501, _}, _, Body}} ->
            {ok, Decoded} = jiffy:decode(Body, [return_maps]),
            case maps:get(status, Decoded) of
                <<"error">> ->
                    Reason = maps:get(reason, Decoded, <<>>),
                    case binary_to_list(Reason) of
                        "protobuf_not_implemented" ++ _ ->
                            {pass, "501 for empty protobuf payload"};
                        _ -> {fail, "unexpected error reason"}
                    end;
                _ -> {fail, "unexpected status"}
            end;
        {ok, {{_, Status, _}, _, _}} ->
            {fail, "expected 501, got: " ++ integer_to_list(Status)};
        {error, Reason} ->
            {fail, "request failed: " ++ Reason}
    end.