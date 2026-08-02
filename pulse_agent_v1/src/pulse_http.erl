%%%-------------------------------------------------------------------
%% @doc Shared HTTP response helpers.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_http).

-export([reply_json/3]).

reply_json(Req, Status, Payload) ->
    cowboy_req:reply(
        Status,
        #{
            <<"content-type">> => <<"application/json; charset=utf-8">>,
            <<"cache-control">> => <<"no-store">>
        },
        pulse_json:encode(Payload),
        Req
    ).
