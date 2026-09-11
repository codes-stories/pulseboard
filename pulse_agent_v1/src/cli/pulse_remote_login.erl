-module(pulse_remote_login).

-export([run/0]).

run() ->
    io:format("Enter pulse-agent remote login command:~n~n"),
    io:format("Usage: pulse-agent remote login --token <TOKEN>~n~n"),
    ok.

main(["--token", Token]) ->
    pulse_remote_login:run_with_token(Token);
main([Token]) ->
    pulse_remote_login:run_with_token(Token);
main(_) ->
    usage().

run_with_token(Token) ->
    case pulse_cli_store:save(Token) of
        ok ->
            io:format("Remote login successful.~n");
        {error, Reason} ->
            io:format("Remote login failed: ~s~n", [Reason])
    end.

usage() ->
    io:format(
        "\n"
        "Pulse remote login:~n"
        "  pulse-agent remote login --token <TOKEN>~n"
        "\n"
    ).