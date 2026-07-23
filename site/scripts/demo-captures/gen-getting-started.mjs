#!/usr/bin/env node
// Generates getting-started.json — the end-to-end coding-session capture.
//
// The flow has ~37 frames (per-line typing overlays with underlay reveals in
// the editor, app-switch glides, page-driven push-typing for the mid-line
// edits, two browser interaction rounds), so the config is generated rather
// than hand-maintained. Re-run after editing:
//
//   node site/scripts/demo-captures/gen-getting-started.mjs
//
// TWO CONTRACTS with the capture page
// (site/scripts/demo-captures/pages/getting-started/index.html):
//
// 1. THE UNDERLAY CONTRACT — every typed line exists as real opaque page
//    text from its frame's start (span #Lc<row> / #term-cmd) hidden by a
//    background-colored COVER rect (#Cv<row> / #term-cov). The typing
//    overlay types the IDENTICAL text at the IDENTICAL baseline; a `reveal`
//    animation fades the cover out the moment typing finishes, so domotion's
//    built-in end-of-frame overlay fade (150 ms before the cut, not
//    configurable) reveals identical pixels — a seamless handoff. The typed
//    overlay text here MUST match the page's underlay text, and BASELINE_DY
//    must keep the overlay baseline on the page text's baseline. (A cover,
//    not a hidden underlay — domotion drops opacity-0 elements at render and
//    bakes captured opacity < 1 onto a parent wrapper group an animation on
//    the element cannot override.)
//
// 2. THE BAKED-RELATIVE RULE — domotion element animations compose with the
//    transform an element was CAPTURED with. All windows are captured
//    untransformed (front), so glide from/to values are authored in absolute
//    stage space: incoming = park → front, outgoing = front → park. Never
//    park windows in page CSS (round 2 did, and the outgoing window's park
//    got double-applied — it teleported offscreen at the cut instead of
//    gliding). Glides are also PURE scale() with a directional
//    transform-origin — no translate component. domotion's viewBox culler
//    reads only an animation's translate (scale is ignored) and emits
//    per-child `cull-N` visibility classes for any child bbox the translate
//    pushes outside the viewBox — and those class NAMES are numbered per
//    frame and COLLIDE across frames (later frames' @keyframes clobber
//    earlier ones), arbitrarily hiding other frames' elements. A scale-only
//    glide moves no bbox in the culler's math, so no cull classes exist to
//    collide, while the off-center origin still gives the diagonal
//    move-along-a-path app-switch look. Tucked windows land INSIDE the
//    stage, covered by the opaque front window (z6 over z5).

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CUT = { type: 'cut', duration: 0 };

// --- app-switch glides (baked-relative: all windows captured at front) ----
// Pure scale() tweens; the transform-origin picks the corner the window
// shrinks toward / grows from, giving the diagonal app-switch path with no
// translate for the viewBox culler to act on (see rule 2 above). A window
// RETURNS from the same corner it tucked into.
const FRONT = 'scale(1)';
const TUCK = 'scale(0.12)';
const ORIGIN_BL = '8% 92%';    // editor + terminal tuck: bottom-left
const ORIGIN_BR = '92% 90%';   // browser tuck: bottom-right
const ORIGIN_B = '50% 95%';    // new-window pops: bottom-center
const EASE_SWITCH = 'cubic-bezier(0.645,0.045,0.355,1)';
const glide = (selector, from, to, origin, opts = {}) => ({
  selector,
  property: 'transform',
  from,
  to,
  duration: opts.duration ?? 480,
  easing: opts.easing ?? EASE_SWITCH,
  transformOrigin: origin,
});

// --- typing overlays + underlay reveals -----------------------------------
// Editor text: Menlo 12.5px in a 19px line. The overlay's y is the typed
// text's BASELINE; the anchor span's rect top is the glyph box top, so
// BASELINE_DY ≈ Menlo ascent (0.928 em). Tuned against rendered probes so the
// overlay glyphs sit exactly on the underlay glyphs.
const ED_FONT = 12.5;
const ED_SPEED = 24;
const ED_DELAY = 300;
const BASELINE_DY = 11.5;
const TERM_FONT = 13;
const TERM_SPEED = 30;

