%%%-------------------------------------------------------------------
%% @doc In-memory store for agents and logs.
%% @end
%%%-------------------------------------------------------------------

-module(ets_config).

-behaviour(gen_server).

-export([
    start_link/0,
    register_agent/1,
    heartbeat/2,
    append_log/1,
    get_agent/1,
    list_agents/0,
    list_logs/0
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

-define(AGENTS_TABLE, pulse_agents).
-define(LOGS_TABLE, pulse_logs).

-record(state, {}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

register_agent(Agent) when is_map(Agent) ->
    gen_server:call(?MODULE, {register_agent, Agent}).

heartbeat(AgentId, Status) ->
    gen_server:call(?MODULE, {heartbeat, AgentId, Status}).

append_log(Log) when is_map(Log) ->
    gen_server:call(?MODULE, {append_log, Log}).

get_agent(AgentId) ->
    gen_server:call(?MODULE, {get_agent, AgentId}).

list_agents() ->
    gen_server:call(?MODULE, list_agents).

list_logs() ->
    gen_server:call(?MODULE, list_logs).

init([]) ->
    ensure_table(?AGENTS_TABLE, [
        named_table, set, public, {read_concurrency, true}, {write_concurrency, true}
    ]),
    ensure_table(?LOGS_TABLE, [
        named_table, ordered_set, public, {read_concurrency, true}, {write_concurrency, true}
    ]),
    {ok, #state{}}.

handle_call({register_agent, Agent}, _From, State) ->
    AgentId = maps:get(agent_id, Agent),
    Timestamp = timestamp(),
    StoredAgent =
        Agent#{
            agent_id => AgentId,
            registered_at => maps:get(registered_at, Agent, Timestamp),
            last_seen => Timestamp,
            status => maps:get(status, Agent, <<"active">>)
        },
    persist_agent(StoredAgent),
    ets:insert(?AGENTS_TABLE, {AgentId, StoredAgent}),
    {reply, {ok, StoredAgent}, State};
handle_call({heartbeat, AgentId, Status}, _From, State) ->
    Timestamp = timestamp(),
    Existing =
        case ets:lookup(?AGENTS_TABLE, AgentId) of
            [{_, Agent}] -> Agent;
            [] -> #{agent_id => AgentId, registered_at => Timestamp}
        end,
    Updated =
        Existing#{
            agent_id => AgentId,
            last_seen => Timestamp,
            status => Status
        },
    persist_heartbeat(AgentId, Status),
    ets:insert(?AGENTS_TABLE, {AgentId, Updated}),
    {reply, {ok, Updated}, State};
handle_call({append_log, Log}, _From, State) ->
    LogId = erlang:unique_integer([monotonic, positive]),
    Timestamp = timestamp(),
    StoredLog =
        Log#{
            id => LogId,
            timestamp => Timestamp
        },
    persist_log(StoredLog),
    ets:insert(?LOGS_TABLE, {LogId, StoredLog}),
    {reply, {ok, StoredLog}, State};
handle_call({get_agent, AgentId}, _From, State) ->
    Reply =
        case ets:lookup(?AGENTS_TABLE, AgentId) of
            [{_, Agent}] -> {ok, Agent};
            [] -> {error, not_found}
        end,
    {reply, Reply, State};
handle_call(list_agents, _From, State) ->
    Agents = [Agent || {_, Agent} <- ets:tab2list(?AGENTS_TABLE)],
    {reply, {ok, Agents}, State};
handle_call(list_logs, _From, State) ->
    Logs = [Log || {_, Log} <- ets:tab2list(?LOGS_TABLE)],
    SortedLogs = lists:sort(fun(A, B) -> maps:get(id, A) =< maps:get(id, B) end, Logs),
    {reply, {ok, SortedLogs}, State};
handle_call(_Request, _From, State) ->
    {reply, {error, unsupported_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    delete_table(?AGENTS_TABLE),
    delete_table(?LOGS_TABLE),
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.

ensure_table(Name, Options) ->
    case ets:info(Name) of
        undefined ->
            ets:new(Name, Options);
        _ ->
            delete_table(Name),
            ets:new(Name, Options)
    end.

delete_table(Name) ->
    case ets:info(Name) of
        undefined -> ok;
        _ -> ets:delete(Name)
    end.

persist_agent(StoredAgent) ->
    persist_result(psql_config:insert_agent(StoredAgent), "agent").

persist_heartbeat(AgentId, Status) ->
    persist_result(psql_config:update_agent(AgentId, Status), "heartbeat").

persist_log(StoredLog) ->
    persist_result(psql_config:insert_log(StoredLog), "log").

persist_result({ok, _}, _Label) ->
    ok;
persist_result(ok, _Label) ->
    ok;
persist_result({error, disabled}, _Label) ->
    ok;
persist_result({error, Reason}, Label) ->
    error_logger:warning_msg("PostgreSQL ~s write failed: ~p~n", [Label, Reason]),
    ok.

timestamp() ->
    erlang:system_time(millisecond).
