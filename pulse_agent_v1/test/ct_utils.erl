-module(ct_utils).

%% utility functions for common_test suites
-export([ensure_started_ct_applications/0]).

%% server stetup and teardown functions for TEST_SUITE only.
ensure_started_ct_applications() ->
    application:ensure_all_started(pulse_agent_v1),
    application:ensure_all_started(brod),
    application:ensure_all_started(lager),
    application:ensure_all_started(ets_config),
    application:ensure_all_started(psql).
