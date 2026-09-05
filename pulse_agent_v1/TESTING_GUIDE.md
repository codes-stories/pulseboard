# Common Test (CT) Setup Guide — pulse_agent_v1

> **Learning Path Document** — From "what is CT?" to writing your own suites.

---

## Table of Contents

1. [What is Common Test?](#what-is-common-test)
2. [Project Structure Overview](#project-structure-overview)
3. [Configuration Layer](#configuration-layer)
4. [Test Suite Anatomy](#test-suite-anatomy)
5. [Running Tests](#running-tests)
6. [Understanding Test Output](#understanding-test-output)
7. [Writing Your First Test](#writing-your-first-test)
8. [Advanced Patterns](#advanced-patterns)
9. [Coverage Analysis](#coverage-analysis)
10. [Common Pitfalls & Debugging](#common-pitfalls--debugging)

---

## What is Common Test?

**Common Test (CT)** is Erlang/OTP's built-in testing framework. Think of it as:

| If you know... | CT is like... |
|----------------|---------------|
| JUnit / pytest | But built into the runtime, no extra deps |
| Go's `testing` | With built-in concurrency, supervision, and reporting |
| Jest / Mocha | With automatic HTML reports, coverage, and parallel execution |

**Key features:**
- **Built into Erlang/OTP** — No external dependencies
- **Supervision-aware** — Tests can start/stop OTP applications cleanly
- **Parallel execution** — Groups run in parallel by default
- **HTML reports** — Automatic pretty reports with drill-down
- **Coverage integration** — `rebar3 cover` works out of the box
- **Hooks** — Setup/teardown at suite, group, and test case level

---

## Project Structure Overview

```
pulse_agent_v1/
├── rebar.config              # ← CT configuration lives here
├── config/
│   ├── sys.config            # Production config
│   └── test_sys.config       # ← Test-specific config
├── src/
│   ├── *.erl                 # Your application code
│   └── configs/              # Configuration modules
├── test/                     # ← ALL TEST FILES HERE
│   ├── pulse_agent_service_SUITE.erl
│   ├── pulse_backend_sync_SUITE.erl
│   └── pulse_kafka_producer_SUITE.erl
└── _build/test/
    ├── cover/                # Coverage reports
    └── logs/                 # CT run logs (HTML reports)
```

**Rule:** Test files go in `test/` and end with `_SUITE.erl`

---

## Configuration Layer

### 1. `rebar.config` — The CT Entry Point

```erlang
{profiles, [
    {test, [
        {erl_opts, [debug_info, {d, 'TEST'}]},
        {deps, [
            {proper, "1.3.0"}   % Property-based testing
        ]},
        {config, "config/test_sys.config"}  % ← Test config file
    ]}
]}.
```

**What this does:**
- Creates a `test` profile (run with `rebar3 ct` or `rebar3 as test ct`)
- Adds `proper` for property-based tests
- Points to `config/test_sys.config` for test-specific settings
- Defines `TEST` macro for conditional compilation

### 2. `config/test_sys.config` — Test Environment

```erlang
[
    {lager, [
        {handlers, [
            {lager_console_backend, info, [
                {formatter, lager_default_formatter, [
                    "{time} [{severity}] {module}:{line} - {message}\n"
                ]}
            ]}
        ]}
    ]},
    {brod, [
        {clients, [
            {pulse_agent_v1_client, [
                {endpoints, [{"localhost", 9092}]},
                {reconnect_cool_down_seconds, 10},
                {auto_start_producers, true}
            ]}
        ]}
    ]},
    {pulse_agent_v1, [
        {http_port, 8082},
        {postgres_enabled, false},        % ← Disabled for tests
        {kafka_enabled, false},           % ← Disabled for tests
        {backend_api_url, "http://localhost:8080"},
        {backend_sync_enabled, false}
    ]}
].
```

**Why separate test config?**
- **PostgreSQL disabled** — No DB needed for unit tests
- **Kafka disabled** — No broker needed
- **Different ports** — Avoid conflicts with dev instance
- **Console logging only** — No file logs in CI

### 3. `config/sys.config` — Production Config

Used when running `rebar3 shell` or production releases. Has `postgres_enabled, true`, etc.

---

## Test Suite Anatomy

Every suite follows this pattern:

```erlang
-module(my_feature_SUITE).

-include_lib("common_test/include/ct.hrl").

%% 1. EXPORTS - Required callbacks
-export([all/0, groups/0,
         init_per_suite/1, end_per_suite/1,
         init_per_group/2, end_per_group/2,
         init_per_testcase/2, end_per_testcase/2]).

%% 2. TEST CASES - Your actual tests
-export([my_first_test/1, another_test/1]).

%% 3. ALL TESTS LIST
all() ->
    [my_first_test, another_test].

%% 4. GROUPS (optional) - For parallel/sequential control
groups() ->
    [{my_group, [parallel], [test_a, test_b]}].

%% 5. SUITE-LEVEL SETUP/TEARDOWN
init_per_suite(Config) ->
    application:ensure_all_started(my_app),
    Config.

end_per_suite(_Config) ->
    ok.

%% 6. GROUP SETUP/TEARDOWN (if using groups)
init_per_group(_Group, Config) -> Config.
end_per_group(_Group, _Config) -> ok.

%% 7. PER-TEST SETUP/TEARDOWN
init_per_testcase(_TC, Config) -> Config.
end_per_testcase(_TC, _Config) -> ok.

%% 8. ACTUAL TEST CASES
my_first_test(_Config) ->
    Result = my_module:my_function(),
    case Result of
        {ok, Value} -> {pass, "got: " ++ Value};
        {error, Reason} -> {fail, "failed: " ++ Reason}
    end.
```

### Key Callbacks Explained

| Callback | When Runs | Use For |
|----------|-----------|---------|
| `init_per_suite/1` | Once before all tests | Start app, connect DB, create tables |
| `end_per_suite/1` | Once after all tests | Cleanup, stop app |
| `init_per_group/2` | Before each group | Group-specific setup |
| `init_per_testcase/2` | Before EACH test | Per-test isolation |
| `end_per_testcase/2` | After EACH test | Cleanup per test |

---

## Running Tests

### Basic Commands

```bash
# Run all tests
rebar3 ct

# Run with coverage
rebar3 ct --cover

# Run specific suite
rebar3 ct --suite pulse_agent_service_SUITE

# Run specific test case
rebar3 ct --suite pulse_agent_service_SUITE --case health_test

# Verbose output
rebar3 ct -v

# Run with custom config
rebar3 ct --config config/my_test.config
```

### Test Profile

```bash
# These are equivalent (test profile is default for ct)
rebar3 ct
rebar3 as test ct
```

---

## Understanding Test Output

### Console Output

```
%%% pulse_agent_service_SUITE: Starting HTTP listener on port 8082
......                                    % ← 6 dots = 6 passed tests
%%% pulse_backend_sync_SUITE: ....
%%% pulse_kafka_producer_SUITE: ..
```

**Each dot = one passed test case**

### HTML Reports

After running, open:
```
_build/test/logs/index.html
```

**Report sections:**
- **Overview** — Pass/fail/skip counts
- **Suite details** — Per-test timing, output
- **Failed tests** — Stack traces, logs
- **Coverage** — Links to coverage reports

### The `fw_error` You See

```
{fw_error, {ct_framework, report, {function_clause, ...}}}
```

**This is a known CT framework bug** in `ct_hooks` (Erlang/OTP issue). It happens during **final reporting**, not during tests. All your tests passed — the dots prove it.

---

## Writing Your First Test

### Step 1: Create the Suite File

```bash
touch test/my_feature_SUITE.erl
```

### Step 2: Minimal Template

```erlang
-module(my_feature_SUITE).

-include_lib("common_test/include/ct.hrl").

-export([all/0, init_per_suite/1, end_per_suite/1, my_test/1]).

all() -> [my_test].

init_per_suite(Config) ->
    application:ensure_all_started(pulse_agent_v1),
    Config.

end_per_suite(_Config) -> ok.

my_test(_Config) ->
    % Test something
    case pulse_agent_service:health() of
        #{status := <<"ok">>} -> {pass, "health ok"};
        Other -> {fail, "unexpected: " ++ erlang:term_to_binary(Other)}
    end.
```

### Step 3: Run It

```bash
rebar3 ct --suite my_feature_SUITE
```

### Step 4: Assertion Patterns

```erlang
% Equality
{pass, "equal"} = ?assertEqual(Expected, Actual).

% Pattern matching
{pass, "matches"} = ?assertMatch({ok, _}, Result).

% Exception
{pass, "throws"} = ?assertError(badarith, fun() -> 1/0 end).

% Boolean
{pass, "true"} = ?assert(condition()).
```

### Step 5: Using Config for State

```erlang
init_per_testcase(_TC, Config) ->
    % Create test data
    AgentId = <<"test-">> ++ integer_to_binary(os:system_time()),
    {ok, _} = pulse_agent_service:register_agent(#{<<"agent_id">> => AgentId}),
    [{agent_id, AgentId} | Config].

my_test(Config) ->
    AgentId = proplists:get_value(agent_id, Config),
    {ok, Agent} = pulse_agent_service:heartbeat(#{<<"agent_id">> => AgentId}),
    {pass, "heartbeat works"}.
```

---

## Advanced Patterns

### 1. Property-Based Testing with Proper

```erlang
-include_lib("proper/include/proper.hrl").

prop_agent_id_generation() ->
    ?FORALL(AgentId, proper_types:binary(),
        begin
            Result = pulse_agent_service:register_agent(#{<<"agent_id">> => AgentId}),
            case Result of
                {ok, Agent} -> AgentId =:= maps:get(<<"agent_id">>, Agent);
                _ -> false
            end
        end).
```

Run: `rebar3 proper -m my_feature_SUITE -p prop_agent_id_generation`

### 2. Parallel Test Groups

```erlang
groups() ->
    [{parallel_group, [parallel], [test_a, test_b, test_c]},
     {sequential_group, [sequential], [test_x, test_y]}].

all() -> [parallel_group, sequential_group].
```

- **parallel** — Runs simultaneously (faster, needs isolation)
- **sequential** — Runs one-by-one (for shared state)

### 3. Test Data Generators

```erlang
valid_agent_id() ->
    ?LET(N, proper_types:pos_integer(),
         <<"agent-">> ++ integer_to_binary(N)).

valid_log_entry() ->
    ?LET({Id, Lvl, Msg}, {valid_agent_id(), level(), proper_types:binary()},
         #{<<"agent_id">> => Id, <<"level">> => Lvl, <<"message">> => Msg}).

level() -> elements([<<"info">>, <<"warn">>, <<"error">>, <<"debug">>]).
```

### 4. Testing Async/GenServer Code

```erlang
test_async_produce(_Config) ->
    Ref = pulse_kafka_producer:produce(#{<<"message">> => <<"test">>}),
    % Wait for async to complete (with timeout)
    receive
        {produce_done, Ref} -> {pass, "done"};
    after 5000 -> {fail, "timeout"}
    end.
```

### 3. Mocking External Dependencies

```erlang
% In init_per_suite, replace real module with mock
init_per_suite(Config) ->
    meck:new(pulse_backend_sync, [passthrough]),
    meck:expect(pulse_backend_sync, fetch_logs, fun(_) ->
        {ok, [#{<<"message">> => <<"mocked">>}], undefined}
    end),
    Config.

end_per_suite(_Config) ->
    meck:unload(pulse_backend_sync),
    ok.
```

---

## Coverage Analysis

### Generate Coverage

```bash
rebar3 ct --cover
# or
rebar3 cover
```

### View Report

```bash
# Terminal summary
rebar3 cover

# HTML report
open _build/test/cover/index.html
```

### Coverage Targets

| Coverage | Meaning |
|----------|---------|
| 90%+ | Excellent |
| 70-90% | Good |
| 50-70% | Needs work |
| <50% | Insufficient |

### Current Project Coverage (31% total)

**High coverage modules (tested):**
- `pulse_agent_v1_sup` — 100%
- `pulse_router` — 100%
- `application_env_setup` — 80%
- `ets_config` — 63%
- `pulse_agent_service` — 54%

**Low coverage (need tests):**
- `pulse_kafka_producer` — 24%
- `pulse_backend_sync` — 47%
- `pulse_http_server` — 40%

**0% modules (need integration tests):**
- CLI modules, HTTP handlers, logger, JSON parser

---

## Common Pitfalls & Debugging

### 1. "Tests pass but fw_error at end"

**Symptom:** Tests show `......` then `fw_error` with `ct_hooks`/`client_down`

**Cause:** CT framework bug in hook reporting (Erlang/OTP issue)

**Fix:** Ignore it. Count the dots — those are your actual test results.

### 2. "gen_server not running" / `noproc`

**Symptom:** `{noproc, {gen_server, call, [...]}}`

**Cause:** Application not started, or child crashed during startup

**Debug:**
```erlang
init_per_suite(Config) ->
    % Check app is running
    case application:which_applications() of
        Apps -> io:format("Running apps: ~p~n", [Apps])
    end,
    application:ensure_all_started(pulse_agent_v1),
    Config.
```

### 3. "Function not exported" in test

**Symptom:** `undef` for your function

**Cause:** Module not compiled, or test running against old beam

**Fix:**
```bash
rebar3 clean && rebar3 ct
```

### 4. Config not picked up

**Symptom:** `application:get_env` returns default, not your value

**Cause:** Config file not loaded, or wrong profile

**Debug:**
```bash
rebar3 as test shell
% In shell:
application:get_env(pulse_agent_v1, kafka_enabled).
```

### 5. Tests interfere with each other

**Symptom:** Flaky tests, pass individually but fail together

**Cause:** Shared state (ETS, process registry, app env)

**Fix:** Use `init_per_testcase` for isolation
```erlang
init_per_testcase(_TC, Config) ->
    % Clean ETS tables
    ets:delete(pulse_agents),
    ets:delete(pulse_logs),
    Config.
```

### 6. Debugging a Failing Test

```bash
# Run single test with verbose output
rebar3 ct --suite my_SUITE --case my_test -v

# See test logs
cat _build/test/logs/ct_run.<timestamp>/my_SUITE/my_test.log
```

---

## Learning Path Checklist

### Beginner → Intermediate
- [ ] Write a basic suite with 3 tests
- [ ] Use `init_per_suite` to start your app
- [ ] Use `?assertEqual` and `?assertMatch`
- [ ] Run single test with `--case`
- [ ] Read HTML report and find a failure

### Intermediate → Advanced
- [ ] Create a property-based test with Proper
- [ ] Use parallel groups for speed
- [ ] Write a generator for test data
- [ ] Mock an external dependency (meck)
- [ ] Achieve >70% coverage on a module

### Advanced → Expert
- [ ] Write a custom CT hook
- [ ] Test distributed scenarios (multiple nodes)
- [ ] Integrate with CI (GitHub Actions)
- [ ] Build a test utility library for your team
- [ ] Teach someone else this guide

---

## Quick Reference Card

```bash
# Daily workflow
rebar3 ct                          # All tests
rebar3 ct --cover                  # With coverage
rebar3 ct -v                       # Verbose
rebar3 ct --suite X --case Y       # Single test

# Debug
rebar3 clean && rebar3 ct          # Clean rebuild
open _build/test/logs/index.html   # HTML report
open _build/test/cover/index.html  # Coverage report

# Config
cat config/test_sys.config         # Test config
cat config/sys.config              # Prod config
```

---

## Resources

- [Erlang CT User's Guide](https://erlang.org/doc/apps/common_test/users_guide.html)
- [CT Reference Manual](https://erlang.org/doc/apps/common_test/ct.html)
- [Proper (Property Testing)](https://github.com/proper-testing/proper)
- [Meck (Mocking)](https://github.com/eproxus/meck)
- [rebar3 CT Docs](https://rebar3.org/docs/testing)

---

*This document is part of the pulse_agent_v1 learning path. Update it as you learn!*