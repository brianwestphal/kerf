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
# Use the --flag=value single-token form for any webdriver-ts flag that takes
# a value (e.g. --count=5, --browser=chrome). The bare two-token form
# `--count 5` would route the `5` into the framework list — the validation
# check below catches that and aborts loudly. (KF-207)
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
  "keyed/preact-signals"
  "keyed/lit"
  "keyed/vanjs"
)

# Split args into "framework selectors" (no leading dash) and "passthrough flags".
# `--force` is consumed by us (skip preflight) and NOT forwarded to webdriver-ts.
#
# KF-207: the bare two-token form `--count 5` would route `5` here as a
# framework selector and silently produce a zero-framework no-op run. The
# framework-existence check below catches that case loudly; the README directs
# callers to the canonical `--count=5` single-token form.
FRAMEWORKS=()
PASSTHROUGH=()
for arg in "$@"; do
  if [[ "${arg}" == "--force" ]]; then
    export KERF_BENCH_FORCE=1
  elif [[ "${arg}" == --* || "${arg}" == -* ]]; then
    PASSTHROUGH+=("${arg}")
  else
    FRAMEWORKS+=("${arg}")
  fi
done

if [[ ${#FRAMEWORKS[@]} -eq 0 ]]; then
  FRAMEWORKS=("${DEFAULT_FRAMEWORKS[@]}")
fi

# KF-207: validate each framework selector resolves to a built framework
# directory under frameworks/<keyed|non-keyed>/<name>. Catches typos and the
# `--count 5` two-token-form misuse before webdriver-ts silently consumes
# the bad token as a framework name and produces a no-op run.
INVALID_FRAMEWORKS=()
for fw in "${FRAMEWORKS[@]}"; do
  if [[ ! -d "${UPSTREAM_DIR}/frameworks/${fw}" ]]; then
    INVALID_FRAMEWORKS+=("${fw}")
  fi
done
if [[ ${#INVALID_FRAMEWORKS[@]} -gt 0 ]]; then
  echo "Error: unknown framework selector(s): ${INVALID_FRAMEWORKS[*]}" >&2
  echo "" >&2
  echo "Expected each selector to match a directory under" >&2
  echo "  ${UPSTREAM_DIR}/frameworks/{keyed,non-keyed}/<name>" >&2
  echo "" >&2
  echo "Common cause: the bare two-token form '--count 5' routes the '5' here" >&2
  echo "as a framework name. Use the single-token form '--count=5' instead, so" >&2
  echo "the whole token forwards to webdriver-ts as one passthrough flag." >&2
  exit 1
fi

# KF-139: refuse to run when the host is busy — published bench numbers are
# only useful when the system is quiet. Override with --force or KERF_BENCH_FORCE=1.
# shellcheck source=bench/preflight.sh
source "${REPO_ROOT}/bench/preflight.sh"
if ! preflight; then
  exit 1
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
# Passthrough flags must come BEFORE --framework, since --framework takes a
# variadic list and any flag landing after it would be parsed as a framework
# name instead.
(cd "${UPSTREAM_DIR}/webdriver-ts" \
  && npm run bench -- --headless ${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"} --framework "${FRAMEWORKS[@]}")

echo
echo "==> Done. Raw results: ${UPSTREAM_DIR}/webdriver-ts/results/"
echo "    To view aggregated table: bench/results.sh"
