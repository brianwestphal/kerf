# 13. Building reusable component packages

kerf has no component runtime — a "component" is just a function that takes props
and returns [`SafeHtml`](6-jsx-runtime.md). That makes shipping reusable components
as npm packages straightforward: a package exports plain functions, the consumer
imports and renders them like any local component. **Nothing in the runtime
prevents this**, and no extra build step is required beyond what a kerf app
already has.

This doc covers how to author such a package, the considerations that are unique
to kerf's no-instance model (state, events, cleanup, library-owned DOM), and how
to set up and publish the package — using the in-repo `eslint-plugin-kerfjs`
package as the sibling-package model.

## 13.1 What a component is

A component is a function `(props) => SafeHtml`. The JSX runtime calls it directly
when it sees a function-valued tag (`src/jsx-runtime.ts`: `if (typeof tag === 'function') return tag(props)`),
inlining the returned `SafeHtml` into the parent markup.

```tsx
// my-button.tsx — in your component package
import type { SafeHtml } from 'kerfjs';

export interface ButtonProps {
  label: string;
  /** A delegation hook, NOT an inline handler — see §13.3. */
  action: string;
  variant?: 'primary' | 'ghost';
}

export function Button({ label, action, variant = 'primary' }: ButtonProps): SafeHtml {
  return <button class={`kbtn kbtn-${variant}`} data-action={action}>{label}</button>;
}
```

The consumer renders it the same way they'd use a local function:

```tsx
import { Button } from 'my-kerf-buttons';

mount(root, () => (
  <div>
    <Button label="Add" action="add" />
    <Button label="Reset" action="reset" variant="ghost" />
  </div>
));
```

There is no instance, no lifecycle, and no per-component state — the function runs
on every render of the host `mount()`. Everything a component "remembers" must live
outside it (see §13.2).

## 13.2 State: the one thing to get right

Because a component is a plain function, **any state must live outside it** — in a
signal or store. The trap is module scope: a signal declared at the top of a
component module is a *singleton*, shared by every render and every consumer of
that module.

```tsx
// ❌ Shared across ALL <Counter /> instances and ALL apps that import this.
import { signal } from 'kerfjs';
const count = signal(0);
export function Counter() {
  return <span>{count.value}</span>;
}
```

That is correct for genuinely global state (a theme toggle, a toast queue) and
wrong for anything that should be per-instance. For per-instance state, export a
**factory** that creates the state and have the component read it from props:

```tsx
import { defineStore, type Store, type SafeHtml } from 'kerfjs';

export function createCounter(start = 0) {
  return defineStore({
    initial: () => ({ count: start }),
    actions: { inc: (s) => ({ count: s.count + 1 }) },
  });
}

export function Counter({ store }: { store: ReturnType<typeof createCounter> }): SafeHtml {
  return <span data-action="counter:inc">{store.state.count.value}</span>;
}
```

```tsx
// Consumer — two independent counters.
const a = createCounter(0);
const b = createCounter(100);
mount(root, () => (<><Counter store={a} /><Counter store={b} /></>));
```

The rule of thumb: **a reusable component should never own per-instance mutable
module state.** Accept signals/stores via props, or hand the consumer a factory.

## 13.3 Events and cleanup

Components are pure string-builders, so they can't attach listeners or register an
`effect()` and clean it up themselves — there is no lifecycle hook to run teardown.
Two patterns cover the cases:

1. **Markup + delegation (preferred for most components).** The component emits
   stable hooks (`data-action`, a class, an `id`) and the *host* wires events at the
   `mount()` root with [`delegate()`](5-event-delegation.md), which returns a
   disposer. This survives re-renders because the listener lives on the root, not on
   the (re-rendered) component nodes. Never use inline JSX event handlers
   (`onClick={...}`) — they don't survive the morph, and the
   `no-inline-jsx-event-handlers` lint rule flags them.

   If your component needs its own wiring, export a companion that the consumer
   calls once and disposes:

   ```ts
   import { delegate } from 'kerfjs';
   /** Returns a disposer — call it on teardown. */
   export function wireButtons(root: Element, onAction: (a: string) => void) {
     return delegate(root, 'click', '[data-action]', (e, el) =>
       onAction(el.getAttribute('data-action')!));
   }
   ```

