-module(pulse_agent_v1_sup).

-behaviour(supervisor).

-export([
    start_link/0,
    init/1
]).

start_link() ->
    supervisor:start_link(
        {local, ?MODULE},
        ?MODULE,
        []
    ).

init([]) ->
    Children = [
        #{
            %% PostgreSQL stays in the supervision tree so the adapter can be
            %% enabled by configuration without changing the process layout.
            id => db_pool,
            start => {psql_config, start_link, []},
            restart => permanent,
            shutdown => 5000,
            type => worker
        },
        #{
            %% ETS provides the local in-memory store used by the current API.
            id => ets_store,
            start => {ets_config, start_link, []},
            restart => permanent,
            shutdown => 5000,
            type => worker
        },
        #{
            %% The HTTP server is isolated behind its own worker so the routing
            %% layer can evolve independently of the bootstrap logic.
            id => http_server,
            start => {pulse_http_server, start_link, []},
            restart => permanent,
            shutdown => 5000,
            type => worker
        }
    ],

    {
        %% One-for-one keeps failures isolated so a DB restart does not take
        %% down the HTTP listener or the local store.
        ok,
        {
            #{
                strategy => one_for_one,
                intensity => 5,
                period => 10
            },
            Children
        }
    }.
%% start app with sys.configs
%% rebar3 shell --config config/sys.config
