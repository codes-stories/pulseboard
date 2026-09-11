-module(pulse_remote_logout).

-export([run/0]).

run() ->
    case pulse_cli_store:delete() of
        ok ->
            io:format("Remote logout successful.~n");
        {error, not_found} ->
            io:format("Not logged in.~n");
        {error, Reason} ->
            io:format("Logout failed: ~s~n", [Reason])
    end.