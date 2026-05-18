---
title: Coming from htmx
description: htmx and kerf solve different halves of the same problem — server-driven HTML over the wire vs. client-side reactivity. When each tool wins, and how they combine.
---

You wrote an htmx app. You're reading this because you've discovered the cases htmx isn't a great fit for, or you want a small client-side reactivity layer to layer on top of your htmx-driven HTML.

**These two tools don't compete head-on.** htmx's value proposition is *let the server return HTML and swap it into the DOM via attribute-driven AJAX*. Kerf's value proposition is *render JSX to HTML strings and reconcile against the live DOM driven by signals*. The first is a network architecture; the second is a client-side rendering library. You can use both at once — htmx for navigation and major partial-page updates, kerf for the interactive bits inside an island.

This page is shorter than the others in this section. There's no TodoMVC-shaped side-by-side because the two tools are not interchangeable on the same problem.

## 1. When htmx wins

- **You want the server to be the source of truth and the renderer.** The DOM is whatever the server most recently returned. State lives server-side; the client is a thin display layer.
- **Round-trip latency is acceptable.** Every interaction that changes data is an HTTP request. If your users are on a fast network and your server is fast, this is invisible. If they're not, it's not.
- **You don't want a client-side build step.** htmx is a single `<script>` tag.
- **The interaction is "click button → re-render this slot from the server."** That's exactly what htmx is for.

## 2. When kerf wins (or supplements)

- **You want client-side state that doesn't round-trip.** Form-input validation as the user types, drag-and-drop reorder before persistence, a chart that updates on every signal change. Kerf re-renders without leaving the browser.
- **You want focus / caret / selection to survive a partial update.** htmx's default `outerHTML` / `innerHTML` swap blows away the live DOM in the swapped region. Kerf's morph preserves focus, caret position, and selection on the diffed element.
- **You want fine-grained reactivity inside an htmx-loaded fragment.** Use htmx to load the fragment; mount kerf on the fragment's root after the swap. The two compose cleanly.

## 3. The combined pattern

The high-leverage pattern is **htmx as the navigation / partial-page layer, kerf as the interactive island runtime.**

A working version of the composition lives at [`site/src/examples/complete/cart-htmx/`](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/cart-htmx) — [**▶ Run live**](/kerf/run/cart-htmx/). The runnable demo simulates the htmx swap with a button trigger (so the page works against a static server with no backend); the production-shape sketch below mirrors what you'd write in a real htmx-driven app.


```html
<!-- Server-rendered page -->
<div hx-get="/cart" hx-trigger="load" hx-swap="innerHTML">
  <!-- Server returns the cart island shell -->
</div>

<script type="module">
  import { mount, signal, delegate } from 'https://esm.sh/kerfjs';

  document.body.addEventListener('htmx:afterSwap', (e) => {
    const root = e.target.querySelector('[data-kerf-cart]');
    if (root) mountCart(root);
  });

  function mountCart(root) {
    const count = signal(0);
    mount(root, () => (
      <div>
        <button data-action="add">Add</button>
        <span>{count.value}</span>
      </div>
    ));
    delegate(root, 'click', '[data-action="add"]', () => count.value += 1);
  }
</script>
```

What happened: htmx loaded the cart island shell from the server. The `htmx:afterSwap` event fires after the swap completes. The script finds the kerf-managed root inside the swapped HTML and calls `mount()` on it. From that point, kerf owns the reactivity inside that root — the count signal, the click handler, the morph that updates the `<span>` when `count.value` changes.

If the server returns a new shell later (another htmx swap into the same parent), kerf's `mount()` returns a disposer you should call from the `htmx:beforeSwap` handler so the previous mount is cleaned up.

## 4. Mental-model translations (the partial overlap)

| htmx | Kerf | Notes |
| --- | --- | --- |
| `hx-get="/url" hx-swap="innerHTML"` | `fetch()` + `mount(root, () => <jsx/>)` | htmx is declarative HTML swap; kerf is imperative-render-then-reconcile. |
| `hx-trigger="click"` | `delegate(root, 'click', selector, fn)` | Different primitives, but the "one declarative trigger per DOM target" idea is similar. |
| `hx-target="#foo"` | the `el` argument to `mount(el, ...)` | Kerf is always mounted to one specific element. |
| `hx-swap="outerHTML"` | call `mount()` on the parent and let the JSX define the structure | Or use `morph(el, html)` for one-shot HTML-string-driven reconciliation. |
| `hx-on::after-request="..."` | a `delegate` handler that calls `fetch()` directly | No `hx-on` analog; write the fetch yourself inside the handler. |
| `<htmx-extension>` | n/a | No extension system — the runtime is fixed. |

## 5. Gotchas (the mental shifts)

**You stop thinking of HTML as the wire format and start thinking of state as the source of truth.** htmx asks "what HTML should the server return next?" Kerf asks "what's the next value of this signal?" If your application logic already lives client-side (because you went through htmx's "I need a tiny bit of client-side state for this dropdown" workaround enough times), the kerf model will feel natural. If your application logic lives server-side, the kerf model will feel like you've added a layer.

**There's no `hx-swap` strategy choice.** Kerf has exactly one rendering strategy: render JSX, morph the live DOM. There's no `innerHTML` vs `outerHTML` vs `beforebegin` vs `afterend` distinction — the morph patches the diff in place.

**There's no "boost a link" mode.** htmx's `hx-boost` turns regular `<a href>` links into partial-page swaps. Kerf doesn't do navigation — bring a router (or use the URL bar directly).

**No declarative response-handling.** htmx has a rich set of `hx-on::*` events for hooking into the swap lifecycle. Kerf has none of that — your fetch + render logic lives in a plain JS handler.

## 6. Perf numbers

Performance comparisons between htmx and kerf don't map onto the krausest benchmark because the two tools operate on different layers. htmx's wall-clock perf is dominated by network round-trip time; kerf's is dominated by DOM reconciliation cost. If you're picking between them on perf alone, you're picking on the wrong axis — pick on architecture (server-driven vs client-driven) first, then measure whichever option you chose against your real workload.

[See the kerf bench table →](https://github.com/brianwestphal/kerf/blob/main/bench/results.md)
