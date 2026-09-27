# 19. Native top-layer backing for `kerfjs/overlay`

> **Status: shipped.** An **opt-in** `native: true` option on the seven
> overlay/dialog/popover/tooltip surfaces hosts the overlay in the browser
> **top layer** — a `<dialog>` opened
> with `.showModal()` for modal surfaces, the **Popover API** for non-modal ones —
> feature-detected, falling back to today's plain `<div>` where unsupported. The
> `render` slot and the promise API are unchanged. Toasts and standalone
> positioning helpers do not create native top-layer hosts.

## 19.1 Why — three correctness gaps in a pure-JS overlay

kerf's overlay is structural-only and, by default, hand-rolls everything a modal
needs from a plain `<div>` appended to `document.body`. That is correct for the
common case but has three gaps a JS overlay cannot fully close:

1. **Stacking.** The `<div>` sets **no `z-index`** — it wins only by being last in
   DOM order. Any page element with `position: fixed/absolute; z-index: N` (a
   sticky header, a toast from another library) can paint _over_ it. The browser
   **top layer** (`dialog.showModal()`, `[popover]`) always renders above the
   entire page regardless of `z-index`.
2. **Real modality / inerting.** kerf's focus trap only intercepts `Tab`.
   `dialog.showModal()` makes the rest of the document **`inert`** — pointer,
   focus, _and_ assistive-technology virtual-cursor navigation are all blocked. A
   JS focus trap leaves the background reachable by AT and by pointer.
3. **Light-dismiss for popovers.** The Popover API brings native light-dismiss and
   the `:popover-open` state for `popover()` / `tooltip()`.

`native: true` opts into the platform primitives that close these gaps, while
keeping kerf's exact promise API and `render` slots.

## 19.2 Why opt-in, not the default

kerf is **structural-only and ships zero CSS.** Native `<dialog>` and `[popover]`
carry **UA default styles** — a `::backdrop`, centering, a border, padding,
`margin: auto`. Switching the _default_ backing would silently inject those styles
into every consumer's dialog, a behavior change for a no-CSS library; and a
"structural reset" of those styles would itself be shipping CSS. So native backing
is **opt-in** — a consumer asks for it per call (or wraps their own default) and
takes on the UA styling with eyes open. The default stays the plain `<div>`,
byte-for-byte today's behavior. (Default-on can be revisited later if a
"reset UA styles" story is agreed.)

## 19.3 The API — a single `native: boolean`, feature-detected

`native?: boolean` (default `false`) is accepted by `overlay` and threaded through
`confirm` / `prompt` / `form` / `choice` / `popover` / `tooltip`. **Modality
already determines which primitive applies** — the caller never picks
dialog-vs-popover; the function they called does:

<div class="kerf-compare">

| Surface                                                          | Modality  | Native backing                 |
| ---------------------------------------------------------------- | --------- | ------------------------------ |
| `overlay({ trap: true })`, `confirm`, `prompt`, `form`, `choice` | modal     | `<dialog>` + `.showModal()`    |
| `overlay({ trap: false })`, `popover`, `tooltip`                 | non-modal | `[popover]` + `.showPopover()` |

</div>

Each primitive is **independently feature-detected** (an engine can ship one
without the other):

- modal: `typeof HTMLDialogElement.prototype.showModal === 'function'`
- non-modal: `typeof HTMLElement.prototype.showPopover === 'function'`

Where the API is missing, kerf **falls back to the plain `<div>`** with today's
wiring — so `native: true` is always safe to pass; it is a progressive
enhancement, never a hard requirement.

```ts
// Modal, in a real <dialog> where supported (else a <div>):
const ok = await confirm('Delete this file?', { native: true, danger: true });

// Non-modal, in the top layer via the Popover API where supported:
const menu = popover(triggerEl, <Menu />, { native: true });
```

## 19.4 What changes internally (and what doesn't)

