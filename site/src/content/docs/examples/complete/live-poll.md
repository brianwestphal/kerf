---
title: Live poll (no build step)
description: A complete kerf app with zero tooling — plain JavaScript, an importmap, and the html tagged template. View-source shows exactly what runs.
---

**[▶ Run live](/kerf/run/live-poll/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/live-poll)

[![Animated preview: voting in a poll; counts pop and bars slide while the "renders" counter stays at 1](/kerf/demos/live-poll.svg)](/kerf/run/live-poll/)

A "Tabs or spaces?" poll — and the one example with **no build step at all**. There is no JSX, no TypeScript, no bundler: the page is an `index.html` with an [importmap](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) that resolves `kerfjs` to static files, plus a `main.js` authored with the `html` tagged template from `kerfjs/html`. View-source on the running app and you are reading the app.

It is also a **fully-bound mount**: the render function reads no signal `.value`, so it runs exactly once — the "renders" badge stays at `1` forever while every vote flows through fine-grained bindings (each count is a bound text hole, each bar's `style` is a bound `computed`, the total is a bound hole).

**What to look at:**

- **The importmap is the whole toolchain.** `index.html` maps `kerfjs`, `kerfjs/html`, and `@preact/signals-core` to plain files served next to the page. The site build copies them there verbatim (`vendor/`); nothing is transpiled or bundled.
- **`html` holes follow the same rules as JSX.** Text holes escape; `data-vote="${o.id}"` and `style="${bars.get(o.id)}"` are complete-attribute-value holes (the only legal attribute position); the bound `style` hole updates fine-grained when the computed changes; `${each(OPTIONS, …)}` composes the keyed list reconciler exactly as it does in JSX.
- **One render, forever.** The options array is static and the render reads no `.value` — so `mount()`'s effect has zero dependencies. Voting writes signals that only the bound holes read; even Reset (a `batch()` over all four counters) never re-renders.
- **`delegate()` for both flows.** One Tier-1 `click` listener matches `[data-vote]` (walks up via `closest()`, so a click anywhere in the option button counts), another matches the Reset button.

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/live-poll)

```js
// site/src/examples/complete/live-poll/main.js (excerpt — full source on GitHub)
import { batch, computed, delegate, each, mount, signal } from 'kerfjs';
import { html } from 'kerfjs/html';

const votes = new Map(OPTIONS.map((o) => [o.id, signal(0)]));
const total = computed(() => OPTIONS.reduce((n, o) => n + votes.get(o.id).value, 0));
const bars = new Map(OPTIONS.map((o) => [
  o.id,
  computed(() => {
    const t = total.value;
    const share = t === 0 ? 0 : Math.round((votes.get(o.id).value / t) * 100);
    return `width:${share}%`;
  }),
]));

let renders = 0;

mount(root, () => {
  renders += 1; // stays 1 forever — this render reads no signal .value
  return html`
    <div class="poll">
      <ul class="opts">${each(OPTIONS, (o) => html`<li class="opt" data-key="${o.id}">
        <button class="opt-btn" data-vote="${o.id}">
          <span class="opt-label">${o.label}</span>
          <span class="opt-count">${votes.get(o.id)}</span>
          <span class="opt-track"><span class="opt-bar" style="${bars.get(o.id)}"></span></span>
        </button>
      </li>`)}</ul>
      <div class="poll-foot"><b data-total>${total}</b> votes · renders: <b data-renders>${renders}</b></div>
    </div>`;
});

void delegate(root, 'click', '[data-vote]', (_e, el) => {
  const s = votes.get(el.dataset.vote);
  if (s) s.value += 1;
});
```

And the page that loads it — the entire "toolchain":

```html
<script type="importmap">
  {
    "imports": {
      "kerfjs": "./vendor/kerfjs/index.js",
      "kerfjs/html": "./vendor/kerfjs/html.js",
      "@preact/signals-core": "./vendor/signals-core.mjs"
    }
  }
</script>
<div id="app"></div>
<script type="module" src="./main.js"></script>
```
