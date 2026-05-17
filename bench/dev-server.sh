#!/usr/bin/env bash
#
# Serve the krausest js-framework-benchmark in a real (non-headless) browser
# so you can profile in Chrome devtools. Used for KF-205-style perf
# investigations where the headless puppeteer run from `bench/run.sh` is the
# wrong shape (no devtools, no flame charts, no style-recalc timing).
#
# Usage:
#   bench/dev-server.sh
#   # then open the URL it prints in Chrome, navigate to:
#   #   http://localhost:8080/frameworks/keyed/kerfjs/index.html
#   # open devtools → Performance → record → click bench buttons → stop
#
# This DOES NOT run preflight checks — it's an interactive tool, not a
# measurement run. Quitting the server is Ctrl-C.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="${REPO_ROOT}/bench/.bench-cache/js-framework-benchmark"

if [[ ! -d "${UPSTREAM_DIR}" ]]; then
  echo "Cache not found. Run bench/setup.sh first." >&2
  exit 1
fi

cat <<EOF
==> Starting upstream js-framework-benchmark server on http://localhost:8080

Open in Chrome:
  http://localhost:8080/frameworks/keyed/kerfjs/index.html

For Chrome devtools profiling:
  1. Open DevTools (Cmd-Option-I) → Performance panel.
  2. Click 'Create 1,000 rows' to seed the table.
  3. Start recording (Cmd-E).
  4. Click 'Update every 10th row' (partial-update) or one row's text
     (select-row).
  5. Stop recording. The flame chart shows where time went.
  6. Export the trace via the download icon in the Performance panel.

Ctrl-C to stop the server when done.
EOF

cd "${UPSTREAM_DIR}"
exec npm start
</content>