- **Modal (`<dialog>`).** kerf creates a `<dialog>` instead of a `<div>`, appends
  it, mounts the content, then calls `showModal()`. The browser inerts the rest of
  the document and confines `Tab` focus itself, so kerf does **not** install its
  keyboard trap; Escape arrives as the dialog's **`cancel` event**, which kerf
  takes over (`preventDefault` so it owns teardown, then dismisses only if
  `escape` is a dismiss trigger). Backdrop dismissal is unchanged — a click whose
  target is the dialog element (the `::backdrop`) dismisses. `close()` calls the
  dialog's native `.close()` before removing the node. The ARIA `role="dialog"` /
  `aria-modal="true"` fallback attributes are **omitted** in native mode (the
  `<dialog>` conveys modality itself).
- **Non-modal (`[popover]`).** kerf sets `popover="manual"` on the wrapper and
  calls `showPopover()`; it keeps owning its **own** dismiss wiring (outside-click,
  `outsideIgnore`, etc.) rather than the API's auto light-dismiss, so dismissal
  behavior is identical to the `<div>` path — the win is purely top-layer
  stacking. kerf neutralizes the UA `[popover] { inset: 0; margin: auto }`
  anchoring (`style.inset = 'auto'`) so `positionAnchored` keeps controlling
  placement. `close()` calls `hidePopover()` before removing the node.
- **A failed `showModal()` / `showPopover()` rolls back.** The native call runs
  after the wrapper is appended and its content mounted, so it is one phase of
  `overlay()`'s transactional construction: if it throws (e.g. the real
  `InvalidStateError` for a `container` that is not connected to the document),
  kerf removes the listeners, disposes the mount, removes the node, restores
  focus, and rethrows the original error. It does not call `close()` /
  `hidePopover()` on an element that never entered the top layer. For the
  dialog helpers the rollback also covers their post-open wiring (a missing
  required input closes the open `<dialog>` so the page is not left inert).
  `tooltip()` opens from its `delay` timer, where there is no caller: a failed
  `showPopover()` there is rolled back the same way, the tooltip stays armed
  for the next hover/focus, and the error escapes the timer callback for the
  host to report (a window `error` event) — see `docs/8-api-reference.md`
  › `tooltip`.
- **Native surfaces share the arbitration stack.** A native `<dialog>` or
  `[popover]` joins the same per-document, open-order stack as the `<div>`
  fallbacks (see `docs/8-api-reference.md` › `overlay`): the dialog's `cancel`
  dismisses it only when it owns Escape, a fallback modal beneath an open
  dialog leaves the dialog's `Tab` order and Escape alone, and a surface above
  a dialog that consumes an Escape `preventDefault`s the keydown so the UA's
  close request never reaches the dialog — one Escape closes one surface. A
  `tooltip()` handles no input, so it never takes Escape or the trap from a
  modal it is shown inside.
- **Surfaces opened over a modal `<dialog>` are lifted automatically
  (KF-0V9RTE).** A browser inerts everything outside an open modal dialog and
  paints a plain element beneath its top layer, so a `<div>` surface opened in
  that state was invisible and unusable. Whenever a modal `<dialog>` is open —
  one kerf opened, or an app-owned one reported by `:modal` — a surface opened
  without `native` takes the native path anyway: a non-modal one becomes a
  `[popover]`, a modal one a `showModal()` `<dialog>` of its own (the topmost
  modal, so fully interactive). The UA-style caveat in §19.5 then applies to it
  as if `native: true` had been passed. Two cases stay broken and are reported
  by the always-on `kerfjs/dev` warning (`docs/11-dev-warnings.md` §11.2.17):
  an engine without the needed API (the surface stays a hidden `<div>`), and a
  lifted non-modal surface with focusable controls, because every engine keeps
  a popover outside the modal dialog inert even in the top layer (verified in
  Chromium, Firefox, and WebKit). Tooltips have no controls, so the lift fully
  repairs them; an interactive popover anchored inside the dialog avoids the
  lift entirely by rendering into the dialog's host slot (next bullet).
