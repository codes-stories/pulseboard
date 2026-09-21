#!/bin/sh

set -e

mkdir -p /opt/pulse-agent/log

exec /opt/pulse-agent/bin/pulse_agent_v1 foreground