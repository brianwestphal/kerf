# `kerfjs/require-delegate-disposer`

Require capturing the disposer returned by `delegate()` and `delegateCapture()`.

Both helpers install a single listener on the root element and return a `() => void` disposer — the *only* way to remove the listener once it's attached. Discarding the return value is safe in exactly one case: the registration is genuinely page-lifetime (root is `document.body` or another never-torn-down element, attached once at startup, never re-registered). In every other case the listener closure pins `rootEl`, `handler`, and everything the handler closes over (stores, signals, app state) — so an undisposed delegate on a transient root leaks both the listener and the app graph it references, and re-mount cycles stack listeners linearly. `mount()`'s own disposer does NOT remove delegates for you.

See [kerf docs §5.3 — Disposers](https://brianwestphal.github.io/kerf/docs/5-event-delegation/#53-disposers) for the full rationale.

## ❌ Discouraged

```ts
// Transient root: the modal is mounted on open and torn down on close, but
// the delegate listener (and its closure over stores) stays attached forever.
function openModal(host: HTMLElement) {
  mount(host, () => <ModalView />);
  delegate(host, 'click', '[data-action]', handleAction);  // disposer discarded
}
```

```ts
// Re-mount cycle: every htmx swap re-attaches mount + delegate, but the
// previous delegate's listener never gets removed. Listener count grows
// linearly with swap count.
function onSwap(initial: CartItem[]) {
  mount(root, () => <Cart items={items} />);
  delegate(root, 'click', '.remove', handleRemove);  // disposer discarded
}
```

## ✅ Recommended

Capture and call the disposer alongside the mount teardown:

```ts
function openModal(host: HTMLElement) {
  const stopMount    = mount(host, () => <ModalView />);
  const stopDelegate = delegate(host, 'click', '[data-action]', handleAction);

  return function closeModal() {
    stopMount();
    stopDelegate();
    host.remove();
  };
}
```

Or collect into a disposer array:

```ts
const disposers: Array<() => void> = [];
disposers.push(mount(host, render));
disposers.push(delegate(host, 'click', '[data-action]', onAction));
disposers.push(delegate(host, 'keydown', '[data-edit]', onEdit));

function teardown() {
  for (const off of disposers) off();
  disposers.length = 0;
}
```

## When the registration really is page-lifetime

If the registration is attached once at module load and the root never tears down (`document.body`, a never-removed app shell), discarding the disposer matches the intent. Two opt-outs:

```ts
// 1. The `void` operator as an explicit-discard sigil.
void delegate(document.body, 'click', ACTIONS.inc.selector, () => count.value++);
```

```ts
// 2. Standard eslint-disable for one-off cases.
// eslint-disable-next-line kerfjs/require-delegate-disposer
delegate(document.body, 'click', ACTIONS.inc.selector, () => count.value++);
```

`void` is the lower-friction option when the file has many page-lifetime registrations clustered together; eslint-disable carries the rule name with it, which makes it easier to grep for.

## What the rule does and doesn't see

The rule flags `delegate(...)` or `delegateCapture(...)` whose immediate parent is an `ExpressionStatement` — i.e. the call is the entire statement and nothing consumes its return value. Any non-statement parent is accepted: assignments (`const off = …`), returns (`return …`), array elements (`[…, delegate(…), …]`), object properties (`{ off: delegate(…) }`), call arguments (`onCleanup(delegate(…))`), the `void` operator, etc.

What the rule does NOT do:

- It does not verify that the captured disposer is actually called somewhere. `const off = delegate(...)` followed by never calling `off()` still passes the rule — that's cross-function flow analysis and out of scope.
- It does not track imports. The rule matches by callee name (`delegate` / `delegateCapture`). A local function with the same name will trigger the rule; suppress with `eslint-disable` or rename the local.
- It does not look at `mount()` disposers. `mount()` has the same lifecycle property but is out of scope for this rule.

## When to suppress

- **Genuinely page-lifetime registration** — use `void delegate(...)` or `// eslint-disable-next-line kerfjs/require-delegate-disposer`.
- **A local `delegate()` function unrelated to kerf** — rename it or suppress per-file with a directive.

Don't suppress because "it's only a small leak" or "we'll add disposal later." The cost of capturing the disposer is one variable assignment; the cost of a slow leak that compounds across user actions is much higher.