- **A popover anchored inside a modal `<dialog>` renders into its host slot
  (KF-FBHQEP).** The lift above keeps a surface visible, but a lifted popover
  with controls is still inert: every engine inerts content outside the modal,
  top layer or not. So `popover()` and `tooltip()` first ask whether their
  anchor sits inside an open modal `<dialog>`; if it does, and that dialog has
  a **host slot** — an element carrying both `data-kerf-overlay-host` and
  `data-morph-skip` whose nearest `<dialog>` is that dialog — the surface is
  appended there instead of to `document.body`. It is then part of the modal
  subtree: clickable, focusable, reached by the dialog's native Tab order, and
  never lifted (so the `inert` dev warning cannot fire for it). Because that
  Tab order is the engine's, not a kerf trap's, kerf makes every implicitly
  tabbable control in a slot-hosted surface an explicit stop (`tabindex="0"`,
  authored tabindexes and disabled / `hidden` controls untouched) on open and
  again before each Tab keypress, so a control a re-render added is covered
  too — exactly what its fallback focus trap does (KF-QZ9SFG: macOS WebKit
  skips implicitly tabbable buttons unless the system keyboard-navigation
  preference is on). Placement is
  unchanged — `positionAnchored` still sets `position: fixed`. A `<dialog>`
  without a `transform` / `filter` / `contain` is not a containing block for
  fixed descendants, so viewport coordinates land next to the anchor as they
  are; one with such a style is, and `positionAnchored` measures that
  containing block and compensates (see §19.5, KF-QKW22R: probe-measured
  containing-block compensation). Stack arbitration is unchanged too: the popover is above the dialog
  on the open-order stack, so an Escape-dismissible popover consumes the first
  Escape (and `preventDefault`s it so the dialog never sees the close request)
  and the next Escape reaches the dialog's `cancel`.
  - **kerf's own dialogs get a slot automatically.** When the anchor's dialog
    is one kerf opened (a `native: true` modal, or a lifted one) and has no
    slot yet, kerf appends `<div data-kerf-overlay-host data-morph-skip
data-morph-preserve style="display:contents">` to it on first use: no
    layout box (so it cannot disturb a flex/grid `gap`), skipped and never
    removed by the dialog content's own `mount()` re-renders, and gone with
    the dialog. It is created lazily so a dialog that never hosts a popover
    keeps exactly the markup its content rendered.
  - **App-owned dialogs opt in** by rendering `<div data-kerf-overlay-host
data-morph-skip></div>` anywhere inside the dialog (both attributes are
    required — the slot rule is one selector everywhere), or by passing
    `container` explicitly. An element marked without `data-morph-skip` is not
    a slot. A slot inside a nested `<dialog>` belongs to that dialog, not the
    outer one.
  - **The slot is the one sanctioned nested-mount boundary.** The dialog is
    usually already a `mount()` root (kerf's own dialog mounts its content
    into the `<dialog>` itself), and kerf allows one mount per tree. The slot
    (`src/utils/overlay-host.ts`) is where that rule stops: `mount()`'s nesting
    guard does not walk past it in either direction, the enclosing mount's
    morph skips it (`data-morph-skip`), and its binding wiring and `each()`
    list-marker scans never descend into it (nor does the opt-in
    `rebuiltListeners` dev observer, KF-J31B0Q) — so the inner surface's
    `data-kfb` / `kfb:` / `kf-list:` markers, which reuse the same per-mount
    counters, can never be taken for the outer mount's own. This boundary is
    what costs the shared core ~0.08 KB min+gzip.
  - **A slot-hosted surface leaves with its slot (KF-WZ9KQM).** A popover or
    tooltip normally closes when its anchor leaves the document, but an
    anchor moved out of the dialog before the dialog is removed stays
    connected while the surface goes with the dialog. So a surface in a slot
    also watches its own wrapper (`attach()`): when the wrapper leaves the
    document it closes as cleanup — no `onDismiss`, `result` resolves
    `undefined` — and leaves the open-order stack. A tooltip forgets that
    surface, so the next hover or focus shows it again.
  - An explicit `container` always wins. A `container` inside an open modal
    `<dialog>` is also never lifted, since the surface is already part of the
    modal subtree (for a kerf-mounted dialog that container must be a slot, or
    the nesting guard throws and construction rolls back).
