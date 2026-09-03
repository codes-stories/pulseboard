%%%-------------------------------------------------------------------
%% @doc Common Test suite for pulse_agent_service.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_agent_service_SUITE).

-include_lib("common_test/include/ct.hrl").

-export([all/0, groups/0, init_per_suite/1, end_per_suite/1,
         init_per_group/2, end_per_group/2,
         init_per_testcase/2, end_per_testcase/2]).

-export([health_test/1, register_agent_test/1, heartbeat_test/1,
         append_log_test/1, list_agents_test/1, list_logs_test/1]).

all() ->
    [health_test, register_agent_test, heartbeat_test,
     append_log_test, list_agents_test, list_logs_test].

groups() ->
    [].

init_per_suite(Config) ->
    application:ensure_all_started(pulse_agent_v1),
    application:ensure_all_started(brod),
    application:ensure_all_started(lager),
    %% Clean up any existing data
    ets_config:register_agent(#{agent_id => <<"cleanup-test">>, name => <<"cleanup">>}),
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

%% @doc Test health endpoint.
health_test(Config) ->
    case pulse_agent_service:health() of
        #{status := <<"ok">>, service := <<"pulse_agent_v1">>, mode := <<"api">>} ->
            {pass, "health check ok"};
        Other ->
            {fail, "unexpected health response: " ++ io_lib:format("~p", [Other])}
    end.

%% @doc Test agent registration.
register_agent_test(Config) ->
    AgentId = list_to_binary("test-agent-" ++ integer_to_list(erlang:unique_integer([positive]))),
    Params = #{agent_id => AgentId, name => <<"Test Agent">>, version => <<"1.0.0">>, status => <<"active">>},
    case pulse_agent_service:register_agent(Params) of
        {ok, Agent} ->
            case maps:get(agent_id, Agent) of
                AgentId -> {pass, "agent registered"};
                _ -> {fail, "agent_id mismatch"}
            end;
        {error, Reason} ->
            {fail, "register_agent failed: " ++ Reason}
    end.

%% @doc Test heartbeat.
heartbeat_test(Config) ->
    AgentId = list_to_binary("hb-test-" ++ integer_to_list(erlang:unique_integer([positive]))),
    _ = pulse_agent_service:register_agent(#{agent_id => AgentId, name => <<"HB Test">>}),
    case pulse_agent_service:heartbeat(#{agent_id => AgentId, status => <<"active">>}) of
        {ok, Agent} ->
            case maps:get(status, Agent) of
                <<"active">> -> {pass, "heartbeat updated status"};
                _ -> {fail, "status not updated"}
            end;
        {error, Reason} ->
            {fail, "heartbeat failed: " ++ Reason}
    end.

%% @doc Test log appending.
append_log_test(Config) ->
    AgentId = list_to_binary("log-test-" ++ integer_to_list(erlang:unique_integer([positive]))),
    _ = pulse_agent_service:register_agent(#{agent_id => AgentId, name => <<"Log Test">>}),
    LogParams = #{agent_id => AgentId, level => <<"info">>, message => <<"Test log message">>, context => <<"{}">>},
    case pulse_agent_service:append_log(LogParams) of
        {ok, Log} ->
            case maps:get(message, Log) of
                <<"Test log message">> -> {pass, "log appended"};
                _ -> {fail, "log message mismatch"}
            end;
        {error, Reason} ->
            {fail, "append_log failed: " ++ Reason}
    end.

%% @doc Test listing agents.
list_agents_test(Config) ->
    case pulse_agent_service:list_agents() of
        {ok, #{agents := Agents}} when is_list(Agents) ->
            {pass, "listed " ++ integer_to_list(length(Agents)) ++ " agents"};
        {error, Reason} ->
            {fail, "list_agents failed: " ++ Reason}
    end.

%% @doc Test listing logs.
list_logs_test(Config) ->
    case pulse_agent_service:list_logs() of
        {ok, #{logs := Logs}} when is_list(Logs) ->
            {pass, "listed " ++ integer_to_list(length(Logs)) ++ " logs"};
        {error, Reason} ->
            {fail, "list_logs failed: " ++ Reason}
    end.