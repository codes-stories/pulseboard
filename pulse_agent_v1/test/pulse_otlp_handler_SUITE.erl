%%%-------------------------------------------------------------------
%% @doc Common Test suite for pulse_otlp_handler.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_otlp_handler_SUITE).

-include_lib("common_test/include/ct.hrl").

-export([all/0, groups/0, init_per_suite/1, end_per_suite/1,
         init_per_group/2, end_per_group/2,
         init_per_testcase/2, end_per_testcase/2]).

-export([traces_endpoint_test/1, normalization_test/1]).

all() ->
    [traces_endpoint_test, normalization_test].

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

%% @doc Test /v1/traces endpoint
traces_endpoint_test(_Config) ->
    Payload = jiffy:encode(#{resourceSpans => []}),
    case httpc:request(post, {"http://localhost:8083/v1/traces", [], "application/json", Payload}, [], [{sync, true}]) of
        {ok, {{_, 200, _}, _, Body}} ->
            {ok, Decoded} = jiffy:decode(Body, [return_maps]),
            case maps:get(<<"status">>, Decoded) of
                <<"ok">> -> {pass, "traces endpoint accepts empty payload"};
                _ -> {fail, "unexpected status"}
            end;
        {ok, {{_, Status, _}, _, _}} ->
            {fail, "unexpected status: " ++ integer_to_list(Status)};
        {error, Reason} ->
            {fail, "request failed: " ++ Reason}
    end.

%% @doc Test normalization produces valid output
normalization_test(_Config) ->
    %% Build payload using jiffy:encode with a simpler structure
    Trace = [
        {<<"traceId">>, <<"0123456789abcdef">>},
        {<<"spanId">>, <<"01234567">>},
        {<<"name">>, <<"test-span">>},
        {<<"kind">>, 2},
        {<<"startTimeUnixNano">>, 1234567890000000000},
        {<<"endTimeUnixNano">>, 1234567891000000000},
        {<<"attributes">>, []},
        {<<"events">>, []},
        {<<"links">>, []},
        {<<"status">>, #{<<"code">> => 1, <<"message">> => <<"OK">>}}
    ],
    Spans = [Trace],
    ScopeSpans = [{#{<<"scope">> => #{}}, #{<<"spans">> => Spans}}],
    ResourceSpans = [{#{<<"resource">> => #{<<"attributes">> => []}}, #{<<"scopeSpans">> => ScopeSpans}}],
    Payload = jiffy:encode(#{<<"resourceSpans">> => ResourceSpans}),
    case httpc:request(post, {"http://localhost:8083/v1/traces", [], "application/json", Payload}, [], [{sync, true}]) of
        {ok, {{_, 200, _}, _, Body}} ->
            {ok, Decoded} = jiffy:decode(Body, [return_maps]),
            case maps:get(<<"status">>, Decoded) of
                <<"ok">> ->
                    Count = maps:get(<<"count">>, Decoded, 0),
                    case Count > 0 of
                        true -> {pass, "trace normalized and sent to Kafka, count: " ++ integer_to_list(Count)};
                        false -> {fail, "count should be > 0"}
                    end;
                _ -> {fail, "unexpected status"}
            end;
        {ok, {{_, Status, _}, _, _}} ->
            {fail, "unexpected status: " ++ integer_to_list(Status)};
        {error, Reason} ->
            {fail, "request failed: " ++ Reason}
    end.