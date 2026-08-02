-module(pulse_cli_store).

-export([
    save/1,
    load/0,
    delete/0,
    path/0,
    format_error/1,
    mask/1
]).

save(Credential) when is_list(Credential); is_binary(Credential) ->
    Dir = filename:dirname(path()),
    ok = filelib:ensure_dir(filename:join(Dir, "placeholder")),
    file:write_file(path(), to_binary(Credential)).

load() ->
    case file:read_file(path()) of
        {ok, Binary} -> {ok, trim_binary(Binary)};
        {error, enoent} -> {error, not_found};
        {error, Reason} -> {error, Reason}
    end.

delete() ->
    case file:delete(path()) of
        ok -> ok;
        {error, enoent} -> {error, not_found};
        {error, Reason} -> {error, Reason}
    end.

path() ->
    Home = home_dir(),
    filename:join([Home, ".pulse_agent_v1", "credential"]).

format_error(not_found) ->
    "credential not found";
format_error(Reason) when is_atom(Reason) ->
    atom_to_list(Reason);
format_error(Reason) when is_binary(Reason) ->
    binary_to_list(Reason);
format_error(Reason) ->
    io_lib:format("~p", [Reason]).

mask(Credential) when is_binary(Credential) ->
    mask(binary_to_list(Credential));
mask(Credential) when is_list(Credential) ->
    case length(Credential) of
        N when N =< 8 -> lists:duplicate(N, $*);
        N ->
            Prefix = lists:sublist(Credential, 4),
            Suffix = lists:sublist(Credential, N - 3, 4),
            Prefix ++ "..." ++ Suffix
    end.

to_binary(Value) when is_binary(Value) ->
    Value;
to_binary(Value) when is_list(Value) ->
    list_to_binary(Value).

trim_binary(Binary) ->
    list_to_binary(string:trim(binary_to_list(Binary), trailing, "\r\n")).

home_dir() ->
    case os:getenv("HOME") of
        false -> ".";
        Home -> Home
    end.
