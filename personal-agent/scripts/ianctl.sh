#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDFILE="$AGENT_DIR/data/ian.pid"
PYTHON="$AGENT_DIR/.venv/bin/python"
LOG_OUT="$AGENT_DIR/audit/logs/system/stdout.log"
LOG_ERR="$AGENT_DIR/audit/logs/system/stderr.log"

mkdir -p "$AGENT_DIR/data" "$AGENT_DIR/audit/logs/system"

is_running() {
  [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null
}

start_agent() {
  if is_running; then
    echo "IAN already running (PID $(cat "$PIDFILE"))"
    return 0
  fi
  cd "$AGENT_DIR"
  nohup "$PYTHON" -m agent.main >> "$LOG_OUT" 2>> "$LOG_ERR" &
  echo $! > "$PIDFILE"
  echo "IAN started (PID $!)"
}

stop_agent() {
  if is_running; then
    kill "$(cat "$PIDFILE")" 2>/dev/null || true
    rm -f "$PIDFILE"
    echo "IAN stopped"
    return 0
  fi
  rm -f "$PIDFILE"
  echo "IAN not running"
}

case "${1:-status}" in
  start) start_agent ;;
  stop) stop_agent ;;
  restart) stop_agent; sleep 1; start_agent ;;
  status)
    if is_running; then
      echo "IAN running (PID $(cat "$PIDFILE"))"
    else
      echo "IAN stopped"
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 2
    ;;
esac
