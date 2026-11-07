#!/usr/bin/env bash
# Regenerate the animated SVG previews under site/public/demos/.
#
# Each complete example app is captured with domotion-svg (a DOM-to-animated-SVG
# renderer that drives the real app in Chromium and serializes the result to a
# self-contained, CSS-animated SVG). The per-app capture scripts live alongside
# this file as <name>.json; each drives the app through the same headline
# interaction its browser smoke spec exercises (todomvc add/toggle, kanban drag,
# chat streaming, dashboard tick, counter-store inc/fetch, cart-htmx swap,
# markdown live preview, row-selector fine-grained select, live-poll no-build
# voting, virtual-list windowing, and router navigation).
#
# Prereqs: Playwright Chromium installed (the repo's browser tests already need
# it). domotion-svg is a root devDependency — its version is pinned in the
# package.json / lockfile, and `npx domotion` resolves the local install.
#
# Run from the repo root:  bash site/scripts/demo-captures/capture-demos.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_ROOT"

SERVE_DIR="$(mktemp -d)"
PORT_FILE="$SERVE_DIR.port"
CONFIG_DIR="site/scripts/demo-captures"
# The app list comes from the one shared module the build scripts use.
read -r -a APPS <<< "$(node --input-type=module -e \
  "import { COMPLETE_APPS } from './site/scripts/lib/complete-apps.mjs'; console.log(COMPLETE_APPS.join(' '));")"
if [[ ${#APPS[@]} -eq 0 ]]; then
  echo "[demos] ERROR: could not read COMPLETE_APPS from site/scripts/lib/complete-apps.mjs" >&2
  exit 1
fi
# Static capture pages under $CONFIG_DIR/pages/<name>/ — not example apps, just
# hand-authored HTML captured as-is (the animated site diagrams etc.). Each has
# a matching <name>.json config like the apps.
PAGES=(architecture getting-started)

cleanup() {
  [[ -n "${SERVE_PID:-}" ]] && kill "$SERVE_PID" 2>/dev/null || true
  rm -rf "$SERVE_DIR" "$PORT_FILE"
  rm -f "$CONFIG_DIR"/.*.capture.json
}
trap cleanup EXIT

# 1. Build each app with a per-app base into the temp serve root so a single
#    static server can host them all at http://127.0.0.1:<port>/<name>/.
echo "[demos] building example apps → $SERVE_DIR"
( cd site && node scripts/build-demos-for-capture.mjs "$SERVE_DIR" )

# 1b. Copy the static capture pages next to the built apps.
for page in "${PAGES[@]}"; do
  cp -R "$CONFIG_DIR/pages/$page" "$SERVE_DIR/$page"
done

# 2. Serve the build output, then WAIT until it actually accepts connections.
#    serve-static.mjs (Node built-ins only, so nothing is downloaded) binds an
#    OS-assigned free port and writes it to $PORT_FILE, so the readiness poll
#    can only ever reach this server, never another one left on a fixed port.
#    Poll the first app until it answers rather than sleeping: domotion would
#    otherwise navigate to a not-yet-listening port and fail ~90s later on a
#    selector timeout that looks like a config bug.
node "$CONFIG_DIR/serve-static.mjs" "$SERVE_DIR" "$PORT_FILE" &
SERVE_PID=$!
server_ready=""
for _ in $(seq 1 60); do
  if [[ -s "$PORT_FILE" ]]; then
    BASE_URL="http://127.0.0.1:$(cat "$PORT_FILE")"
    if curl -sf -o /dev/null "$BASE_URL/${APPS[0]}/"; then
      server_ready=1
      break
    fi
  fi
  sleep 0.5
done
if [[ -z "$server_ready" ]]; then
  echo "[demos] ERROR: the static server did not accept connections within 30s" >&2
  exit 1
fi
echo "[demos] serving $SERVE_DIR at $BASE_URL"

# 3. Capture each app. domotion-svg ≥ 0.18.0 emits `step-end` directly on every
#    hard-cut opacity track and keeps it through SVGO (`optimize: true`), so cut
#    frames hold-then-snap with no post-processing. (Earlier versions needed a
#    fix-cut-timing pass to re-fold `step-end` the optimizer had clobbered — that
#    workaround is gone now that the fix lives upstream. tests/unit/demo-configs.test.ts
#    still asserts every committed SVG's fv-N track carries `step-end`.)
mkdir -p site/public/demos
# Each committed config names its server as vars.base (a fixed placeholder
# URL). Capture from a run copy next to it, with vars.base pointed at this
# run's server; staying in the same directory keeps the config's relative
# paths unchanged. cleanup() removes the copies.
for app in "${APPS[@]}" "${PAGES[@]}"; do
  echo "[demos] capturing $app"
  run_config="$CONFIG_DIR/.$app.capture.json"
  node -e '
    const fs = require("node:fs");
    const [src, dst, base] = process.argv.slice(1);
    const config = JSON.parse(fs.readFileSync(src, "utf8"));
    if (!config.vars || typeof config.vars.base !== "string") {
      console.error(`[demos] ERROR: ${src} has no vars.base to point at the server`);
      process.exit(1);
    }
    config.vars.base = base;
    fs.writeFileSync(dst, JSON.stringify(config, null, 2));
  ' "$CONFIG_DIR/$app.json" "$run_config" "$BASE_URL"
  npx domotion animate "$run_config" --quiet
done

echo "[demos] done → site/public/demos/"
