-module(pulse_login).

-export([run/1]).

run(Token) ->
    case pulse_cli_store:save(Token) of
        ok ->
            io:format("Logged in successfully.~n");
        {error, Reason} ->
            io:format("Login failed: ~s~n", [pulse_cli_store:format_error(Reason)])
    end.