const edType = (anchorId, text, extra = {}) => ({
  kind: 'typing',
  text,
  anchor: { selector: `#${anchorId}`, at: 'top-left', dx: 0, dy: extra.dy ?? BASELINE_DY },
  fontSize: ED_FONT,
  fontFamily: 'Menlo',
  color: '#e2e8f0',
  caret: true,
  speed: ED_SPEED,
  jitter: 0.12,
  delay: ED_DELAY,
  ...extra,
});

// Fade the underlay's cover OUT right after the overlay's last glyph lands
// (delay + chars×speed), well before the overlay's own fade starts at
// frameEnd − 150 ms — the real text shows through from then on.
const reveal = (coverSelector, delayMs, charCount, speed) => ({
  selector: coverSelector,
  property: 'opacity',
  from: '1',
  to: '0',
  duration: 40,
  delay: delayMs + charCount * speed + 60,
});

// Duration for a typing frame: delay + chars×speed + reveal (100) + the
// overlay's end-of-frame fade window (150) + a settle beat.
const typeMs = (text, extra = 300) => ED_DELAY + text.length * ED_SPEED + 250 + extra;

// One editor typing frame: page opens the underlay (action), overlay types
// over it, reveal pops the real span at the end.
const edTypeFrame = (action, row, text, extra = 300) => ({
  continue: true,
  transition: CUT,
  ...(action ? { actions: [{ type: 'evaluate', script: action }] } : {}),
  overlays: [edType(`Lc${row}`, text)],
  animations: [reveal(`#Cv${row}`, ED_DELAY, [...text].length, ED_SPEED)],
  duration: typeMs(text, extra),
});

// The v1 program, one entry per typed line: [row (1-based), plain text].
// MUST match the page's P1 table (the underlay contract, half 2).
const V1_LINES = [
  [1, "import { signal, mount, delegate } from 'kerfjs';"],
  [3, 'const count = signal(0);'],
  [4, "const root = document.getElementById('app')!;"],
  [6, 'mount(root, () => ('],
  [7, '  <button class="btn" data-action="inc">'],
  [8, '    Clicked {count} times'],
  [9, '  </button>'],
  [10, '));'],
  [12, "delegate(root, 'click', '[data-action=\"inc\"]', () => count.value++);"],
];

const CLS_PLAIN = "const cls = computed(() => count.value >= 5 ? 'btn hot' : 'btn');";

const clickFrame = (dur, pop = {}) => ({
  continue: true,
  transition: CUT,
  actions: [
    { type: 'click', selector: '#counter-btn' },
    { type: 'wait', ms: 120 },
  ],
  animations: [
    // NOTE: one animation per element per frame — a second entry targeting
    // #counter-btn would overwrite the first's data-domotion-anim tag.
    { selector: '#counter-btn', property: 'scale', from: pop.from ?? '0.93', to: pop.to ?? '1', duration: pop.duration ?? 250, easing: '${pop}', transformOrigin: 'center' },
  ],
  duration: dur,
});

// Page-driven push-typing: k chars landed via window.ins/rep — REAL page
// text, so everything right of the caret genuinely shifts. ~2 chars per
// frame reads as brisk real typing at these durations.
const pushFrame = (script, dur = 170) => ({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script }],
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
  animations: [reveal('#Cv1', ED_DELAY, V1_LINES[0][1].length, ED_SPEED)],
  duration: typeMs(V1_LINES[0][1], 400),
});
for (let i = 1; i < V1_LINES.length; i++) {
  const [row, text] = V1_LINES[i];
  frames.push(edTypeFrame(`window.S(${i})`, row, text));
}
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: 'window.S(10)' }],
  duration: 1100,
});

