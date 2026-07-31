pulse_agent
=====

An OTP application

Build
-----

    $ rebar3 compile

Runtime and status checks
-------------------------

From the repository root, start each process in a separate terminal:

    $ make start-api
    $ make start-agent

Check the Go API health endpoint:

    $ make status-api

Print the agent's local connection state (`connected`, `connection`, and
`last_error`):

    $ make status-agent

Logging and Common Test
-----------------------

The release config writes OTP logs at `info` level to standard output. Set
`-kernel logger_level debug` when starting a release to increase verbosity.

Run the agent's Common Test suite with:

    $ make test-agent-ct

Common Test logs are written beneath `_build/test/logs/ct`.
