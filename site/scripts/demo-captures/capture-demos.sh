#!/usr/bin/env bash
# Regenerate the animated SVG previews under site/public/demos/.
#
# Each complete example app is captured with domotion-svg (a DOM-to-animated-SVG
# renderer that drives the real app in Chromium and serializes the result to a
# self-contained, CSS-animated SVG). The per-app capture scripts live alongside
# this file as <name>.json; each drives the app through the same headline
# interaction its browser smoke spec exercises (todomvc add/toggle, kanban drag,
# chat streaming, dashboard tick, counter-store inc/fetch, cart-htmx swap,
# markdown live preview, row-selector fine-grained select, live-poll no-build voting).
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
SERVE_PORT=4188
CONFIG_DIR="site/scripts/demo-captures"
APPS=(todomvc counter-store cart-htmx chat dashboard markdown-editor kanban row-selector live-poll)
# Static capture pages under $CONFIG_DIR/pages/<name>/ — not example apps, just
# hand-authored HTML captured as-is (the animated site diagrams etc.). Each has
# a matching <name>.json config like the apps.
PAGES=(architecture getting-started)

cleanup() {
  [[ -n "${SERVE_PID:-}" ]] && kill "$SERVE_PID" 2>/dev/null || true
  rm -rf "$SERVE_DIR"
}
trap cleanup EXIT

# 1. Build each app with a per-app base into the temp serve root so a single
#    static server can host them all at http://localhost:$SERVE_PORT/<name>/.
echo "[demos] building example apps → $SERVE_DIR"
( cd site && node scripts/build-demos-for-capture.mjs "$SERVE_DIR" )

# 1b. Copy the static capture pages next to the built apps.
for page in "${PAGES[@]}"; do
  cp -R "$CONFIG_DIR/pages/$page" "$SERVE_DIR/$page"
done

# 2. Serve the build output.
npx --yes serve -l "$SERVE_PORT" "$SERVE_DIR" >/dev/null 2>&1 &
SERVE_PID=$!
sleep 2

# 3. Capture each app. domotion-svg ≥ 0.18.0 emits `step-end` directly on every
#    hard-cut opacity track and keeps it through SVGO (`optimize: true`), so cut
#    frames hold-then-snap with no post-processing. (Earlier versions needed a
#    fix-cut-timing pass to re-fold `step-end` the optimizer had clobbered — that
#    workaround is gone now that the fix lives upstream. tests/unit/demo-configs.test.ts
#    still asserts every committed SVG's fv-N track carries `step-end`.)
mkdir -p site/public/demos
for app in "${APPS[@]}" "${PAGES[@]}"; do
  echo "[demos] capturing $app"
  npx domotion animate "$CONFIG_DIR/$app.json" --quiet
done

echo "[demos] done → site/public/demos/"
