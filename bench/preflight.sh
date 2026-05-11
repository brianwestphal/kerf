#!/usr/bin/env bash
#
# Pre-flight system check for clean benchmark runs.
#
# The published numbers in bench/results.md are only useful if the host
# is quiet when the bench runs. This script blocks the run if it detects
# anything that would inject noise: high load, battery power, low-power
# mode, thermal throttling, or a competing high-CPU process.
#
# Usage:
#   bench/preflight.sh                  # run all checks, exit nonzero on failure
#   source bench/preflight.sh; preflight  # use as a library from run.sh
#
# Override (intentional noisy run):
#   bench/preflight.sh --force
#   KERF_BENCH_FORCE=1 bench/preflight.sh
#
# Tunable thresholds (override via env):
#   BENCH_LOAD_MAX        1-min load avg ceiling                  (default 2.0)
#   BENCH_OTHER_CPU_MAX   per-process CPU% ceiling (other procs)  (default 25)

set -uo pipefail

: "${BENCH_LOAD_MAX:=2.0}"
: "${BENCH_OTHER_CPU_MAX:=25}"

_preflight_uname="$(uname)"

_preflight_load() {
  local load=""
  if [[ "${_preflight_uname}" == "Darwin" ]]; then
    load=$(sysctl -n vm.loadavg 2>/dev/null | awk '{print $2}')
  elif [[ -r /proc/loadavg ]]; then
    load=$(awk '{print $1}' /proc/loadavg)
  fi
  # Fail closed when we can't measure load — don't pretend everything is fine.
  if [[ -z "${load}" ]]; then
    echo "FAIL  Couldn't read 1-min load avg (sysctl / /proc/loadavg unavailable)"
    echo "      → run outside any sandbox that blocks sysctl, or pass --force"
    return 1
  fi
  if awk -v l="${load}" -v max="${BENCH_LOAD_MAX}" 'BEGIN { exit !(l+0 >= max+0) }'; then
    echo "FAIL  1-min load avg ${load} >= ${BENCH_LOAD_MAX}"
    echo "      → wait for the system to quiet down, or raise BENCH_LOAD_MAX"
    return 1
  fi
  echo "OK    1-min load avg ${load} (max ${BENCH_LOAD_MAX})"
  return 0
}

_preflight_ac_power() {
  if [[ "${_preflight_uname}" == "Darwin" ]]; then
    if pmset -g batt 2>/dev/null | grep -q "Battery Power"; then
      echo "FAIL  Running on battery — CPU will throttle aggressively"
      echo "      → plug in the charger"
      return 1
    fi
  elif [[ -f /sys/class/power_supply/AC/online ]]; then
    if [[ "$(cat /sys/class/power_supply/AC/online)" != "1" ]]; then
      echo "FAIL  Not on AC power"
      echo "      → plug in the charger"
      return 1
    fi
  else
    echo "SKIP  AC-power check (no detection method for this platform)"
    return 0
  fi
  echo "OK    AC power"
  return 0
}

_preflight_lowpower() {
  [[ "${_preflight_uname}" == "Darwin" ]] || return 0
  local lpm
  lpm=$(pmset -g 2>/dev/null | awk '/lowpowermode/ { print $2 }')
  if [[ "${lpm}" == "1" ]]; then
    echo "FAIL  macOS Low Power Mode is enabled"
    echo "      → sudo pmset -a lowpowermode 0"
    return 1
  fi
  echo "OK    Low Power Mode off"
  return 0
}

_preflight_thermal() {
  [[ "${_preflight_uname}" == "Darwin" ]] || return 0
  # `pmset -g therm` doesn't require sudo and emits nothing on Apple Silicon
  # when the system is happy. Treat empty / missing as "no throttle reported".
  local limit
  limit=$(pmset -g therm 2>/dev/null | awk '/CPU_Speed_Limit/ { print $3 }')
  if [[ -z "${limit}" ]]; then
    echo "OK    No thermal throttle reported"
    return 0
  fi
  if [[ "${limit}" -lt 100 ]]; then
    echo "FAIL  CPU is thermal-throttled to ${limit}%"
    echo "      → let the machine cool down, then retry"
    return 1
  fi
  echo "OK    Thermal headroom (CPU_Speed_Limit ${limit}%)"
  return 0
}

_preflight_other_processes() {
  # ps -A: all processes. pcpu is short-term CPU %; values above the threshold
  # at preflight time mean something else is running flat-out *before* the
  # bench even starts. Exclude the WindowServer / kernel_task baselines that
  # are always hot on macOS, and the preflight shell itself.
  local me=$$ parent=${PPID:-0}
  local hot
  hot=$(ps -A -o pid=,pcpu=,comm= 2>/dev/null \
    | awk -v me="${me}" -v parent="${parent}" -v max="${BENCH_OTHER_CPU_MAX}" '
        $1 == me || $1 == parent { next }
        $3 ~ /WindowServer|kernel_task|launchd$/ { next }
        $2+0 > max+0 {
          # rebuild comm column (may contain spaces / paths)
          cmd = ""
          for (i = 3; i <= NF; i++) cmd = cmd (i > 3 ? " " : "") $i
          printf "      %5d %5.1f%%  %s\n", $1, $2, cmd
        }
      ' | head -5)
  if [[ -n "${hot}" ]]; then
    echo "FAIL  Other processes are using > ${BENCH_OTHER_CPU_MAX}% CPU:"
    echo "${hot}"
    echo "      → quit them and retry, or pass --force"
    return 1
  fi
  echo "OK    No competing high-CPU processes (> ${BENCH_OTHER_CPU_MAX}%)"
  return 0
}

_preflight_paging() {
  # Heavy paging during a run = noisy memory numbers. Warn-only because
  # vm_stat is cumulative-since-boot and a meaningful "right now" signal
  # would need two samples a second apart, which costs us a second on every
  # preflight call. Worth flagging only when the cumulative number is huge.
  [[ "${_preflight_uname}" == "Darwin" ]] || return 0
  local pageouts
  pageouts=$(vm_stat 2>/dev/null | awk -F'[: .]+' '/^Pageouts/ { print $2 }')
  if [[ -n "${pageouts}" && "${pageouts}" -gt 1000000 ]]; then
    echo "WARN  cumulative pageouts since boot: ${pageouts} — memory pressure may be in play"
  fi
  return 0
}

preflight() {
  if [[ "${KERF_BENCH_FORCE:-0}" == "1" ]]; then
    echo "==> Pre-flight skipped (KERF_BENCH_FORCE=1)"
    return 0
  fi
  echo "==> Pre-flight system check (KERF_BENCH_FORCE=1 or --force to skip)"
  local rc=0
  _preflight_load            || rc=1
  _preflight_ac_power        || rc=1
  _preflight_lowpower        || rc=1
  _preflight_thermal         || rc=1
  _preflight_other_processes || rc=1
  _preflight_paging          || rc=1
  if [[ ${rc} -ne 0 ]]; then
    echo
    echo "Pre-flight failed. Address the items above, or re-run with --force." >&2
    return 1
  fi
  echo "    all checks passed"
  return 0
}

# Direct execution: support a `--force` flag, then run preflight.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  for arg in "$@"; do
    if [[ "${arg}" == "--force" ]]; then
      export KERF_BENCH_FORCE=1
    fi
  done
  preflight
fi
