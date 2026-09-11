#!/bin/sh

set -e

# Pulse Agent Entrypoint
# Uses the release script to start the application properly

# Set up environment
export ROOTDIR="/opt/pulse-agent"
export BINDIR="/opt/pulse-agent/erts-14.2.5.15/bin"
export EMU="beam"
export PROGNAME="erl"
export LD_LIBRARY_PATH="/opt/pulse-agent/erts-14.2.5.15/lib:$LD_LIBRARY_PATH"

# Use the release script directly
exec /opt/pulse-agent/bin/pulse_agent_v1 console