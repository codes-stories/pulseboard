-module(pulse_remote_status).

-export([run/0]).

run() ->
    case pulse_cli_store:load() of
        {ok, Credential} ->
            io:format("Logged in with remote credential (masked): ~s~n",
                      [pulse_cli_store:mask(Credential)]);
        {error, not_found} ->
            io:format("Not logged in.~n");
        {error, Reason} ->
            io:format("Status failed: ~s~n", [Reason])
    end.