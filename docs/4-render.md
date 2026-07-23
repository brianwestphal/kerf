# 4. Render

`mount(rootEl, render)` is the single rendering primitive.

```ts
import { mount, signal } from 'kerfjs';

const count = signal(0);

const dispose = mount(document.getElementById('app')!, () => (
  <div>
    <span>{count.value}</span>
    <button data-action="inc">+</button>
  </div>
));
```

## 4.1 What `mount` does

1. Wraps `effect()` so the render fn re-runs whenever any signal it reads changes.
2. Evaluates `render()` to a `SafeHtml`. The wrapped `Segment` is either a single static-html node (most renders), or a tree containing `list` segments (anywhere `each(...)` was used) and `mixed` segments wrapping their parents. As a small ergonomic affordance, a render that returns `null`, `undefined`, `false`, or `true` is coerced to "render nothing" (empty string) — so `mount(el, () => cond ? <jsx/> : null)` and `mount(el, () => cond && <jsx/>)` work without each consumer adding a sentinel. Numbers stringify; real strings pass through.
3. **First render:** sets `rootEl.innerHTML` to the flattened HTML (with a sentinel comment before each list), then walks those comments to bind every list to its live parent. Bulk parse, single pass.
4. **Subsequent renders:** builds a marker-only template (lists become `<!--kf-list:N-->` placeholders, *no row HTML*), runs kerf's native morph (`src/morph.ts`) over the static surrounds, then dispatches each list segment to a keyed reconciler that operates directly on the live parent's children. Cache-hit rows are reused verbatim. When the list's items are unchanged in count and order but some rows' content changed (the common "external state flipped a class/label" case), those rows are morphed *in place* on their existing nodes — preserving DOM identity, focus, scroll, IME composition, and in-progress CSS transitions. (This in-place behavior is new in 0.15.0; versions ≤ 0.14.x recreated the row node on a content change instead. One consequence of reusing the node: a CSS enter-animation keyed on the row element's *creation* no longer replays on a content-only update — key such animations on a state-class toggle if you need them to fire.) Genuinely new rows are batched into one parse and `insertBefore`'d into place; a longest-increasing-subsequence pass keeps reorder mutations to the minimum.
5. Returns a disposer that tears down the effect.

The structural payoff: a thousand-row list where 100 rows changed runs ~100 cache misses, one bulk parse for those 100 rows, ~100 `insertBefore` calls, and zero work for the 900 unchanged rows. The static surrounds (which are usually small) go through the general-purpose diff.

Everything above is the **coarse** update path: a signal change re-runs `render()`, then kerf diffs down to the changed nodes. For a hot hole driven by an external signal (a `selectedId` flipping one row's class), you can opt that hole into a **fine-grained binding** — pass the signal itself into the attribute/text and the update skips both the re-render and the reconcile, touching only that node. See [`docs/2-reactivity.md`](2-reactivity.md) §2.9.

## 4.2 Morph keys

`morph()` matches elements across the reconciliation by:

- **`id`** — wins over any other key. Useful for singletons.
- **`data-key`** — generic per-row key for list items.

Elements without a key are matched positionally by tag name, with a forward lookahead: when the element at a position doesn't match (say, a conditional banner was removed this render, shifting everything after it), the diff scans later live siblings for the first same-tag unkeyed element and moves it up instead of rebuilding it from the template. Stateful subtrees — most importantly the parent of an `each()` list — keep their node identity when a sibling before them appears or disappears. Pure-HTML diffs work fine without keys; you only need keys when list rows reorder, are inserted in the middle, or removed.

The lookahead also covers the `each()` list marker itself. A list's begin-anchor is a comment node, and its rows live only in the live tree (the template carries the bare marker), so a conditional sibling *inside* the list's parent — a header row that comes and goes above the list — would otherwise leave the marker un-matched at the cursor. kerf matches it by its exact marker data and moves it up, carrying its whole run of rows with it, so the list binding never detaches and every row keeps its DOM identity, focus, and caret. Moving the marker and its rows as one unit is what stops a later template sibling (a trailing button, say) from landing between the anchor and the rows it anchors.

Two shapes still rebuild a list's container: an *ancestor's tag* changing across renders (`<section>` ↔ `<article>` around the same list), and a *same-tag sibling* that positionally takes the container's place (a `<ul>` banner rendered before a `<ul>` list). Both replace the container, and kerf self-heals — re-binding the list, discarding any rows stranded by the swap, and repopulating. That recovery is correct but lossy: the rows are fresh nodes, so focus, scroll, and IME state on them are discarded.

If the rows should survive, keep ancestor tags stable, and **give the list's own container a stable `id` or `data-key`**:

```tsx
<div>
  {showBanner.value ? <ul class="banner">…</ul> : ''}
  <ul data-key="results">{each(rows.value, …)}</ul>
</div>
```

A key makes the container ineligible for positional matching *and* findable by key, so no sibling can take its place from either direction. Note the asymmetry: keying the *conditional sibling* instead only helps when the sibling is being removed — when it reappears, its key has no live counterpart, the diff falls back to position, and the unkeyed container is taken over anyway. Key the container, not the sibling. The opt-in dev warning `KERF_DEV_WARN_LIST_REBIND=1` surfaces each list the first time such a rebuild happens (see [`docs/11-dev-warnings.md`](11-dev-warnings.md)).

```tsx
// Reorderable list — give each row a stable data-key
<ul>
  {rows.value.map((r) => (
    <li data-key={r.id}>{r.label}</li>
  ))}
</ul>
```

For large lists, swap `.map(...)` for the `each(items, render, cacheKey?)` helper. It returns a structured list segment that `mount()` recognizes and routes to the keyed reconciler — bypassing the parse-the-whole-table step entirely. Each row is memoized by item identity (with an optional `cacheKey` that captures external state like a "selected id"), so unchanged rows skip JSX evaluation, string-building, *and* the morph walk. Items must be objects (the cache is a `WeakMap`), and the same object reference must not appear at more than one index — `each()` throws on a duplicate reference, since one object can only map to one cached row node. The immutable-update style elsewhere in this codebase makes the cache work automatically — replace a row with a fresh object and it re-renders, leave its reference alone and it doesn't.

In development, if the first row of a list renders without an `id` or `data-key` attribute, kerf logs a one-shot warning (always on in dev — no env var): keyless rows match positionally, so focus and per-row state jump rows on insert/delete.

```tsx
import { each } from 'kerfjs';

<ul>
  {each(rows.value, (r) => <li data-key={r.id}>{r.label}</li>)}
</ul>
```

> **Memo cache invariant.** The memo cache invalidates *purely* on the third argument (the `cacheKey` function's return value) plus item identity. If a row's rendered output depends on external state that the memo doesn't include, the row will go stale — kerf will return cached HTML even though the render function would produce something different now. The fix is either: (a) bake that state into the memo (`(r) => \`${r.id}-${selectedId === r.id ? 'on' : 'off'}\``), or (b) own the changing DOM imperatively under `data-morph-skip` and let kerf cache the surrounding shell. The kanban example chooses (b) for the live drag transform; the TodoMVC example chooses (a) for the per-row view/edit flip.

> **Static structural arrays — use `.map()`, not `each()`.** `each()` is for dynamic lists. When the outer array is a module-level constant (`COLUMNS`, settings sections, nav tabs) whose items never change identity, the per-item HTML cache hits every render *forever* — the row render fn is invoked exactly once at first paint and never again, even when signals it reads change. Signal subscriptions established during that first render get dropped after the next effect run (signal-core only retains subscriptions for signals re-read in the current run), so writes to those signals quietly stop triggering re-renders. The whole rendered tree looks frozen; only elements *outside* the `each()` reflect updates.
>
> The wrong shape:
>
> ```tsx
> const COLUMNS = [{ id: 'todo', title: 'To do' }, { id: 'doing', title: 'Doing' }, { id: 'done', title: 'Done' }];
> const board = signal<Record<string, Card[]>>({ todo: [...], doing: [...], done: [...] });
>
> mount(root, () => (
>   <div>
>     {each(COLUMNS, (col) => (                  // ← static array; cache-hits forever
>       <div data-key={col.id}>
>         {each(board.value[col.id], (card) => ...)}   // ← signal read never re-tracked
>       </div>
>     ))}
>   </div>
> ));
> ```
>
> The right shape:
>
> ```tsx
> mount(root, () => (
>   <div>
>     {COLUMNS.map((col) => (                    // ← .map: outer loop re-runs every render
>       <div data-key={col.id}>
>         {each(board.value[col.id], (card) => ...)}   // ← inner each() still gets keyed reconcile
>       </div>
>     ))}
>   </div>
> ));
> ```
>
> Rule of thumb: if the array reference is the same across renders AND the row render reads signals, you want `.map()`. If the array is a fresh reference per render (because it came from a signal or a filter/sort pipeline), you want `each()`. Inner `each()` over the *dynamic* sub-list is fine in both shapes.

### Granular reconcile via `arraySignal`

Pass an `arraySignal` to `each()` and `mount()` runs an even faster path: instead of iterating the whole snapshot to classify changed/unchanged rows, the reconciler consumes the patch queue the `arraySignal` emitted (one `update`/`insert`/`remove`/`move` per mutation) and applies only those to the live DOM. Cost is O(patches), not O(N).

```tsx
import { each, mount } from 'kerfjs';
import { arraySignal } from 'kerfjs/array-signal';

const rows = arraySignal<{ id: number; label: string }>([]);

mount(rootEl, () => (
  <ul>{each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
));

rows.push({ id: 1, label: 'a' });           // 1 insert patch
rows.update(0, (r) => ({ ...r, label: 'A' })); // 1 update patch
```

When patches are emitted contiguously (e.g. an append-1k loop, or a partial-update batch), the reconciler bulk-parses them in a single `template.innerHTML` call and applies one `insertBefore` per fragment.

A few invariants the granular path holds:

- **First render takes the snapshot path** even when patches were queued before mount — there's no binding yet to apply patches against, so the whole list is rendered fresh.
- **`replace()` always falls back to snapshot** — wholesale resets are easier to reconcile that way and preserve focus better.
- **A throwing render falls back to snapshot** — pre-rendering happens at JSX-eval time inside a try/catch, so a single bad row doesn't desync the binding from the signal.
- **Drift triggers a rebuild** — if a previous render threw mid-batch, the next render notices that `binding.length + patch_delta !== signal.length` and rebuilds via the snapshot path.
- **An emptied list rebuilds via snapshot on refill** — once a binding's row count reaches zero there is no live row to anchor patches against, so the next non-empty render takes the snapshot path (and re-binds) rather than the patch path.

See §2.6 for the full `arraySignal` API.

## 4.3 Diff escape hatches

Three `data-*` attributes opt portions of the live tree out of the diff. They overlap deliberately — pick the one that matches your reason for excluding the element.

| Attribute | Element itself | Subtree | Trailing-removal | Use when |
| --- | --- | --- | --- | --- |
| `data-morph-skip` | left verbatim (no attr morph) | left verbatim | n/a (the element is in the template) | Library-owned hosts: xterm / Monaco / D3 — the library mutates classes too, so you don't want kerf undoing them. |
| `data-morph-skip-children` | attrs morph | left verbatim | n/a | Client-hydrated slots: server emits an empty container, the client fills it asynchronously, but the server's classes / data attrs on the slot itself still need to flow through (e.g. `class="slot is-loading"` → `"slot is-ready"`). |
| `data-morph-preserve` | attrs morph if matched; otherwise untouched | morphed if matched; otherwise untouched | skipped (element survives even when the new template doesn't emit it) | Imperatively-injected nodes the consumer added AFTER first render — autoplay `<video>`, tooltip layer, analytics pixel — that aren't in the JSX. |

### `data-morph-skip` — library-owned subtree

Apply this attribute to any element whose subtree AND attributes you DON'T want kerf to touch:

```tsx
<div id="chart-mount" data-morph-skip />
```

After the first render, mount your library widget into `#chart-mount` directly:

```ts
const chart = new ThirdPartyChart(document.getElementById('chart-mount')!);
```

On subsequent re-renders, the diff sees `data-morph-skip` on the host and short-circuits before attribute morphing — so the entire subtree (the chart's internal DOM) AND any classes the library set on the host are preserved. Use this for:

- xterm.js / Monaco-style editors.
- D3 / Plotly / Chart.js mounted regions.
- Any element with imperative DOM mutations you manage yourself.

> **Warning: `data-morph-skip` freezes all static reactive content inside the element.** The morph never visits a skipped element's children, so any JSX that reads signals directly (e.g. `<p>{count.value}</p>`) inside a `data-morph-skip` ancestor silently stops updating — the effect re-runs, the template is re-built, but the morph short-circuits and the new HTML is never applied.
>
> `each()` lists inside a skipped element are a special case: the keyed reconciler operates directly on the live parent and is independent of the morph, so list rows DO still update. This means a `data-morph-skip` element can contain an `each()` list whose rows update while other signal-reactive siblings are frozen — a confusing asymmetry. As a rule: if any direct JSX inside the element reads a signal, don't mark it `data-morph-skip`.
>
> Enable `KERF_DEV_WARN_EACH_IN_MORPH_SKIP=1` (see §11 dev-warnings) to get a runtime warning when an `each()` list's parent chain crosses a `data-morph-skip` boundary.

### `data-morph-skip-children` — client-hydrated slot

Apply this attribute when the *children* are imperatively painted (and must survive the morph) but the element itself is server-rendered and needs its attributes to keep flowing through:

```tsx
// Server template
<div class={`card-comments ${state}`} data-morph-skip-children />
```

```ts
// Client paints comments into the slot asynchronously
fetchComments(cardId).then(rows => {
  slot.replaceChildren(...rows.map(renderRow));
});
```

The diff still morphs the slot's `class` (so `is-loading` → `is-ready` transitions work) but leaves the comment rows alone. Use this for any "server controls the shell, client owns the contents" pattern.

The distinction vs `data-morph-skip` matters: if the slot's host classes need to update across renders, you want this, not `data-morph-skip`.

### `data-morph-preserve` — imperatively-injected child

Apply this attribute to an element that the consumer adds to the live tree AFTER first render — a node the JSX never emits but whose lifetime is managed outside kerf:

```ts
// First render emits <article class="card">...</article>.
// Client-side autoplay module appends a hidden <video> per card:
const v = document.createElement('video');
v.dataset.morphPreserve = '';  // any value (even '') opts the node out of removal
v.muted = true; v.playsInline = true;
v.src = card.videoUrl;
card.appendChild(v);
```

On the next render kerf's template still emits just `<article class="card">…</article>` (no `<video>`). Without the attribute, the diff's trailing-removal pass would remove the `<video>` because nothing in the new template matched it. With `data-morph-preserve`, kerf skips it in that pass and the imperatively-added element survives.

Scope is deliberately narrow — it's an **end-of-list-discard opt-out**, nothing more:

- If a keyed-match (`id` / `data-key`) in the new template lines up with the preserved element, kerf will still move it (`insertBefore`) to wherever the template places it. The attribute doesn't pin position.
- Attribute morphing and child diffing still run on a matched preserved element exactly as on any other element. The attribute only affects the "unmatched → remove" decision.
- Use `data-morph-skip` if you also need the element's subtree/attributes left alone.

Comparison:

- `data-morph-skip` covers *library-owned hosts*: the whole region is off-limits.
- `data-morph-skip-children` covers *server-rendered shells*: attributes flow, children are off-limits.
- `data-morph-preserve` covers *imperatively-injected children*: the element keeps existing across renders even though kerf's template never mentions it.

## 4.4 Focus + selection preservation

When the diff is about to update an element that is currently the active element, kerf preserves the user's in-progress edit. The mechanism differs by element kind:

### `<input>` (text-entry types) and `<textarea>`

For `input[type=text|search|url|email|tel|password|""]` and `<textarea>`, kerf:

- Copies the live `.value` and `selectionStart` / `selectionEnd` onto the morph target.
- Lets the diff proceed with the update.

The result: attribute updates from the surrounding render still apply (className, disabled, etc.), but the user's typed value and cursor position survive. They never see their cursor jump mid-keystroke.

Other input types (range, color, file, date, checkbox, radio…) don't have meaningful text-selection state, so they aren't touched specially — the diff proceeds normally.

### Form-state properties: `checked`, `value`, `selected`

Browsers detach a form control's live property from its attribute once the control is "dirty" (the user — or script — has touched it): after that, the attribute is only the *default*. An attribute-only reconciler would update `checked=""` on a checkbox the user already clicked while the visible checkmark stayed stale.

kerf closes this gap with one rule: **whenever the diff (or a fine-grained signal binding) actually mutates a `checked`, `value`, or `selected` attribute, the matching property is synced too.** The consequences:

- **Controlled usage works after user interaction.** `checked={done.value}` re-checks a box the user unchecked; `value={v.value}` updates a non-focused input the user typed into; `selected` flips a `<select>` back. A controlled `<textarea>{text.value}</textarea>` follows template-text changes the same way.
- **Uncontrolled usage is untouched.** JSX that never mentions the attribute never mutates it, so the user's state survives unrelated re-renders — the same philosophy as the user-agent-owned `open` attribute on `<details>`/`<dialog>`.
- **The focused element still wins.** A focused text input or textarea keeps the user's in-progress edit (the preservation rules above take precedence over `value` sync).

### `[contenteditable]`

For a focused contenteditable, kerf takes the heavier-handed approach: **the entire subtree is skipped on this morph**, the same way `data-morph-skip` works. The user's typed content, caret position, and any multi-range selection survive verbatim — including any custom DOM they produced (`<b>`, `<a>`, line breaks, etc.). The trade-off is that *any* update to the contenteditable's attributes or children is also deferred until the next render after the user blurs.

This is the behavior you almost always want for in-progress rich-text editing: don't disturb the editor mid-edit. If you want kerf to drive a contenteditable's content despite the user being focused, that's outside the framework — manage it imperatively or move that state outside the contenteditable.

### Non-text focused elements

For anything else with focus (a `<button>`, `<a>`, `<div tabindex>`), the diff proceeds normally. There's no special handling — none of those elements have user-visible state that a re-render would clobber.

### Across `each()` reorders

When the keyed list reconciler moves a row whose descendant is the focused element, the row's DOM node is reused — the focused element stays connected to the document. Some engines (older Safari, happy-dom) drop focus state on `insertBefore` even when the element survives, so the reconciler snapshots the active element + its selection range before the move pass and re-applies them afterwards. Engines that already preserve focus see a no-op; engines that don't get a transparent fix.

Replaced rows (cache miss — the row's HTML changed) are a different story: the old node is removed before the new one is inserted, so focus that lived inside it is genuinely gone. That matches the behavior of any framework that re-renders a row.

## 4.4.1 User-agent-owned state attributes

A handful of HTML elements have boolean attributes that the *user agent* sets in response to user interaction — `<details open>` and `<dialog open>` are the canonical pair. When a user expands a `<details>`, the browser adds `open=""` to the element. If kerf's morph treated that attribute like any other developer-authored attribute, the next re-render would see the live `open=""` against a template without it and remove it — collapsing the user's expansion.

To keep uncontrolled `<details>` and `<dialog>` working naturally, the morph **never removes `open` from these elements**. The attribute is treated as user-agent-owned: the diff doesn't know whether the developer or the browser put it there, so the safe default is to leave it alone.

### Trade-off

Controlled-style usage where a signal flips `open` from `true` → `false` does NOT auto-collapse the element:

```tsx
// Open the panel from JSX — works.
<details open={isOpen.value}>...</details>
//   isOpen.value === true  → open attribute set on the live element.
//   isOpen.value === false → open attribute is NOT removed (it survives like a user-set one).
```

If you need controlled behavior, drive `open` imperatively from a signal subscription:

```tsx
import { effect } from 'kerfjs';

mount(rootEl, () => <details id="panel">...</details>);
effect(() => {
  const det = document.getElementById('panel') as HTMLDetailsElement;
  if (det) det.open = isOpen.value;
});
```

Or design around the element's native semantics: render `<details>` once, listen for the `toggle` event, and push the open state into a signal — that way the user's interaction and your state stay in sync without the framework arbitrating.

## 4.4.2 Imperative DOM mutations and the no-op-render fast path

`mount()` re-runs your render function whenever a signal it read changes. On each re-run kerf compares the new "static surrounds" HTML (everything outside `each()` lists) against the previous render's. **If they're byte-for-byte identical, the diff is skipped entirely** — the cost-saving optimization that lets a list signal flip a class without paying for a parent walk.

The implication for imperative DOM mutations: any attribute, text node, or child you set on a kerf-managed element via `el.setAttribute(...)`, `el.appendChild(...)`, or similar **survives across no-op re-renders**. The framework's "smallest cut" model says: if JSX didn't ask for the change, don't touch what's there.

```tsx
const tick = signal(0);
mount(rootEl, () => {
  void tick.value;                           // re-renders on every tick
  return <div className="card">hello</div>;  // …producing the same HTML
});

const div = rootEl.querySelector('div')!;
div.setAttribute('data-instrumented', 'true');  // imperative mutation

tick.value = 1;
// div.getAttribute('data-instrumented') === 'true'
// — no diff ran, the attribute survived.
```

The complementary half: **when the surrounds DO change**, the diff runs and `morphAttributes` removes anything the JSX didn't authorise:

```tsx
const label = signal('first');
mount(rootEl, () => <div className="card">{label.value}</div>);
const div = rootEl.querySelector('div')!;
div.setAttribute('data-instrumented', 'true');

label.value = 'second';   // surrounds changed → diff runs → attribute wiped.
```

### Practical guidance

- For library-owned subtrees (charts, terminals, editors), use `data-morph-skip` to opt out of diffing entirely. The fast path's behavior above is brittle as a long-term plan because *any* change to the JSX surrounds will wipe your imperative mutations on the next render.
- For attribute reflection (e.g. an MutationObserver-driven highlight), prefer driving the attribute through a signal so the JSX is the source of truth. The fast path then becomes irrelevant.
- For one-off attribute pokes (analytics IDs, ARIA mirrors), the fast path means the poke usually sticks — but you should expect it to disappear the moment the surrounding render changes shape. Design for that.

### Why kept this way

The alternative — running the diff on every render even when nothing changed — costs ~8 ms per update on partial-update / select-row / swap-rows in the krausest harness (the scenarios where the list changes but surrounds don't). The "smallest cut" promise is the framework's headline. The fast path is kept and documented here.

## 4.4.3 Using `morph()` outside of `mount()`

`morph(liveRoot, template)` is the same reconciliation primitive `mount()` uses internally, exported for one-shot use against an already-populated element. Reach for it when `mount()`'s "wipe and bulk-render on first paint" semantics don't fit — typical cases:

- **SSR / static-fragment hydration.** The server delivered an HTML fragment; you want to reconcile it toward a freshly-built version after some client-side state arrives, without throwing away the DOM nodes the server already streamed.
- **Page-refresh diffs.** You hold a freshly-built `<article>` and want the live `<article>` on screen to morph to match — preserving any focused inputs, any user-toggled `<details open>`, any imperative mutations the user didn't make.
- **Third-party widget remounts.** The widget rendered something; you have a new version of "what it should look like" as HTML and need an in-place update.

```ts
import { morph } from 'kerfjs';

// Element template
morph(liveCard, freshlyBuiltCard);

// Raw HTML string (parsed into a transient element whose tag matches liveCard)
morph(liveCard, '<article class="card">…</article>');

// SafeHtml (e.g. from `raw()` or a JSX expression)
morph(liveCard, raw(htmlFromServer));
```

`morph()` honors every short-circuit `mount()`'s internal pipeline uses: `data-morph-skip`, `data-morph-skip-children`, `data-morph-preserve`, focused-input value + selection preservation, focused-`[contenteditable]` subtree preservation, and `<details>`/`<dialog>`'s user-agent-owned `open` attribute. Match keys (`id`, then `data-key`) work the same way as inside a mount.

What `morph()` doesn't do: it isn't reactive (no signal subscription, no effect). It runs once per call. If you want re-renders, use `mount()`. If you want a one-shot reconciliation against a tree you already own, `morph()` is the primitive — five lines of glue away from what would otherwise force you back to `mount()`'s wipe-and-rebuild semantics or to a third-party morph library.

The internal third parameter (`ownedItems`) coordinates with `mount()`'s list reconciler and should be omitted by public callers.

## 4.5 Multiple `mount()` calls

You can call `mount()` on different elements for different parts of the page. Each one gets its own `effect()` and tracks its own signals:

```ts
mount(badgeEl, () => <span>{cart.state.value.items.length}</span>);
mount(listEl,  () => <ul>{cart.state.value.items.map(renderRow)}</ul>);
mount(footerEl, () => <div>{cartTotal.value.toFixed(2)}</div>);
```

Each region re-renders only when its own dependencies change. Adding an item to the cart triggers all three; changing an unrelated piece of state triggers none.

The regions must be disjoint: mounting the same element twice, or an element inside (or containing) an already-mounted tree, throws immediately — one mount per tree. Compose with plain functions that return JSX instead of nesting mounts; see §11.2.10 in `docs/11-dev-warnings.md` for the guard's details.

## 4.6 Server-rendering

`SafeHtml.toString()` is server-safe. You can build the same JSX server-side, write the resulting string into your HTML response, and then call `mount()` on the same element on the client. The first-render path bulk-renders into the existing DOM via `innerHTML`; if the server output and client output match (which they should, given the same store state), the resulting tree is identical — and signal subscriptions are now wired up for future updates.

This isn't a full SSR story (no streaming, no hydration mismatch detection), but it's enough for "render once on the server, hydrate interactivity on the client" workflows.

## 4.7 Disposing

The disposer returned by `mount()` tears down the effect:

```ts
const dispose = mount(rootEl, render);
// later, when rootEl leaves the DOM:
dispose();
```

After dispose, signal mutations no longer trigger re-renders for this mount. The DOM tree itself is left as-is — kerf doesn't clear it; you do.

## 4.8 What `mount` does NOT do

- It doesn't manage component lifecycle. There's no `onMount` / `onUnmount` / `onUpdate` hook. Use `effect()` directly if you need a side effect tied to a signal.
- It doesn't batch updates across animation frames. If a signal mutates 100 times in 16ms, the render fn runs 100 times. Use `batch()` if you have a multi-write action that should fire once.
- It doesn't diff what didn't change shape. A re-render whose static-surrounds HTML is byte-for-byte identical to the previous render skips the template build, parse, and morph walk entirely (the §4.4.2 fast path) — only list segments still dispatch to their reconcilers. When the surrounds DO change, the diff walks the tree with per-element `isEqualNode` short-circuits.
