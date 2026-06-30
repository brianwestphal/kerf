import { writeFileSync } from 'node:fs';

// --- Sparkline geometry ---------------------------------------------------
// The app's sparkline is a <canvas>, which domotion captures as a STATIC raster
// per frame (it can't animate). We hide it and inject one long SVG sine path,
// then scroll it with a per-frame translateX whose from/to CONTINUES across
// frames — so the wave is one smooth, constant scroll with no per-frame reset
// and no wrap seam (the path is wide enough to never run out under the window).
const CHART_W = 240; // visible sparkline window (matches the canvas width)
const CHART_H = 40;
const SPEED = 120; // px/s — matches the live canvas's ~120 units/s feel
const FRAME_MS = 300; // normal frame on-screen time
const LAST_EXTRA_MS = 1500; // KF-280: hold the tail longer (wave keeps moving)
const N_NORMAL = 9; // normal data frames after frame 0
const ROWS = 8; // visible table rows (trimmed) — keeps the per-frame SVG smaller
// Real wall-clock wait between captures so the live feed ticks (~30 Hz) and the
// tick #, prices, Δ and "% up" visibly change every frame.
const TICK_WAIT_MS = 260;

const frameDur = (i, isLast) => (isLast ? FRAME_MS + LAST_EXTRA_MS : FRAME_MS);

// Cumulative scroll offset (px) at the start of each frame, advancing at a
// constant SPEED so delta/duration is identical for every frame (= constant
// playback speed, seamless across the hard cuts).
const offsets = [0];
const totalFrames = 1 /* frame 0 */ + N_NORMAL + 1 /* last */;
for (let i = 0; i < totalFrames; i++) {
  const isLast = i === totalFrames - 1;
  offsets.push(offsets[i] + (SPEED * frameDur(i, isLast)) / 1000);
}
const maxOffset = offsets[offsets.length - 1];
const TW = Math.ceil(CHART_W + maxOffset + 40); // path width: window + full scroll + buffer

// Build the sine path string for x in [0, TW]: y = 20 + sin(x/10)*12.
let d = '';
for (let x = 0; x <= TW; x++) {
  const y = (20 + Math.sin(x / 10) * 12).toFixed(2);
  d += (x === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
}
d = d.trim();

// Injection that (a) trims the table to 10 rows, (b) hides the canvas, and
// (c) injects the scrolling sine once (idempotent via the #sparkclip guard).
const injectScript =
  "(()=>{" +
  `if(!document.getElementById('demo-trim')){const s=document.createElement('style');s.id='demo-trim';s.textContent='.tickers tbody tr:nth-child(n+${ROWS + 1}){display:none}';document.head.appendChild(s);}` +
  "const host=document.querySelector('.chart-host');const c=host.querySelector('canvas');if(c)c.style.display='none';" +
  "if(host.querySelector('#sparkclip'))return;" +
  `const W=${CHART_W},H=${CHART_H},TW=${TW};const d=${JSON.stringify(d)};` +
  "host.insertAdjacentHTML('beforeend','<div id=\"sparkclip\" style=\"width:'+W+'px;height:'+H+'px;overflow:hidden\"><div id=\"sparkscroll\" style=\"width:'+TW+'px;height:'+H+'px\"><svg width=\"'+TW+'\" height=\"'+H+'\" viewBox=\"0 0 '+TW+' '+H+'\"><path d=\"'+d+'\" fill=\"none\" stroke=\"#22d3ee\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/></svg></div></div>');" +
  "})()";

const scrollAnim = (i) => ({
  selector: '#sparkscroll',
  property: 'translateX',
  from: `${-offsets[i]}px`,
  to: `${-offsets[i + 1]}px`,
  duration: frameDur(i, i === totalFrames - 1),
  easing: 'linear',
});

const frames = [];
for (let i = 0; i < totalFrames; i++) {
  const isLast = i === totalFrames - 1;
  if (i === 0) {
    frames.push({
      transition: { type: 'cut', duration: 0 },
      input: '${base}/dashboard/',
      waitFor: '.dash',
      wait: 300,
      actions: [{ type: 'evaluate', script: injectScript }],
      animations: [scrollAnim(0)],
      duration: frameDur(0, false),
    });
  } else {
    frames.push({
      continue: true,
      transition: { type: 'cut', duration: 0 },
      // Let the live feed tick between captures, then re-assert the injection
      // (cheap + idempotent) in case anything reset.
      actions: [{ type: 'wait', ms: TICK_WAIT_MS }, { type: 'evaluate', script: injectScript }],
      animations: [scrollAnim(i)],
      duration: frameDur(i, isLast),
    });
  }
}

const config = {
  width: 900,
  height: 420,
  output: 'site/public/demos/dashboard.svg',
  optimize: true,
  colorScheme: 'dark',
  vars: { base: 'http://localhost:4188' },
  frames,
};

writeFileSync('site/scripts/demo-captures/dashboard.json', JSON.stringify(config, null, 2) + '\n');
console.log(
  `dashboard.json: ${frames.length} frames, TW=${TW}px, maxOffset=${maxOffset}px, lastDur=${frameDur(
    totalFrames - 1,
    true,
  )}ms`,
);
