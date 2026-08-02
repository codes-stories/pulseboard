%%%-------------------------------------------------------------------
%% @doc Business logic for the public API.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_agent_service).

-export([
    health/0,
    register_agent/1,
    heartbeat/1,
    append_log/1,
    list_agents/0,
    list_logs/0,
    reason_text/1
]).

health() ->
    #{
        status => <<"ok">>,
        service => <<"pulse_agent_v1">>,
        mode => <<"api">>
    }.

register_agent(Params) ->
    case required(Params, [<<"agent_id">>]) of
        {ok, AgentId} ->
            Agent =
                #{
                    agent_id => AgentId,
                    name => get_value(Params, <<"name">>, <<"unnamed-agent">>),
                    version => get_value(Params, <<"version">>, <<"unknown">>),
                    status => get_value(Params, <<"status">>, <<"active">>),
                    metadata => get_value(Params, <<"metadata">>, <<>>)
                },
            ets_config:register_agent(Agent);
        Error ->
            Error
    end.

heartbeat(Params) ->
    case required(Params, [<<"agent_id">>]) of
        {ok, AgentId} ->
            Status = get_value(Params, <<"status">>, <<"active">>),
            ets_config:heartbeat(AgentId, Status);
        Error ->
            Error
    end.

append_log(Params) ->
    case required(Params, [<<"agent_id">>, <<"message">>]) of
        {ok, AgentId, Message} ->
            Log =
                #{
                    agent_id => AgentId,
                    level => get_value(Params, <<"level">>, <<"info">>),
                    message => Message,
                    context => get_value(Params, <<"context">>, <<>>)
                },
            ets_config:append_log(Log);
        Error ->
            Error
    end.

list_agents() ->
    case ets_config:list_agents() of
        {ok, Agents} -> {ok, #{status => <<"ok">>, agents => Agents}};
        Error -> Error
    end.

list_logs() ->
    case ets_config:list_logs() of
        {ok, Logs} -> {ok, #{status => <<"ok">>, logs => Logs}};
        Error -> Error
    end.

reason_text(missing_agent_id) ->
    <<"agent_id is required">>;
reason_text(missing_message) ->
    <<"message is required">>;
reason_text(method_not_allowed) ->
    <<"method not allowed">>;
reason_text(request_too_large) ->
    <<"request body too large">>;
reason_text(not_found) ->
    <<"resource not found">>;
reason_text(unsupported_request) ->
    <<"unsupported request">>;
reason_text(Other) when is_binary(Other) ->
    Other;
reason_text(Other) when is_atom(Other) ->
    atom_to_binary(Other, utf8);
reason_text(Other) ->
    iolist_to_binary(io_lib:format("~p", [Other])).

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
