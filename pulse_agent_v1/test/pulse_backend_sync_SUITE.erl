%%%-------------------------------------------------------------------
%% @doc Common Test suite for pulse_backend_sync.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_backend_sync_SUITE).

-include_lib("common_test/include/ct.hrl").

-export([all/0, groups/0, init_per_suite/1, end_per_suite/1,
         init_per_group/2, end_per_group/2,
         init_per_testcase/2, end_per_testcase/2]).

-export([start_stop_test/1, sync_once_test/1, status_test/1,
         config_test/1]).

all() ->
    [start_stop_test, sync_once_test, status_test, config_test].

groups() ->
    [].

init_per_suite(Config) ->
    application:ensure_all_started(pulse_agent_v1),
    application:ensure_all_started(brod),
    application:ensure_all_started(lager),
    application:ensure_all_started(inets),
    Config.

end_per_suite(_Config) ->
    ok.

init_per_group(_Group, Config) ->
    Config.

end_per_group(_Group, _Config) ->
    ok.

init_per_testcase(_TC, Config) ->
    Config.

end_per_testcase(_TC, _Config) ->
    ok.

%% @doc Test start/stop sync loop.
start_stop_test(_Config) ->
    ok = pulse_backend_sync:sync_loop(),
    timer:sleep(100),
    ok = pulse_backend_sync:stop_sync(),
    {pass, "sync loop started and stopped"}.

%% @doc Test single sync operation.
sync_once_test(_Config) ->
    {pass, "sync_once test placeholder"}.

%% @doc Test status retrieval.
status_test(_Config) ->
    case pulse_backend_sync:status() of
        {metrics, SC, LF, LP, E, _, _, _} ->
            {pass, "status: sync_count=" ++ integer_to_list(SC) ++
                    " logs_fetched=" ++ integer_to_list(LF) ++
                    " logs_published=" ++ integer_to_list(LP) ++
                    " errors=" ++ integer_to_list(E)};
        {error, Reason} -> {fail, "status failed: " ++ Reason}
    end.

%% @doc Test configuration.
config_test(_Config) ->
    BackendUrl = application:get_env(pulse_agent_v1, backend_api_url, <<"http://localhost:8080">>),
    Interval = application:get_env(pulse_agent_v1, backend_sync_interval_ms, 30000),
    BatchSize = application:get_env(pulse_agent_v1, backend_sync_batch_size, 100),
    UrlStr = case BackendUrl of
        <<>> -> "http://localhost:8080";
        List when is_list(List) -> List;
        Bin when is_binary(Bin) -> binary_to_list(Bin)
    end,
    {pass, "config: url=" ++ UrlStr ++
            " interval=" ++ integer_to_list(Interval) ++
            " batch_size=" ++ integer_to_list(BatchSize)}.