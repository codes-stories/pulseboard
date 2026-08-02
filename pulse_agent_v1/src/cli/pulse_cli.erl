-module(pulse_cli).

-export([main/1]).

main(["login", "--token", Token]) ->
    pulse_login:run(Token);
main(["login", Token]) ->
    pulse_login:run(Token);
main(["login", "--api-key", ApiKey]) ->
    pulse_login:run(ApiKey);
main(["login", "--apikey", ApiKey]) ->
    pulse_login:run(ApiKey);
main(["status"]) ->
    pulse_status:run();
main(["logout"]) ->
    pulse_logout:run();
main(_) ->
    usage().

usage() ->
    io:format(
        "\n"
        "Pulse Agent CLI\n"
        "\n"
        "Usage:\n"
        "\n"
        "  pulse-agent login <TOKEN>\n"
        "\n"
        "  pulse-agent login --token <TOKEN>\n"
        "  pulse-agent login --api-key <API_KEY>\n"
        "\n"
        "  pulse-agent status\n"
        "\n"
        "  pulse-agent logout\n"
        "\n"
    ).
