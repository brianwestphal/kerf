#!/usr/bin/env node
// Generates getting-started.json — the end-to-end coding-session capture.
//
// The flow has ~30 frames (per-line typing overlays in the editor, magic-move
// app-switch transitions, two browser interaction rounds), so the config is
// generated rather than hand-maintained. Re-run after editing:
//
//   node site/scripts/demo-captures/gen-getting-started.mjs
//
// The typed text here MUST match the syntax-colored lines the page swaps in
// (site/scripts/demo-captures/pages/getting-started/index.html) — each typing
// frame anchors an overlay to the page's empty line slot, and the next frame
// swaps the real line in via window.S(i)/window.E(i).

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CUT = { type: 'cut', duration: 0 };

// Window transforms per state — MUST match the scene CSS in
// pages/getting-started/index.html. Each app switch is a hard-cut frame whose
// element animations glide the involved windows from their previous-scene
// transform to their new one (scale + move along a path, like switching apps).
const POS = {
  front: 'translate(0px, 0px) scale(1)',
  editorPark: 'translate(-300px, 175px) scale(0.12)',
  terminalPark: 'translate(300px, 175px) scale(0.12)',
  terminalParkLeft: 'translate(-300px, 205px) scale(0.10)',
  browserPark: 'translate(0px, 215px) scale(0.14)',
  browserParkRight: 'translate(300px, 205px) scale(0.14)',
  endPark: 'translate(0px, 195px) scale(0.22)',
};
const EASE_SWITCH = 'cubic-bezier(0.645,0.045,0.355,1)';
const glide = (selector, from, to, opts = {}) => ({
  selector,
  property: 'transform',
  from,
  to,
  duration: opts.duration ?? 480,
  easing: opts.easing ?? EASE_SWITCH,
  transformOrigin: 'center',
});

const edType = (anchorId, text, extra = {}) => ({
  kind: 'typing',
  text,
  anchor: { selector: `#${anchorId}`, at: 'left', dx: 0 },
  fontSize: 12.5,
  fontFamily: 'Menlo',
  color: '#e2e8f0',
  caret: true,
  speed: 24,
  jitter: 0.12,
  ...extra,
});

// Duration for a typing frame: chars * speed + settle buffer.
const typeMs = (text, buffer = 500) => Math.round(text.length * 24 + buffer);

const V1_LINES = [
  // [anchor slot id, plain text typed]
  ['Lc1', "import { signal, mount, delegate } from 'kerfjs';"],
  ['Lc3', 'const count = signal(0);'],
  ['Lc4', "const root = document.getElementById('app')!;"],
  ['Lc6', 'mount(root, () => ('],
  ['Lc7', '  <button class="btn" data-action="inc">'],
  ['Lc8', '    Clicked {count} times'],
  ['Lc9', '  </button>'],
  ['Lc10', '));'],
  ['Lc12', "delegate(root, 'click', '[data-action=\"inc\"]', () => count.value++);"],
];

const CLS_LINE = "const cls = computed(() => count.value >= 5 ? 'btn hot' : 'btn');";

const clickFrame = (dur, extraAnimations = []) => ({
  continue: true,
  transition: CUT,
  actions: [
    { type: 'click', selector: '#counter-btn' },
    { type: 'wait', ms: 120 },
  ],
  animations: [
    { selector: '#counter-btn', property: 'scale', from: '0.93', to: '1', duration: 250, easing: '${pop}', transformOrigin: 'center' },
    ...extraAnimations,
  ],
  duration: dur,
});

const frames = [];

// --- phase 1: type the v1 counter into the editor -------------------------
frames.push({
  transition: CUT,
  input: '${base}/getting-started/',
  waitFor: '#code',
  wait: 200,
  overlays: [edType('Lc1', V1_LINES[0][1])],
  duration: typeMs(V1_LINES[0][1], 700),
});
for (let i = 1; i < V1_LINES.length; i++) {
  const [anchor, text] = V1_LINES[i];
  frames.push({
    continue: true,
    transition: CUT,
    actions: [{ type: 'evaluate', script: `window.S(${i})` }],
    overlays: [edType(anchor, text)],
    duration: typeMs(text),
  });
}
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: 'window.S(10)' }],
  duration: 1200,
});

