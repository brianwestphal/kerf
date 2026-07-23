// Live poll — the no-build example. This entire app is plain JavaScript plus
// the `html` tagged template from `kerfjs/html`: no JSX, no TypeScript, no
// bundler, no transform. The page's importmap (see index.html) resolves
// `kerfjs` to static files, so what the browser runs is exactly this source.
//
// It is also a "fully-bound mount": the render function below reads no
// signal `.value` at all, so it runs exactly once — watch the "renders"
// badge stay at 1 while every vote streams through per-hole bindings
// (bound count text, bound bar `style`, bound total).

import { batch, computed, delegate, each, mount, signal } from 'kerfjs';
import { html } from 'kerfjs/html';

const OPTIONS = [
  { id: 'tabs', label: 'Tabs' },
  { id: 'spaces', label: 'Spaces' },
  { id: 'both', label: 'Tabs to indent, spaces to align' },
  { id: 'formatter', label: 'Whatever the formatter says' },
];

// One vote counter per option. Everything the UI shows derives from these.
const votes = new Map(OPTIONS.map((o) => [o.id, signal(0)]));
const total = computed(() => OPTIONS.reduce((n, o) => n + votes.get(o.id).value, 0));

// Per-option bound holes, created once at module scope. The bar style is a
// complete-attribute-value hole (`style="${bar}"`) — kerf binds it to the
// computed, so a vote updates just that one attribute.
const bars = new Map(OPTIONS.map((o) => [
  o.id,
  computed(() => {
    const t = total.value;
    const share = t === 0 ? 0 : Math.round((votes.get(o.id).value / t) * 100);
    return `width:${share}%`;
  }),
]));

// Plain counter (not a signal) incremented inside the render — a snapshot of
// how many times render() ran. This render reads no `.value`, so it stays 1.
let renders = 0;

const root = document.getElementById('app');
mount(root, () => {
  renders += 1;
  return html`
    <div class="poll">
      <h1>Tabs or spaces?</h1>
      <p class="poll-lede">Vote as often as you like. The list below rendered once — every update is a fine-grained binding.</p>
      <ul class="opts">${each(OPTIONS, (o) => html`<li class="opt" data-key="${o.id}">
        <button class="opt-btn" data-vote="${o.id}">
          <span class="opt-row">
            <span class="opt-label">${o.label}</span>
            <span class="opt-count">${votes.get(o.id)}</span>
          </span>
          <span class="opt-track"><span class="opt-bar" style="${bars.get(o.id)}"></span></span>
        </button>
      </li>`)}</ul>
      <div class="poll-foot">
        <span><b data-total>${total}</b> votes</span>
        <span class="poll-renders">renders: <b data-renders>${renders}</b></span>
        <button class="poll-reset" data-reset>Reset</button>
      </div>
    </div>`;
});

// Page-lifetime delegation (root never torn down) — `void` is the explicit
// discard sigil for kerfjs/require-delegate-disposer.
void delegate(root, 'click', '[data-vote]', (_e, el) => {
  const s = votes.get(el.dataset.vote);
  if (s) s.value += 1;
});
void delegate(root, 'click', '[data-reset]', () => {
  // One atomic notification for all four counters + the total.
  batch(() => {
    for (const s of votes.values()) s.value = 0;
  });
});
