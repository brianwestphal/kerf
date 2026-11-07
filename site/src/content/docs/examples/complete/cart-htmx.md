---
title: htmx cart island
description: A server-swapped cart shell that kerf mounts after each swap. Shows the htmx composition shape, plus capturing and calling both disposers before the next mount.
---

<div class="app-cta">
  <a class="app-cta__run" href="/kerf/run/cart-htmx/">▶ Run live</a>
  <a class="app-cta__source" href="https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/cart-htmx" target="_blank" rel="noopener">View source on GitHub</a>
</div>

[![Animated preview: swapping in the cart island, kerf mounting it, then removing an item](/kerf/demos/cart-htmx.svg)](/kerf/run/cart-htmx/)

A cart island inside a page that htmx owns. htmx swaps the server's HTML into the page; kerf then mounts onto the swapped shell and owns its interactivity until the next swap replaces it. The runnable app simulates the swap with **Load cart** and **Reload cart** buttons, so it works against a static server with no backend. The [htmx migration guide](/kerf/migrating/htmx/) walks through the production shape.

**What to look at:**

- **Mount after the swap.** In a real htmx app the mount runs in an `htmx:afterSwap` handler. kerf reads the island's initial items from its `data-initial` attribute, hydrates a signal, and `mount()`s the render onto the swapped shell.
- **Initial data set through `dataset`.** The simulated swap inserts static markup and then sets `data-initial` through `dataset`, rather than interpolating JSON into the HTML string. A quote in a product name can't break out of the attribute.
- **Capture both disposers.** The shell is transient: every swap replaces it. The app keeps the disposers from `mount()` and `delegate()` and calls both before the next mount, so each swap leaves no listener or effect behind. The event log on the page shows the dispose-then-mount sequence.
- **A keyed `each()` for the rows.** Removing an item writes the signal; the keyed reconciler removes one row and the total updates in place.
- **`attr()` keeps the attribute and selector in one place.** The remove button spreads `ACTIONS.remove.attrs`, and the delegated listener matches `ACTIONS.remove.selector`.

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/cart-htmx)

```tsx
// site/src/examples/complete/cart-htmx/main.tsx (excerpt — full source on GitHub)
import { attr, delegate, each, mount, signal, type AttrSpec } from "kerfjs";

const ACTIONS = {
  remove: attr("data-action", "remove"),
} as const satisfies Record<string, AttrSpec<"data-action">>;

let activeDispose: (() => void) | null = null;

function simulateSwap(initial: CartItem[]): void {
  activeDispose?.(); // tear down the previous island before the new one mounts

  shell.innerHTML = `<div data-cart-island>…static shell…</div>`;
  const root = shell.querySelector("[data-cart-island]") as HTMLElement;
  root.dataset.initial = JSON.stringify(initial);

  // Real htmx: this runs in an `htmx:afterSwap` handler.
  const items = signal<CartItem[]>(JSON.parse(root.dataset.initial!));
  const stopMount = mount(root, () => (
    <div data-cart-island>
      <ul class="cart-items">
        {each(
          items.value,
          (it) => (
            <li data-key={it.id}>
              {it.name} — ${it.price}
              <button {...ACTIONS.remove.attrs} data-id={it.id}>×</button>
            </li>
          ),
          (it) => it.id,
        )}
      </ul>
      <p class="total">
        Total: ${items.value.reduce((s, it) => s + it.price, 0)}
      </p>
    </div>
  ));

  // Transient root: capture the disposer and call it on the next swap.
  const stopDelegate = delegate(root, "click", ACTIONS.remove.selector, (_e, btn) => {
    const id = (btn as HTMLElement).dataset.id;
    items.value = items.value.filter((it) => it.id !== id);
  });

  activeDispose = () => {
    stopMount();
    stopDelegate();
  };
}
```
