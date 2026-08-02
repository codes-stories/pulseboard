%%%-------------------------------------------------------------------
%% @doc Minimal application/x-www-form-urlencoded decoder.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_form).

-export([decode/1]).

decode(Body) when is_binary(Body) ->
    decode_pairs(binary:split(Body, <<"&">>, [global]), #{}).

decode_pairs([], Acc) ->
    Acc;
decode_pairs([<<>> | Rest], Acc) ->
    decode_pairs(Rest, Acc);
decode_pairs([Pair | Rest], Acc) ->
    case binary:split(Pair, <<"=">>, [global]) of
        [RawKey, RawValue] ->
            decode_pairs(Rest, maps:put(decode_component(RawKey), decode_component(RawValue), Acc));
        [RawKey] ->
            decode_pairs(Rest, maps:put(decode_component(RawKey), <<>>, Acc))
    end.

decode_component(Value) ->
    decode_percent(binary:replace(Value, <<"+">>, <<" ">>, [global])).

decode_percent(<<>>) ->
    <<>>;
decode_percent(<<$%, H1, H2, Rest/binary>>) ->
    case hex_pair(H1, H2) of
        {ok, Byte} -> <<Byte, (decode_percent(Rest))/binary>>;
        error -> <<$%, H1, H2, (decode_percent(Rest))/binary>>
    end;
decode_percent(<<Char, Rest/binary>>) ->
    <<Char, (decode_percent(Rest))/binary>>.

hex_pair(H1, H2) ->
    case {hex_value(H1), hex_value(H2)} of
        {{ok, A}, {ok, B}} -> {ok, (A bsl 4) bor B};
        _ -> error
    end.

hex_value(Char) when Char >= $0, Char =< $9 -> {ok, Char - $0};
hex_value(Char) when Char >= $A, Char =< $F -> {ok, 10 + Char - $A};
hex_value(Char) when Char >= $a, Char =< $f -> {ok, 10 + Char - $a};
hex_value(_) -> error.
