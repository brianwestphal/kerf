# Animated demo captures

The `site/public/demos/<name>.svg` files are animated previews of the complete
example apps, embedded at the top of each app's docs page so a reader can see
what the live demo does before clicking through.

They're produced with [`domotion-svg`](https://github.com/brianwestphal/domotion)
— a DOM-to-animated-SVG renderer that drives the real app in Chromium and
serializes the result to a self-contained SVG with CSS keyframe transitions
(no JS, animates inside an `<img>`, scales crisply, ~60–100 KB each).

## Regenerate

```bash
bash site/scripts/demo-captures/capture-demos.sh
```

That script builds each app, serves them, and runs `domotion animate` over the
per-app config in this directory. Re-run it whenever an example app's UI or its
headline interaction changes.

## The configs

One `<name>.json` per app. Each frame describes a step of the headline
interaction — the same flow the app's `tests/browser/example-apps.spec.ts`
smoke spec exercises:

| App | Captured flow |
| --- | --- |
| `todomvc` | add three todos, toggle the first done |
| `markdown-editor` | edit the source, watch the preview update live |
| `kanban` | drag two cards across columns (counts update) |
| `chat` | send a prompt, bot reply streams in token-by-token |
| `dashboard` | live ticker ticking at 30 Hz (top 10 rows shown) |
| `counter-store` | increment ×3, decrement, async fetch resolves |
| `cart-htmx` | swap in the cart island, remove an item |

A frame's `waitFor*` gates are readiness preconditions applied **before** that
frame's `actions`; the capture happens **after** the actions. So assertions about
a result go on the *next* frame's gate (or rely on a trailing `wait`), not the
same frame that triggers the change. Synchronous interactions (clicks, fills)
just use a short trailing `wait`; the dashboard trims to 10 rows via an injected
`display:none` rule so the SVG stays small.
