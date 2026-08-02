-module(pulse_logout).

-export([run/0]).

run() ->
    case pulse_cli_store:delete() of
        ok ->
            io:format("Logged out successfully.~n");
        {error, not_found} ->
            io:format("Not logged in.~n");
        {error, Reason} ->
            io:format("Logout failed: ~s~n", [pulse_cli_store:format_error(Reason)])
    end.