// --- phase 2: app-switch to the terminal, npm run dev, click the URL ------
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: "window.scene('terminal', 'editor'); window.termCmd('npm run dev'); window.term(1)" }],
  animations: [
    glide('.window.terminal', 'scale(0.16)', FRONT, '92% 92%'), // opens from bottom-right
    glide('.window.editor', FRONT, TUCK, ORIGIN_BL),            // tucks bottom-left
    reveal('#term-cov', 600, 'npm run dev'.length, TERM_SPEED),
  ],
  overlays: [edType('term-cmd', 'npm run dev', { fontSize: TERM_FONT, speed: TERM_SPEED, delay: 600, dy: 12.0 })],
  duration: 1800,
});
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: 'window.term(6)' }],
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
  actions: [{ type: 'evaluate', script: "window.scene('browser', 'terminal')" }],
  animations: [
    glide('.window.browser', 'scale(0.14)', FRONT, ORIGIN_B, { duration: 520, easing: '${popSoft}' }), // new window pops up
    glide('.window.terminal', FRONT, TUCK, ORIGIN_BL),
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
  actions: [{ type: 'evaluate', script: "window.scene('editor', 'browser'); window.lt(1)" }],
  animations: [
    glide('.window.editor', TUCK, FRONT, ORIGIN_BL),  // returns from its tuck
    glide('.window.browser', FRONT, TUCK, ORIGIN_BR), // tucks bottom-right
    // the lower third rises once the editor has landed (20px keeps every
    // descendant bbox inside the viewBox for the culler — see rule 2)
    { selector: '.ltwrap', property: 'transform', from: 'translate(0px, 20px) scale(0.92)', to: 'translate(0px, 0px) scale(1)', duration: 400, delay: 500, easing: '${popSoft}', transformOrigin: '50% 100%' },
  ],
  duration: 1500,
});
// ` computed,` typed INTO the import line — real page text lands 2 chars per
// frame, pushing ` mount, delegate …` to the right like a real editor.
for (const k of [2, 4, 6, 8, 10]) frames.push(pushFrame(`window.ins(${k})`));
// import colorizes; line 4 opens and the cls line types over its underlay.
frames.push(edTypeFrame('window.E(1)', 4, CLS_PLAIN, 350));
frames.push(pushFrame('window.E(2)', 900));   // cls line lands (highlight)
frames.push(pushFrame('window.E(3)', 950));   // "btn" selected — hold it
// `{cls}` replaces the selection: the line snaps left on the first keystroke,
// then pushes right as the hole lands.
for (const k of [2, 4, 5]) frames.push(pushFrame(`window.rep(${k})`, 180));
frames.push(pushFrame('window.E(5)', 900));   // hole highlighted
frames.push(pushFrame('window.E(6)', 800));   // settled

// --- phase 5: back to the browser; reach the count>=5 milestone -----------
frames.push({
  continue: true,
  transition: CUT,
  actions: [{ type: 'evaluate', script: "window.scene('browser', 'editor'); window.hmr(true); window.v2live = true" }],
  animations: [
    glide('.window.browser', TUCK, FRONT, ORIGIN_BR), // returns from its tuck
    glide('.window.editor', FRONT, TUCK, ORIGIN_BL),
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
// 5 → the bound class flips to 'btn hot'; one merged pop (click dip + hot
// emphasis) because a second animation on the same element would overwrite
// the first's tag.
frames.push(clickFrame(1700, { from: '0.93', to: '1.07', duration: 480 }));
frames.push(clickFrame(1300)); // 6 — stays hot

// --- phase 6: end card -----------------------------------------------------
frames.push({
  continue: true,
  transition: CUT,
  // NOTE: the simulated cursor stays parked at the last counter-click
  // position for this frame (hover/click actions here don't move the cursor
  // track), so the end card lays out with its content pushed below that spot —
  // keep .endcard's padding in sync if the browser button ever moves.
  actions: [{ type: 'evaluate', script: "window.scene('end', 'browser')" }],
  animations: [
    glide('.window.end', 'scale(0.2)', FRONT, ORIGIN_B, { duration: 520, easing: '${popSoft}' }),
    glide('.window.browser', FRONT, TUCK, ORIGIN_B), // shrinks away bottom-center
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