2. **Imperative widget (for wrapping third-party libraries).** When the component
   owns a subtree kerf must not touch — a chart, an editor, a map — render an empty
   host marked [`data-morph-skip`](4-render.md) and expose a create/dispose pair:

   ```tsx
   export function ChartHost(): SafeHtml {
     return <div class="kerf-chart" data-morph-skip />;
   }
   export function mountChart(hostEl: Element, data: number[]) {
     const chart = new ThirdPartyChart(hostEl, data);
     return () => chart.destroy(); // disposer
   }
   ```

   See the [render doc](4-render.md) for the full `data-morph-skip` /
   `data-morph-skip-children` / `data-morph-preserve` semantics — note that
   signal-reactive JSX placed *directly inside* a `data-morph-skip` host stops
   updating, which is exactly why imperative widgets manage their own DOM.

## 13.4 Packaging

The single most important rule: **declare `kerfjs` (and any other shared runtime)
as a `peerDependency`, and never bundle it into your package.** A component returns
`SafeHtml` and reads signals; both rely on the consumer and your package agreeing on
*one* `SafeHtml` class and *one* signals instance. If your package bundled its own
copy of kerfjs, brand checks like `isSafeHtml` and signal identity would silently
break across the boundary — the same class-duplication hazard the in-repo
`tests/dist/safe-html-cross-bundle.test.ts` guards against. Keep kerfjs external.

A minimal `package.json`, mirroring `eslint-plugin/package.json`:

```jsonc
{
  "name": "my-kerf-buttons",
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "peerDependencies": { "kerfjs": ">=0.14.0" },
  "devDependencies": { "kerfjs": "^0.14.0", "tsup": "^8", "typescript": "^5" },
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": { "build": "tsup src/index.ts --format esm --dts --external kerfjs" }
}
```

The package's own `tsconfig.json` needs the same JSX wiring any kerf app uses, so
the author's `.tsx` compiles against kerf's runtime:

```jsonc
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "kerfjs" } }
```

**Consumers need no extra setup.** Your package ships compiled JS whose internal
JSX is already lowered to `kerfjs/jsx-runtime` calls. A consumer who already has a
working kerf app (`jsxImportSource: "kerfjs"`) can `import { Button } from 'my-kerf-buttons'`
and use it immediately — there's no component-specific toolchain to install.

## 13.5 Publishing

The repo publishes `kerfjs` and `eslint-plugin-kerfjs` from a single git tag in
lockstep — not a workspace monorepo, just sibling directories each with their own
`package.json`, `package-lock.json`, and a dedicated CI workflow
(`.github/workflows/release-eslint-plugin.yml`) gated on an npm Trusted-Publisher
environment. A third-party component package follows the same shape: build with
`tsup`, emit ESM + `.d.ts`, publish with npm provenance. There is no npm org/scope
requirement — `eslint-plugin-kerfjs` and `kerfjs` both publish unscoped.

## 13.6 Checklist

- [ ] Components are functions `(props) => SafeHtml`; no inline event handlers.
- [ ] No per-instance state in module scope — accept signals/stores via props, or export a factory.
- [ ] `kerfjs` is a `peerDependency` and is `external` in the build (never bundled).
- [ ] Events go through `delegate()` at the host root, or a companion `wire(root)` that returns a disposer.
- [ ] Library-owned subtrees use `data-morph-skip` plus a create/dispose pair.
- [ ] Build emits ESM + `.d.ts`; `tsconfig` sets `jsxImportSource: "kerfjs"`.
