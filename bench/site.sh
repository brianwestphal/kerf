#!/usr/bin/env bash
#
# Serve the krausest js-framework-benchmark "1k rows" app for kerfjs and open
# it in your browser — an interactive playground for poking at kerf by hand
# (Create 1,000 rows / Append / Update every 10th / Swap / select / remove),
# NOT a measurement run.
#
# Usage:
#   npm run bench:serve            # rebuild the kerf entry from your working
#                                  #   tree, then serve + open the browser
#   npm run bench:serve -- --no-build   # skip the rebuild; serve whatever's
#                                       #   already built in the cache (fast)
#
# What it does:
#   1. First run only: bootstraps the benchmark cache via bench/setup.sh
#      (shallow-clones the upstream harness + builds the reference frameworks).
#   2. Otherwise: rebuilds ONLY the kerfjs entry from your current working tree
#      (build → pack → reinstall into the cache), so what you click on is the
#      kerf you have checked out right now — reference frameworks are left as-is.
#   3. Starts the upstream static server on http://localhost:8080 and opens the
#      kerfjs page. Ctrl-C stops the server.
#
# This is the interactive sibling of bench/run.sh (headless measurement) and
# bench/dev-server.sh (serve-only, no auto-open, no working-tree rebuild).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BENCH_DIR="${REPO_ROOT}/bench"
UPSTREAM_DIR="${BENCH_DIR}/.bench-cache/js-framework-benchmark"
DEST="${UPSTREAM_DIR}/frameworks/keyed/kerfjs"
PORT=8080
# The built entry (customURL: "/dist") — the source index.html references
# /src/main.tsx, which the static server can't transform, so always open dist/.
URL="http://localhost:${PORT}/frameworks/keyed/kerfjs/dist/index.html"

BUILD=1
for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=0 ;;
    -h|--help) sed -n '2,26p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg (try --no-build)" >&2; exit 2 ;;
  esac
done

# Cross-platform "open this URL in the default browser".
open_browser() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then open "$url"            # macOS
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url"  # Linux
  elif command -v start >/dev/null 2>&1; then start "" "$url"     # Windows/Git Bash
  else echo "==> Open this URL manually: $url"; fi
}

# 1. First-time bootstrap if the cache isn't there yet. setup.sh builds the
#    kerfjs entry from the working tree as part of its run, so there's no need
#    to rebuild it again below on that path.
if [[ ! -d "${UPSTREAM_DIR}/.git" ]]; then
  echo "==> No benchmark cache yet — running one-time setup (this clones the"
  echo "    upstream harness and builds the reference frameworks; grab a coffee)."
  bash "${BENCH_DIR}/setup.sh"
  BUILD=0
fi

# 2. Rebuild just the kerfjs entry from the current working tree.
if [[ "${BUILD}" -eq 1 ]]; then
  echo "==> Rebuilding the kerfjs entry from your working tree"
  cd "${REPO_ROOT}"
  npm run build >/dev/null
  TARBALL="$(npm pack | tail -n1)"
  TARBALL_ABS="${REPO_ROOT}/${TARBALL}"

  rsync -a \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude 'package-lock.json' \
    "${BENCH_DIR}/kerfjs-impl/" "${DEST}/"

  # Point the entry's kerfjs dependency at the freshly packed local tarball.
  node - "$DEST/package.json" "$TARBALL_ABS" <<'NODE'
const fs = require('fs');
const [, , pkgPath, tarball] = process.argv;
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies.kerfjs = `file:${tarball}`;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
NODE

  # Force a fresh extract of the tarball: npm can skip reinstalling a file:
  # dependency whose version + path are unchanged, which would serve stale kerf.
  rm -rf "${DEST}/node_modules/kerfjs"
  (cd "${DEST}" && npm install >/dev/null && npm run build-prod >/dev/null)
  rm -f "${TARBALL_ABS}"
  echo "    done."
fi

# 3. Serve + open. Start the server in the background, wait for it to accept
#    connections, open the browser, then hand the foreground back to the server
#    so Ctrl-C stops it.
echo "==> Starting benchmark server on http://localhost:${PORT}"
(cd "${UPSTREAM_DIR}/server" && npm start) &
SERVER_PID=$!
trap 'kill "${SERVER_PID}" 2>/dev/null || true' EXIT INT TERM

for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://localhost:${PORT}/css/currentStyle.css"; then
    break
  fi
  # Bail early if the server died on startup (e.g. port already in use).
  kill -0 "${SERVER_PID}" 2>/dev/null || { echo "Server exited before it was ready." >&2; exit 1; }
  sleep 0.5
done

echo "==> Opening ${URL}"
echo "    (Ctrl-C to stop the server.)"
open_browser "${URL}"

wait "${SERVER_PID}"
