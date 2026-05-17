#!/usr/bin/env bash
# One-shot official krausest bench run, scheduled for 02:00 PT 2026-05-17.
# Replaces the failed 17:00 PT 2026-05-16 attempt (preflight rejected the
# machine: 1-min load avg 2.68 ≥ 2.0). Per user direction, falling back to
# the canonical 2 AM cadence.
#
# Detached from the Claude Code session via nohup ... & disown (same
# pattern as KF-196 — launchd-managed jobs fail because they don't
# inherit the Documents TCC grant on this machine).

set -u
cd /Users/westphal/Documents/kerf

LOG=/Users/westphal/Documents/kerf/bench/.official-run.log
exec >>"$LOG" 2>&1

echo
echo "===== Official run rescheduled for 02:00 PT 2026-05-17 ====="
echo "[$(date)] Script started; sleeping until 02:00 tomorrow."

TARGET_EPOCH=$(date -j -f "%Y-%m-%d %H:%M" "2026-05-17 02:00" +%s)
NOW_EPOCH=$(date +%s)
DELAY=$((TARGET_EPOCH - NOW_EPOCH))
if [ "$DELAY" -gt 0 ]; then
  sleep "$DELAY"
fi

echo "[$(date)] Woke up. Cleaning stale per-framework result JSONs."
rm -f /Users/westphal/Documents/kerf/bench/.bench-cache/js-framework-benchmark/webdriver-ts/results/*.json

echo "[$(date)] Re-setting up bench cache (idempotent — rebuilds kerf, refreshes frameworks)."
bash bench/setup.sh
if [ $? -ne 0 ]; then
  echo "[$(date)] FAIL: setup.sh exited non-zero. Aborting."
  exit 1
fi

echo "[$(date)] Running bench/run.sh --count 10 (NO --force — preflight enforces clean machine)."
bash bench/run.sh --count 10
RUN_EXIT=$?
echo "[$(date)] bench/run.sh exited with $RUN_EXIT."
if [ "$RUN_EXIT" -ne 0 ]; then
  echo "[$(date)] FAIL: run aborted (likely preflight failure). Not aggregating."
  exit "$RUN_EXIT"
fi

echo "[$(date)] Aggregating results into bench/results.md + bench/results.json."
node bench/aggregate-results.mjs > bench/results.md
echo "[$(date)] Aggregation done."

echo "[$(date)] OFFICIAL RUN COMPLETE."
echo "Results: /Users/westphal/Documents/kerf/bench/results.md"
echo "JSON:    /Users/westphal/Documents/kerf/bench/results.json"

/usr/bin/osascript -e 'display notification "Official krausest bench run complete. See bench/results.md." with title "kerf bench" sound name "Glass"' 2>/dev/null || true
