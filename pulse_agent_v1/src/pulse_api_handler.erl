%%%-------------------------------------------------------------------
%% @doc Single API handler for health, agents, heartbeats, and logs.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_api_handler).

-export([init/2]).

init(Req0, #{resource := Resource} = _Opts) ->
    Method = cowboy_req:method(Req0),
    dispatch(Resource, Method, Req0).

dispatch(health, <<"GET">>, Req0) ->
    respond(Req0, 200, pulse_agent_service:health());
dispatch(agents, <<"GET">>, Req0) ->
    case pulse_agent_service:list_agents() of
        {ok, Payload} -> respond(Req0, 200, Payload);
        {error, Reason} -> respond_error(Req0, 500, Reason)
    end;
dispatch(register_agent, <<"POST">>, Req0) ->
    with_form_body(
        Req0,
        fun(Req1, Form) ->
            case pulse_agent_service:register_agent(Form) of
                {ok, Agent} ->
                    respond(Req1, 201, #{
                        status => <<"ok">>, action => <<"register">>, agent => Agent
                    });
                {error, Reason} ->
                    respond_error(Req1, 400, Reason)
            end
        end
    );
dispatch(heartbeat, <<"POST">>, Req0) ->
    with_form_body(
        Req0,
        fun(Req1, Form) ->
            case pulse_agent_service:heartbeat(Form) of
                {ok, Agent} ->
                    respond(Req1, 200, #{
                        status => <<"ok">>, action => <<"heartbeat">>, agent => Agent
                    });
                {error, Reason} ->
                    respond_error(Req1, 400, Reason)
            end
        end
    );
dispatch(logs, <<"GET">>, Req0) ->
    case pulse_agent_service:list_logs() of
        {ok, Payload} -> respond(Req0, 200, Payload);
        {error, Reason} -> respond_error(Req0, 500, Reason)
    end;
dispatch(logs, <<"POST">>, Req0) ->
    with_form_body(
        Req0,
        fun(Req1, Form) ->
            case pulse_agent_service:append_log(Form) of
                {ok, Log} ->
                    respond(Req1, 201, #{status => <<"ok">>, action => <<"log">>, log => Log});
                {error, Reason} ->
                    respond_error(Req1, 400, Reason)
            end
        end
    );
dispatch(_Resource, _Method, Req0) ->
    respond_error(Req0, 405, method_not_allowed).

with_form_body(Req0, Fun) ->
    case cowboy_req:read_body(Req0) of
        {ok, Body, Req1} ->
            Fun(Req1, pulse_form:decode(Body));
        {more, _Partial, Req1} ->
            respond_error(Req1, 413, request_too_large)
    end.

respond(Req0, Status, Payload) ->
    Req1 = pulse_http:reply_json(Req0, Status, Payload),
    {ok, Req1, undefined}.

respond_error(Req0, Status, Reason) ->
    respond(Req0, Status, #{
        status => <<"error">>, reason => pulse_agent_service:reason_text(Reason)
    }).
