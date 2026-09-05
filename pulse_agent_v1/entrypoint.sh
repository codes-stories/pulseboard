#!/bin/sh

set -e

# Pulse Agent Entrypoint
# Starts the Erlang VM with proper initialization

# Set up environment
export ROOTDIR="/opt/pulse-agent"
export BINDIR="/opt/pulse-agent/erts-14.2.5.15/bin"
export EMU="beam"
export PROGNAME="erl"
export LD_LIBRARY_PATH="/opt/pulse-agent/erts-14.2.5.15/lib:$LD_LIBRARY_PATH"

# Configuration paths
CONFIG_PATH="/opt/pulse-agent/releases/1.0.0/sys.config"
VMARGS_PATH="/opt/pulse-agent/releases/1.0.0/vm.args"
REL_DIR="/opt/pulse-agent/releases/1.0.0"

# Read VM arguments and convert to erl flags (prefix with +)
VMARGS=$(cat "$VMARGS_PATH" | grep -v '^#' | grep -v '^$' | sed 's/^/+/' | tr '\n' ' ')

# Start the Erlang VM with application started automatically
exec "$BINDIR/erl" \
    -noinput \
    +Bd \
    -boot "$REL_DIR/start" \
    -mode embedded \
    -boot_var SYSTEM_LIB_DIR /opt/pulse-agent/lib \
    -config "$CONFIG_PATH" \
    $VMARGS \
    -kernel error_logger silent \
    -kernel logger_level warning \
    -noshell \
    -noinput \
    +Bd \
    -mode embedded