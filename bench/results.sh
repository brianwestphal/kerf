#!/usr/bin/env bash
#
# Build the aggregated results table from the most recent run and serve
# the upstream viewer on localhost.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="${REPO_ROOT}/bench/.bench-cache/js-framework-benchmark"

if [[ ! -d "${UPSTREAM_DIR}" ]]; then
  echo "Cache not found. Run bench/setup.sh first." >&2
  exit 1
fi

(cd "${UPSTREAM_DIR}/webdriver-ts" && npm run results)
echo
echo "==> Starting results viewer on http://localhost:8080/webdriver-ts-results/"
(cd "${UPSTREAM_DIR}" && npm start)
