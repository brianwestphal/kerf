---
title: Realtime dashboard
description: 500 ticker rows updating at 30 Hz. each() perf at scale, batch() to coalesce, data-morph-skip for the chart canvas.
---

**[▶ Run live](/kerf/run/dashboard/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/dashboard)

A simulated live ticker dashboard. 500 rows, ~60 of them update per "WebSocket message" at 30 Hz. There's a tiny imperatively-drawn canvas in the header to prove the morph leaves library-owned subtrees alone.

**What to look at:**

- **`each()` at scale.** The ticker table runs through the keyed list reconciler. Per-row memoization by identity *plus* an optional memo key (`\`${id}-${price}\``) means a row whose price didn't change skips JSX evaluation, string-building, *and* the morph walk. Only the ~60 rows that actually moved get touched.
- **`batch()`** wraps the simulated WS message handler. Inside, `tickers.value`, `frame.value`, and `connected.value` all change — `batch()` ensures the surrounding `effect()`s and the mount's render fn each run **once** at the end, not three times.
- **`data-morph-skip` on the chart canvas.** The canvas's `requestAnimationFrame` loop draws independently; without skip, every dashboard tick (~30/s) would walk into the canvas's children and clobber its DOM.
- **`effect()` for WS lifecycle.** The simulated feed starts inside `effect()` and returns a cleanup that clears the interval and flips `connected` to false. In a real app you'd open the WebSocket here and close it in the cleanup.
- **`computed()` for derived stats.** `upPct` is recomputed only when the ticker array reference changes (i.e. once per `batch()`).

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/dashboard)

```tsx
// site/src/examples/complete/dashboard/main.tsx (excerpt — full source on GitHub)
import { signal, computed, batch, effect, mount, each } from 'kerfjs';

const tickers   = signal<Ticker[]>(genSymbols());  // 500 rows
const connected = signal(false);
const frame     = signal(0);
const upPct     = computed(() => /* % of tickers up vs prev */);

mount(root, () => (
  <div class="dash">
    <header>
      <span class={`status ${connected.value ? 'live' : 'down'}`}>
        ● {connected.value ? 'LIVE' : 'DISCONNECTED'}
      </span>
      <span>tick #{frame.value}</span>
      <span>{upPct.value}% up</span>
      <div class="chart-host" data-morph-skip>
        <canvas id="chart" width="240" height="40"></canvas>
      </div>
    </header>
    <table class="tickers">
      <tbody>
        {each(
          tickers.value,
          (t) => /* row JSX */,
          (t) => `${t.id}-${t.price.toFixed(2)}`,  // memo key — unchanged price → reused HTML
        )}
      </tbody>
    </table>
  </div>
));

// Imperative canvas, set up once. data-morph-skip keeps the diff away.
const ctx = (document.getElementById('chart') as HTMLCanvasElement).getContext('2d')!;
function draw() { /* rAF loop */ ; requestAnimationFrame(draw); }
draw();

// effect() = "WS lifecycle". Starts the simulated feed; cleanup stops it.
effect(() => {
  connected.value = true;
  const interval = setInterval(() => {
    batch(() => {
      // …mutate ~60 of 500 ticker rows + bump frame counter
    });
  }, 33);
  return () => { clearInterval(interval); connected.value = false; };
});
```
