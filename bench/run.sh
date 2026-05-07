#!/usr/bin/env bash
#
# Run js-framework-benchmark against kerfjs and the reference frameworks
# previously built by bench/setup.sh.
#
# Usage:
#   bench/run.sh                       # run the default framework set
#   bench/run.sh keyed/solid           # also include solid only
#   bench/run.sh --headless=false ...  # forward extra flags to webdriver-ts
#
# Results are written to:
#   bench/.bench-cache/js-framework-benchmark/webdriver-ts/results/
#
# To view aggregated results in a browser:
#   bench/results.sh   (starts the upstream results viewer on localhost)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="${REPO_ROOT}/bench/.bench-cache/js-framework-benchmark"

if [[ ! -d "${UPSTREAM_DIR}" ]]; then
  echo "Cache not found. Run bench/setup.sh first." >&2
  exit 1
fi

DEFAULT_FRAMEWORKS=(
  "keyed/kerfjs"
  "non-keyed/vanillajs"
  "keyed/solid"
  "keyed/react-hooks"
  "keyed/vue"
)

# Split args into "framework selectors" (no leading dash) and "passthrough flags".
FRAMEWORKS=()
PASSTHROUGH=()
for arg in "$@"; do
  if [[ "${arg}" == --* || "${arg}" == -* ]]; then
    PASSTHROUGH+=("${arg}")
  else
    FRAMEWORKS+=("${arg}")
  fi
done

if [[ ${#FRAMEWORKS[@]} -eq 0 ]]; then
  FRAMEWORKS=("${DEFAULT_FRAMEWORKS[@]}")
fi

echo "==> Starting upstream HTTP server in the background"
(cd "${UPSTREAM_DIR}" && npm start >/tmp/jfb-server.log 2>&1) &
SERVER_PID=$!
trap 'kill ${SERVER_PID} 2>/dev/null || true' EXIT

# Wait for the server to come up.
for _ in {1..30}; do
  if curl -sf http://localhost:8080/ >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "==> Running benchmarks: ${FRAMEWORKS[*]}"
(cd "${UPSTREAM_DIR}/webdriver-ts" \
  && npm run bench -- --headless --framework "${FRAMEWORKS[@]}" ${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"})

echo
echo "==> Done. Raw results: ${UPSTREAM_DIR}/webdriver-ts/results/"
echo "    To view aggregated table: bench/results.sh"
