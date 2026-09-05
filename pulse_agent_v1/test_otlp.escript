#!/usr/bin/env escript
%%! -config config/test_sys.config

main(_) ->
    ok = application:ensure_all_started(pulse_agent_v1),
    timer:sleep(2000),
    ok = inets:start(),
    io:format("Testing OTLP /v1/traces endpoint...~n"),
    Result = httpc:request(post, 
        {"http://localhost:8083/v1/traces", [], "application/json", "{\"resourceSpans\":[]}"}, 
        [], [{sync, true}]),
    io:format("Result: ~p~n", [Result]),
    timer:sleep(1000),
    ok = httpc:request(post,
        {"http://localhost:8083/v1/logs", [], "application/json", "{\"resourceLogs\":[]}"}, 
        [], [{sync, true}]),
    io:format("Logs test done~n"),
    timer:sleep(1000),
    ok = httpc:request(post,
        {"http://localhost:8083/v1/metrics", [], "application/json", "{\"resourceMetrics\":[]}"}, 
        [], [{sync, true}]),
    io:format("Metrics test done~n"),
    timer:sleep(1000),
    init:stop().