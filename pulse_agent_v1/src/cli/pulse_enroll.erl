-module(pulse_enroll).

-export([run/1]).

run(Token) ->
    BackendUrl = get_env_or_default("PULSE_BACKEND_API_URL", "http://localhost:8080"),
    EnrollUrl = BackendUrl ++ "/api/v1/agent/enroll",

    io:format("Enrolling with ~s...~n", [EnrollUrl]),
    ensure_inets_started(),

    Hostname = get_hostname(),
    DeviceId = get_device_id(),

    Payload = jiffy:encode(#{
        <<"enrollment_token">> => list_to_binary(Token),
        <<"hostname">> => list_to_binary(Hostname),
        <<"device_id">> => list_to_binary(DeviceId),
        <<"version">> => <<"0.1.0">>
    }),

    Headers = [{"content-type", "application/json"}],
    case httpc:request(post, {EnrollUrl, Headers, "application/json", Payload}, [], [{sync, true}]) of
        {ok, {{_, 200, _}, _, Body}} ->
            case jiffy:decode(list_to_binary(Body), [return_maps]) of
                #{<<"api_key">> := #{<<"key">> := ApiKey}} ->
                    case pulse_cli_store:save(binary_to_list(ApiKey)) of
                        ok ->
                            io:format("Enrolled successfully.~n"),
                            io:format("API key saved.~n");
                        {error, Reason} ->
                            io:format("Enrolled but failed to save API key: ~s~n",
                                [pulse_cli_store:format_error(Reason)])
                    end;
                _ ->
                    io:format("Unexpected response from backend: ~s~n", [Body])
            end;
        {ok, {{_, Status, _}, _, Body}} ->
            ErrorMsg = case jiffy:decode(list_to_binary(Body), [return_maps]) of
                #{<<"error">> := Err} -> binary_to_list(Err);
                _ -> "HTTP " ++ integer_to_list(Status)
            end,
            io:format("Enrollment failed: ~s~n", [ErrorMsg]);
        {error, Reason} ->
            io:format("Cannot reach backend: ~p~n", [Reason])
    end.

ensure_inets_started() ->
    case application:ensure_all_started(inets) of
        {ok, _} -> ok;
        {error, {already_started, inets}} -> ok;
        {error, Reason} -> erlang:error({cannot_start_inets, Reason})
    end.

get_env_or_default(Var, Default) ->
    case os:getenv(Var) of
        false -> Default;
        Val -> Val
    end.

get_hostname() ->
    case os:getenv("HOSTNAME") of
        false ->
            case os:cmd("hostname 2>/dev/null || echo unknown") of
                Str -> string:trim(Str)
            end;
        Val -> Val
    end.

get_device_id() ->
    case os:cmd("cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id 2>/dev/null || echo unknown") of
        Str -> string:trim(Str)
    end.
