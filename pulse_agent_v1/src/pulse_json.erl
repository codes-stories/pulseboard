%%%-------------------------------------------------------------------
%% @doc Minimal JSON encoder for API responses.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_json).

-export([encode/1]).

encode(Value) ->
    iolist_to_binary(encode_value(Value)).

encode_value(undefined) ->
    <<"null">>;
encode_value(null) ->
    <<"null">>;
encode_value(true) ->
    <<"true">>;
encode_value(false) ->
    <<"false">>;
encode_value(Value) when is_integer(Value) ->
    integer_to_binary(Value);
encode_value(Value) when is_float(Value) ->
    float_to_binary(Value, [short]);
encode_value(Value) when is_binary(Value) ->
    encode_string(Value);
encode_value(Value) when is_atom(Value) ->
    encode_string(atom_to_binary(Value, utf8));
encode_value(Value) when is_map(Value) ->
    [<<"{">>, join_map(maps:to_list(Value)), <<"}">>];
encode_value(Value) when is_list(Value) ->
    [<<"[">>, join_list(Value), <<"]">>];
encode_value(Value) ->
    encode_string(iolist_to_binary(io_lib:format("~p", [Value]))).

join_map([]) ->
    <<>>;
join_map([{Key, Value} | Rest]) ->
    [encode_string(key_to_binary(Key)), <<":">>, encode_value(Value), join_map_tail(Rest)].

join_map_tail([]) ->
    <<>>;
join_map_tail([{Key, Value} | Rest]) ->
    [<<",">>, encode_string(key_to_binary(Key)), <<":">>, encode_value(Value), join_map_tail(Rest)].

join_list([]) ->
    <<>>;
join_list([Value | Rest]) ->
    [encode_value(Value), join_list_tail(Rest)].

join_list_tail([]) ->
    <<>>;
join_list_tail([Value | Rest]) ->
    [<<",">>, encode_value(Value), join_list_tail(Rest)].

key_to_binary(Key) when is_binary(Key) ->
    Key;
key_to_binary(Key) when is_atom(Key) ->
    atom_to_binary(Key, utf8);
key_to_binary(Key) ->
    iolist_to_binary(io_lib:format("~p", [Key])).

encode_string(Value) ->
    [<<"\"">>, escape(binary_to_list(Value)), <<"\"">>].

escape([]) ->
    <<>>;
escape([$\\ | Rest]) ->
    [<<"\\\\">>, escape(Rest)];
escape([$" | Rest]) ->
    [<<"\\\"">>, escape(Rest)];
escape([$\n | Rest]) ->
    [<<"\\n">>, escape(Rest)];
escape([$\r | Rest]) ->
    [<<"\\r">>, escape(Rest)];
escape([$\t | Rest]) ->
    [<<"\\t">>, escape(Rest)];
escape([Char | Rest]) when Char < 32 ->
    Hex = integer_to_binary(Char, 16),
    Padded =
        case byte_size(Hex) of
            1 -> [<<"000">>, Hex];
            2 -> [<<"00">>, Hex];
            _ -> Hex
        end,
    [<<"\\u">>, Padded, escape(Rest)];
escape([Char | Rest]) ->
    [Char | escape(Rest)].