// --- phase 2: app-switch to the terminal, npm run dev, click the URL ------
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: "window.scene('terminal'); window.term(1)" }],
  animations: [
    glide('.window.terminal', POS.terminalPark, POS.front),
    glide('.window.editor', POS.front, POS.editorPark),
  ],
  overlays: [edType('term-cmd', 'npm run dev', { fontSize: 13, speed: 30, delay: 600 })],
  duration: 1800,
});
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: "window.termCmd('npm run dev'); window.term(6)" }],
  duration: 1900,
});
frames.push({
  continue: true,
  transition: CUT,
  actions: [
    { type: 'click', selector: '#local-link' },
    { type: 'wait', ms: 120 },
  ],
  duration: 900,
});

// --- phase 3: the browser pops in (new window); the terminal glides out ---
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: "window.scene('browser')" }],
  animations: [
    glide('.window.browser', POS.browserPark, POS.front, { duration: 520, easing: '${popSoft}' }),
    glide('.window.terminal', POS.front, POS.terminalParkLeft),
  ],
  duration: 1400,
});
frames.push(clickFrame(750));
frames.push(clickFrame(750));
frames.push(clickFrame(1200));

// --- phase 4: back to the editor (reverse direction); the subtle edit -----
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: "window.visited(); window.scene('editor'); window.E(0)" }],
  animations: [
    glide('.window.editor', POS.editorPark, POS.front),
    glide('.window.browser', POS.front, POS.browserParkRight),
  ],
  duration: 1300,
});
frames.push({
  continue: true,
  transition: CUT,
  overlays: [edType('ins-imp', ' computed,')],
  duration: typeMs(' computed,', 600),
});
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: 'window.E(1)' }],
  overlays: [edType('Lc4', CLS_LINE)],
  duration: typeMs(CLS_LINE),
});
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: 'window.E(2)' }],
  duration: 900,
});
// select `"btn"` — hold the selection so it reads as a deliberate selection…
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: 'window.E(3)' }],
  duration: 900,
});
// …then type `{cls}` over it.
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: 'window.E(4)' }],
  overlays: [edType('rep-cls', '{cls}')],
  duration: typeMs('{cls}', 650),
});
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: 'window.E(5)' }],
  duration: 900,
});
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: 'window.E(6)' }],
  duration: 800,
});

// --- phase 5: back to the browser; reach the count>=5 milestone -----------
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: "window.scene('browser'); window.hmr(true); window.v2live = true" }],
  animations: [
    glide('.window.browser', POS.browserParkRight, POS.front),
    glide('.window.editor', POS.front, POS.editorPark),
  ],
  duration: 1600,
});
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: 'window.hmr(false)' }],
  duration: 500,
});
frames.push(clickFrame(800)); // 4
frames.push(clickFrame(1700, [ // 5 → the bound class flips to 'btn hot'
  { selector: '#counter-btn', property: 'scale', from: '1', to: '1.07', duration: 300, delay: 260, easing: '${pop}', transformOrigin: 'center' },
]));
frames.push(clickFrame(1300)); // 6 — stays hot

// --- phase 6: end card -----------------------------------------------------
frames.push({
  continue: true,
  transition: CUT,
  // NOTE: the simulated cursor stays parked at the last counter-click
  // position for this frame (hover/click actions here don't move the cursor
  // track), so the end card lays out with its content pushed below that spot —
  // keep .endcard's padding in sync if the browser button ever moves.
  actions: [{ type: 'evaluate', script: "window.scene('end')" }],
  animations: [
    glide('.window.end', POS.endPark, POS.front, { duration: 520, easing: '${popSoft}' }),
    glide('.window.browser', POS.front, POS.browserPark),
  ],
  duration: 3600,
});

const config = {
  width: 760,
  height: 560,
  output: 'site/public/demos/getting-started.svg',
  optimize: true,
  vars: {
    base: 'http://localhost:4188',
    pop: 'cubic-bezier(0.175,0.885,0.32,1.275)',
    popSoft: 'cubic-bezier(0.22,1.08,0.36,1)',
  },
  cursor: 'auto',
  frames,
};

const out = resolve(__dirname, 'getting-started.json');
writeFileSync(out, JSON.stringify(config, null, 2) + '\n');
console.log(`[gen-getting-started] wrote ${out} (${frames.length} frames)`);