- **Surfaces already showing are re-hosted when kerf opens a modal
  `<dialog>` (KF-FJ9VD8).** The lift above is decided when a surface opens, so
  kerf also repairs the reverse order: whenever it calls `showModal()` itself
  (a `native: true` modal, or a lifted one), every open non-modal kerf surface
  — tooltips and popovers — moves into the top layer through the Popover API,
  or, if it is already a `[popover]`, is hidden and re-shown so it stacks above
  the new dialog (the top layer orders by most recent show). Open modal
  surfaces are left alone: they belong beneath the new modal. The same two
  `kerfjs/dev` warnings apply (`hidden` without the Popover API, `inert` for a
  re-hosted surface with focusable controls).
- **App-owned modal dialogs are observed too (KF-AHY6H4).** A modal
  `<dialog>` the app opens itself, outside kerf, gets the same re-hosting. A
  `<dialog>` fires a `toggle` event once it opens (it does not bubble, so kerf
  listens in the capture phase): while at least one kerf surface is open, one
  capture listener on the document (added when the open-order stack goes from
  empty to one surface, removed when it empties again, so a page with nothing
  open pays nothing) checks that the target is an open modal `<dialog>` kerf
  does not own, and lifts or re-shows every open non-modal kerf surface outside
  it. kerf's own dialogs are skipped because `overlay()` already re-hosted
  synchronously. Because `toggle` is queued as a task, the re-host lands one
  task after the app's `showModal()` call rather than inside it. **Gap:** an
  engine that fires no `toggle` event for `<dialog>` (engines that predate
  dialog toggle events) never reports the open, so surfaces already showing
  stay beneath such a dialog there; open the dialog through `overlay()` (or
  close the surface first). Chromium, Firefox, and WebKit as run by the test
  suite all fire it.
- **Unchanged everywhere:** the promise API (`{ el, close, result }`), the `render`
  slots, `validate`, Enter-to-submit, `initialFocus`, `outsideIgnore`, and
  focus-restore. kerf's manual focus-restore stays in place — redundant with
  `<dialog>`'s automatic restore, but harmless, and it is the fallback path's
  behavior.

## 19.5 Caveats to document (they are the tradeoff of native mode)

- **UA default styles apply, and kerf does not reset them.** In native mode the
  overlay is a real `<dialog>` / `[popover]`, so the UA `::backdrop`, centering,
  border, padding, and `margin` apply. Style them yourself — see the stable
  styling contract in §19.6. This is the price of the top layer; kerf shipping a
  reset would violate its zero-CSS contract.
- **`container` is effectively a visual no-op.** The top layer ignores where the
  element lives in the DOM, so `container` no longer controls where the overlay
  _appears_ (it still governs which document the element is created in, which
  matters for nested-document / Tauri cases). No dev warning is emitted — it is
  documented behavior.
- **A host slot inside a transformed or filtered dialog is compensated.** A
  surface rendered into a modal dialog's host slot is `position: fixed`. If
  the app styles that `<dialog>` with a `transform`, `filter`, `perspective`,
  `contain: layout/paint`, `will-change: transform`, or anything else that
  makes it the containing block for fixed descendants (a common centering or
  entrance-animation trick), fixed `left`/`top` are relative to the dialog
  instead of the viewport. `positionAnchored` detects this on every placement
  (KF-QKW22R): it inserts a 1px `position: fixed; left: 0; top: 0` probe next
  to the element, reads where it actually lands and how large it renders, and
  removes it again synchronously (never painted), then maps the viewport
  coordinates into the containing block's space — subtracting its origin and
  dividing out its scale. A probe rather than the element itself is measured
  so the element's own transform or a running entrance animation cannot skew
  the result. Translation and scale are compensated (the `gap` stays in
  viewport pixels); a **rotated or skewed** containing block is not, and no
  dev warning reports it. Two effects remain the app's to style around: a
  dialog with `contain: paint` or `overflow: hidden` still **clips** a
  slot-hosted surface to its box, and the probe is a transient DOM child, so
  an app `MutationObserver` over the slot's parent sees one add/remove pair
  per placement.
