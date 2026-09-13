-module(pulse_agent_service).

-export([
    health/0,
    register_agent/1,
    heartbeat/1,
    append_log/1,
    list_agents/0,
    list_logs/0,
    monitor_api/2,
    get_performance/0,
    get_pid_info/0,
    get_storage_info/0,
    reason_text/1
]).

health() ->
    #{
        status => <<"ok">>,
        service => <<"pulse_agent_v1">>,
        mode => <<"api">>
    }.

monitor_api(Resource, Method) ->
    case Resource of
        <<"health">> ->
            case Method of
                <<"GET">> -> get_health_status();
                _ -> #{} end;
        <<"metrics">> ->
            case Method of
                <<"GET">> -> get_metrics();
                _ -> #{} end;
        <<"storage">> ->
            case Method of
                <<"GET">> -> get_storage_info();
                _ -> #{} end;
        _ -> #{}
    end.

get_health_status() ->
    #{
        status => <<"ok">>,
        service => <<"pulse_agent_v1">>,
        version => get_app_version(),
        uptime => erlang:system_info(boot_time)
    }.

get_metrics() ->
    #{
        cpu_usage => erlang:system_info(cpu_usage),
        memory_usage => erlang:system_info(memory),
        process_count => erlang:process_info(self(), memory),
        virtual_heap_size => erlang:system_info(virtual_heap_size),
        actual_heap_size => erlang:system_info(actual_heap_size),
        reduction_count => erlang:system_info(reduction_count),
        wall_clock => erlang:system_info(wall_clock)
    }.

get_pid_info() ->
    Processes = [PID || PID <- processes(), erlang:process_info(PID, status) =/= inactive],
    [#{pid => integer_to_list(PID),
      name => erlang:process_info(PID, name),
      messages => erlang:process_info(PID, messages),
      messages_in => erlang:process_info(PID, messages_in),
      messages_out => erlang:process_info(PID, messages_out)} || PID <- Processes].

get_storage_info() ->
    #{total_processes => length(processes()),
      system_uptime => erlang:system_info(wall_clock) - erlang:system_info(boot_time)}.

get_app_version() ->
    case file:read_file("priv/app_version") of
        {ok, <<Version/binary>>} -> lists:strip(erlang:binary_to_list(Version));
        _ -> <<"1.0.0">>
    end.

required(Params, [Key]) ->
    case maps:find(Key, Params) of
        {ok, Value} when Value =/= <<>> -> {ok, Value};
        _ -> {error, missing_agent_id}
    end;
required(Params, [Key1, Key2]) ->
    case maps:find(Key1, Params) of
        {ok, Value1} when Value1 =/= <<>> ->
            case maps:find(Key2, Params) of
                {ok, Value2} when Value2 =/= <<>> -> {ok, Value1, Value2};
                _ -> {error, missing_message}
            end;
        _ ->
            {error, missing_agent_id}
    end.

get_value(Params, Key, Default) ->
    maps:get(Key, Params, Default).

register_agent(_Params) ->
    #{status => <<"ok">>, action => <<"register">>}.

heartbeat(_Params) ->
    #{status => <<"ok">>, action => <<"heartbeat">>}.

append_log(Form) ->
    Message = maps:get(<<"message">>, Form, <<>>),
    AgentId = maps:get(<<"agent_id">>, Form, <<"unknown">>),
    Level = maps:get(<<"level">>, Form, <<"info">>),
    Id = erlang:unique_integer([positive]),
    Timestamp = erlang:system_time(second),
    Log = #{id => Id, agent_id => AgentId, level => Level, message => Message, timestamp => Timestamp},
    Log.

get_performance() ->
    get_metrics().

list_agents() ->
    [].

list_logs() ->
    [].

reason_text({kafka_error, _Reason}) -> <<"kafka error">>;
reason_text({http_error, _Status, _Body}) -> <<"http error">>;
reason_text({parse_error, _Reason}) -> <<"parse error">>;
reason_text({request_error, _Reason}) -> <<"request error">>;
reason_text({normalization_error, _Reason}) -> <<"normalization error">>;
reason_text({invalid_json, _Reason}) -> <<"invalid json">>;
reason_text(request_too_large) -> <<"request tooo large">>;
reason_text({protobuf_not_implemented, Msg}) -> list_to_binary(Msg);
reason_text(_) -> <<"unknown error">>.