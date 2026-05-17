#!/usr/bin/env bash
# One-shot official krausest bench run, scheduled for 02:00 PT 2026-05-18.
# Re-verification of the 5/17 forced run (which finished at 15:51 PT with
# load avg ~9.5 — numbers landed cleanly but the project convention says
# clean-machine official runs gate the homepage publish).
#
# Detached from the Claude Code session via nohup ... & disown (same
# pattern as KF-196 / KF-198+KF-206 attempts — launchd-managed jobs fail
# because they don't inherit the Documents TCC grant on this machine).

set -u
cd /Users/westphal/Documents/kerf

LOG=/Users/westphal/Documents/kerf/bench/.official-run.log
exec >>"$LOG" 2>&1

echo
echo "===== Official re-verification scheduled for 02:00 PT 2026-05-18 ====="
echo "[$(date)] Script started; sleeping until 02:00."

TARGET_EPOCH=$(date -j -f "%Y-%m-%d %H:%M" "2026-05-18 02:00" +%s)
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

# Note the --count=10 form (KF-207): the two-token "--count 10" silently
# routes "10" into the framework selector and runs zero frameworks.
echo "[$(date)] Running bench/run.sh --count=10 (NO --force — preflight enforces clean machine)."
bash bench/run.sh --count=10
RUN_EXIT=$?
echo "[$(date)] bench/run.sh exited with $RUN_EXIT."
if [ "$RUN_EXIT" -ne 0 ]; then
  echo "[$(date)] FAIL: run aborted (likely preflight failure). Not aggregating."
  echo "[$(date)] If you want to force-publish, bench/results.json still has the 5/17 forced numbers."
  exit "$RUN_EXIT"
fi

echo "[$(date)] Aggregating results into bench/results.md + bench/results.json."
node bench/aggregate-results.mjs > bench/results.md
echo "[$(date)] Aggregation done."

echo "[$(date)] OFFICIAL RE-VERIFICATION COMPLETE."
echo "Results: /Users/westphal/Documents/kerf/bench/results.md"
echo "JSON:    /Users/westphal/Documents/kerf/bench/results.json"

/usr/bin/osascript -e 'display notification "Official krausest re-verification complete. See bench/results.md." with title "kerf bench" sound name "Glass"' 2>/dev/null || true