- **Focus-restore is doubly handled.** `<dialog>` restores focus on close and kerf
  also restores it; the result is the same, and there is no conflict.

## 19.6 The stable styling contract

Because kerf ships no CSS, native mode's usefulness depends on a **clear, stable**
way for the app to style the UA element. That contract is:

- **The `className` lands on the native element itself** — the `<dialog>` or the
  `[popover]` `<div>` — exactly as it does on the `<div>` today. Style the element
  through it.
- **The backdrop is styled via the `::backdrop` pseudo-element** of that same
  class: `.kerf-overlay::backdrop { … }` (or your custom `className`). This is the
  only way to style a top-layer backdrop, and it is stable across engines.

```css
/* Reset the UA dialog chrome and style the backdrop — the app owns this. */
dialog.kerf-overlay {
  border: 0;
  padding: 0;
  /* your own sizing / centering */
}
dialog.kerf-overlay::backdrop {
  background: rgb(0 0 0 / 0.4);
}
```

The `className` → element + `className::backdrop` → backdrop mapping is the
supported, stable surface; it will not change without a major version.

## 19.7 Testing

happy-dom implements `<dialog>` (`showModal` / `close` / `.open` / the `cancel`
event) but **not** the Popover API, and neither engine models the real top layer /
`inert` / `::backdrop`. So:

- **Unit tests** (`tests/unit/overlay-native.test.ts` › "native top-layer backing") assert
  the **wiring**, which is engine-independent: the element type (`<dialog>` vs a
  `[popover]` `<div>`), that it opens (`.open` / `showPopover` called), promise
  resolution through the native element, the `cancel`-event Escape path (dismiss
  when a trigger, swallow when not), backdrop dismissal, `close()` exiting the top
  layer, and the **fallback to `<div>`** when the API is absent. The popover path
  is exercised by stubbing `showPopover` / `hidePopover` (happy-dom lacks them).
- **Browser tests** (`tests/browser/overlay.spec.ts`, Playwright) assert the real
  platform behavior: a `native` `confirm` is a `<dialog>` with `open` set that
  resolves on click and disappears on close, and a `native` `popover` is
  `:popover-open` in the top layer.
- **The in-dialog host slot** (`tests/unit/overlay-modal-host.internal.test.ts`)
  pins slot selection, on-demand creation for kerf's dialogs, the app opt-in,
  explicit-container precedence, Escape ordering, and the nested-mount
  boundary (an outer mount re-rendering its bindings and `each()` lists while a
  popover with its own bindings and list lives in the slot);
  `tests/browser/overlay-modal-host.spec.ts` proves in real engines that the
  popover's button is clickable and focusable, Tab stays inside the modal,
  Escape closes the popover before the dialog, and fixed placement still lands
  below the anchor.
- **Construction rollback** (`tests/unit/overlay-construction.test.ts` with
  stubbed throwing `showModal` / `showPopover`; `tests/browser/overlay.spec.ts` ›
  "native: a showModal() failure rolls the <dialog> back…" with a real detached
  container) proves a failed top-layer entry leaves no node, mount, or listener
  behind and a later native overlay still opens and dismisses on Escape.

## 19.8 Scope and follow-ups

This ticket shipped **both** halves — the modal `<dialog>` backing and the
non-modal Popover backing — behind the one `native` flag. Deliberately deferred as
possible future work (each its own ticket if pursued):

- **Native light-dismiss for popovers** (`popover="auto"`) instead of kerf's
  outside-click wiring — would change dismissal semantics, so it is opt-in future
  work, not part of this behavior-preserving pass.
- **Default-on**, if and when a "reset UA styles" story is agreed that keeps the
  zero-CSS contract.
