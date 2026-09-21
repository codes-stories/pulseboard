-module(pulse_cli).

-export([main/1]).

main(["enroll", Token]) ->
    pulse_enroll:run(Token);
main(["enroll", "--token", Token]) ->
    pulse_enroll:run(Token);
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
main(["monitor", "api", Resource | Methods]) ->
    pulse_api_handler:monitor(Resource, Methods);
main(["monitor", "performance"]) ->
    pulse_agent_service:get_metrics();
main(["monitor", "pid-info"]) ->
    pulse_agent_service:get_pid_info();
main(["monitor", "storage"]) ->
    pulse_agent_service:get_storage_info();
main(["remote", "login"]) ->
    pulse_remote_login:run();
main(["remote", "status"]) ->
    pulse_remote_status:run();
main(["remote", "logout"]) ->
    pulse_remote_logout:run();
main(_) ->
    usage().

usage() ->
    io:format(
        "\n"
        "Pulse Agent CLI\n"
        "\n"
        "Usage:\n"
        "\n"
        "  pulse-agent enroll <ENROLLMENT_TOKEN>\n"
        "  pulse-agent enroll --token <ENROLLMENT_TOKEN>\n"
        "\n"
        "  pulse-agent login <TOKEN>\n"
        "  pulse-agent login --token <TOKEN>\n"
        "  pulse-agent login --api-key <API_KEY>\n"
        "\n"
        "  pulse-agent logout\n"
        "\n"
        "  pulse-agent monitor api <resource> <method>\n"
        "  pulse-agent monitor performance\n"
        "  pulse-agent monitor pid-info\n"
        "  pulse-agent monitor storage\n"
        "\n"
        "  pulse-agent remote login\n"
        "  pulse-agent remote status\n"
        "  pulse-agent remote logout\n"
        "\n"
    ).
