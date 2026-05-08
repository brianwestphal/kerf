import { signal, computed, batch, effect, mount, each } from 'kerfjs';

interface Ticker { id: string; symbol: string; price: number; prev: number; volume: number }

const ROW_COUNT = 500;

// Build initial ticker universe.
function genSymbols(): Ticker[] {
  const out: Ticker[] = [];
  for (let i = 0; i < ROW_COUNT; i++) {
    const symbol = `${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i / 26) | 0) % 26)}${i.toString(36).toUpperCase().padStart(2, '0')}`;
    const price = 10 + Math.random() * 990;
    out.push({ id: `t-${i}`, symbol, price, prev: price, volume: 0 });
  }
  return out;
}

const tickers = signal<Ticker[]>(genSymbols());
const connected = signal(false);
const frame = signal(0);

const upPct = computed(() => {
  const arr = tickers.value;
  let up = 0;
  for (const t of arr) if (t.price > t.prev) up += 1;
  return ((up / arr.length) * 100).toFixed(1);
});

const root = document.getElementById('app')!;

mount(root, () => (
  <div class="dash">
    <header>
      <span class={`status ${connected.value ? 'live' : 'down'}`}>
        ● {connected.value ? 'LIVE' : 'DISCONNECTED'}
      </span>
      <span class="frame">tick #{frame.value}</span>
      <span class="up">{upPct.value}% up</span>
      {/* Library-owned canvas: morph-skipped so the rAF loop draws uninterrupted */}
      <div class="chart-host" data-morph-skip>
        <canvas id="chart" width="240" height="40"></canvas>
      </div>
    </header>
    <table class="tickers">
      <thead>
        <tr><th>Symbol</th><th class="num">Price</th><th class="num">Δ</th><th class="num">Volume</th></tr>
      </thead>
      <tbody>
        {each(
          tickers.value,
          (t) => {
            const delta = t.price - t.prev;
            return (
              <tr data-key={t.id} class={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}>
                <td>{t.symbol}</td>
                <td class="num">{t.price.toFixed(2)}</td>
                <td class="num">{delta >= 0 ? '+' : ''}{delta.toFixed(2)}</td>
                <td class="num">{t.volume}</td>
              </tr>
            );
          },
          (t) => `${t.id}-${t.price.toFixed(2)}`,  // memo key → row reuses cached HTML if price unchanged
        )}
      </tbody>
    </table>
  </div>
));

// Imperative canvas — set up once after first render. The data-morph-skip wrapper
// keeps the diff out, so this rAF loop is never disturbed.
const ctx = (document.getElementById('chart') as HTMLCanvasElement).getContext('2d')!;
let cf = 0;
function draw() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 240, 40);
  ctx.fillStyle = '#22d3ee';
  for (let x = 0; x < 240; x++) {
    const y = 20 + Math.sin((x + cf) / 10) * 12;
    ctx.fillRect(x, y, 1, 1);
  }
  cf += 2;
  requestAnimationFrame(draw);
}
draw();

// effect() = the WS lifecycle. The disposer returned would stop the feed if we
// later wanted to (e.g., on unmount). Here we just let it run.
effect(() => {
  connected.value = true;
  const interval = setInterval(() => {
    // Simulate a single WS message containing many updates. batch() ensures
    // signal mutations inside coalesce into one render, even though we're
    // updating both `tickers` and `frame`.
    batch(() => {
      const arr = tickers.value;
      const out = arr.slice();
      const updates = 60;  // ~60 of 500 rows per tick
      for (let i = 0; i < updates; i++) {
        const idx = (Math.random() * arr.length) | 0;
        const t = arr[idx];
        const move = (Math.random() - 0.5) * 2;
        out[idx] = {
          ...t,
          prev: t.price,
          price: Math.max(1, t.price + move),
          volume: t.volume + ((Math.random() * 1000) | 0),
        };
      }
      tickers.value = out;
      frame.value = frame.value + 1;
    });
  }, 33);  // ~30 Hz

  return () => {
    clearInterval(interval);
    connected.value = false;
  };
});
