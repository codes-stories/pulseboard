%%%-------------------------------------------------------------------
%% @doc PostgreSQL adapter and configuration helper.
%% @end
%%
%% The module keeps the connection settings centralized and also owns a single
%% lightweight PostgreSQL client process. That gives the application one place
%% to swap in pooled or replicated access later without changing callers.
%%%-------------------------------------------------------------------

-module(psql_config).

-behaviour(gen_server).

-export([
    start_link/0,
    query/1,
    insert_agent/1,
    update_agent/2,
    insert_log/1,
    enabled/0,
    host/0,
    port/0,
    database/0,
    username/0,
    password/0,
    connection_options/0,
    ensure_schema/0
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

-record(state, {
    connection = undefined,
    enabled = false
}).

%% @doc Start the PostgreSQL adapter worker.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Execute a simple SQL statement through the adapter worker.
query(Sql) when is_list(Sql); is_binary(Sql) ->
    gen_server:call(?MODULE, {query, Sql}).

insert_agent(Agent) when is_map(Agent) ->
    gen_server:call(?MODULE, {insert_agent, Agent}).

update_agent(AgentId, Status) ->
    gen_server:call(?MODULE, {update_agent, AgentId, Status}).

insert_log(Log) when is_map(Log) ->
    gen_server:call(?MODULE, {insert_log, Log}).

enabled() ->
    application:get_env(pulse_agent_v1, postgres_enabled, false).

host() ->
    application:get_env(pulse_agent_v1, postgres_host, "localhost").

port() ->
    application:get_env(pulse_agent_v1, postgres_port, 5432).

database() ->
    application:get_env(pulse_agent_v1, postgres_database, "pulse_agent_v1").

username() ->
    application:get_env(pulse_agent_v1, postgres_username, "postgres").

password() ->
    application:get_env(pulse_agent_v1, postgres_password, "postgres").

connection_options() ->
    [
        {host, host()},
        {port, port()},
        {database, database()},
        {username, username()},
        {password, password()}
    ].

init([]) ->
    case enabled() of
        true ->
            connect();
        false ->
            {ok, #state{enabled = false}}
    end.

handle_call({query, _Sql}, _From, #state{enabled = false} = State) ->
    {reply, {error, disabled}, State};
handle_call({query, Sql}, _From, #state{connection = Connection} = State) ->
    Reply = epgsql:squery(Connection, Sql),
    {reply, Reply, State};
handle_call({insert_agent, _Agent}, _From, #state{enabled = false} = State) ->
    {reply, {error, disabled}, State};
handle_call({insert_agent, Agent}, _From, #state{connection = Connection} = State) ->
    Reply =
        epgsql:equery(
            Connection,
            "INSERT INTO pulse_agents (agent_id, name, version, status, metadata, registered_at, last_seen) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (agent_id) DO UPDATE SET name = EXCLUDED.name, version = EXCLUDED.version, status = EXCLUDED.status, metadata = EXCLUDED.metadata, registered_at = EXCLUDED.registered_at, last_seen = EXCLUDED.last_seen",
            [
                maps:get(agent_id, Agent),
                maps:get(name, Agent, <<>>),
                maps:get(version, Agent, <<>>),
                maps:get(status, Agent, <<>>),
                maps:get(metadata, Agent, <<>>),
                maps:get(registered_at, Agent, 0),
                maps:get(last_seen, Agent, 0)
            ]
        ),
    {reply, Reply, State};
handle_call({update_agent, _AgentId, _Status}, _From, #state{enabled = false} = State) ->
    {reply, {error, disabled}, State};
handle_call({update_agent, AgentId, Status}, _From, #state{connection = Connection} = State) ->
    Timestamp = erlang:system_time(millisecond),
    Reply =
        epgsql:equery(
            Connection,
            "INSERT INTO pulse_agents (agent_id, status, last_seen, registered_at) VALUES ($1, $2, $3, $4) ON CONFLICT (agent_id) DO UPDATE SET status = EXCLUDED.status, last_seen = EXCLUDED.last_seen",
            [AgentId, Status, Timestamp, Timestamp]
        ),
    {reply, Reply, State};
handle_call({insert_log, _Log}, _From, #state{enabled = false} = State) ->
    {reply, {error, disabled}, State};
handle_call({insert_log, Log}, _From, #state{connection = Connection} = State) ->
    Reply =
        epgsql:equery(
            Connection,
            "INSERT INTO pulse_logs (id, agent_id, level, message, context, timestamp) VALUES ($1, $2, $3, $4, $5, $6)",
            [
                maps:get(id, Log),
                maps:get(agent_id, Log),
                maps:get(level, Log, <<"info">>),
                maps:get(message, Log),
                maps:get(context, Log, <<>>),
                maps:get(timestamp, Log)
            ]
        ),
    {reply, Reply, State};
handle_call(ensure_schema, _From, #state{enabled = false} = State) ->
    {reply, {error, disabled}, State};
handle_call(ensure_schema, _From, #state{connection = Connection} = State) ->
    {reply, create_schema(Connection), State};
handle_call(_Request, _From, State) ->
    {reply, {error, unsupported_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, #state{connection = Connection}) when Connection =/= undefined ->
    try epgsql:close(Connection) of
        _ -> ok
    catch
        _:CloseReason ->
            error_logger:warning_msg("PostgreSQL connection shutdown failed: ~p~n", [CloseReason]),
            ok
    end,
    ok;
terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.

connect() ->
    Host = host(),
    User = username(),
    Password = password(),
    Options = [{port, port()} | connection_options_without_auth()],
    case epgsql:connect(Host, User, Password, Options) of
        {ok, Connection} ->
            create_schema(Connection),
            {ok, #state{connection = Connection, enabled = true}};
        {error, Reason} ->
            error_logger:warning_msg("PostgreSQL connection unavailable: ~p~n", [Reason]),
            {ok, #state{enabled = false}}
    end.

connection_options_without_auth() ->
    [
        {database, database()}
    ].

ensure_schema() ->
    gen_server:call(?MODULE, ensure_schema).

create_schema(Connection) ->
    Statements = [
        "CREATE TABLE IF NOT EXISTS pulse_agents (agent_id text PRIMARY KEY, name text NOT NULL DEFAULT '', version text NOT NULL DEFAULT '', status text NOT NULL DEFAULT '', metadata text NOT NULL DEFAULT '', registered_at bigint NOT NULL, last_seen bigint NOT NULL)",
        "CREATE TABLE IF NOT EXISTS pulse_logs (id bigint PRIMARY KEY, agent_id text NOT NULL, level text NOT NULL DEFAULT 'info', message text NOT NULL DEFAULT '', context text NOT NULL DEFAULT '', timestamp bigint NOT NULL)"
    ],
    lists:foreach(fun(Sql) -> epgsql:squery(Connection, Sql) end, Statements),
    ok.
