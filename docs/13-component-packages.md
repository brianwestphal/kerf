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

## 13.0 Quick start: scaffold with `create-kerf-component`

The fastest way to a correctly-configured package is the `create-kerf-component`
initializer — it generates a package that already follows every rule below
(`kerfjs` as a peer dependency and `external` in the build, ESM + `.d.ts` output,
`jsxImportSource: "kerfjs"`, subpath exports) plus an example component that shows
the per-instance-state and `wire(root)`-disposer patterns and a stylesheet
that owns only its component:

```bash
npm create kerf-component@latest my-widgets
cd my-widgets
npm install
npm run build # tsup → ESM + .d.ts; kerfjs stays external
npm run catalog:check
npm run check:styles # each component styles only itself
```

Pass `.` to scaffold into the current directory. The rest of this doc explains
_why_ the generated package is shaped the way it is — read on if you're authoring
by hand or want to understand the rules the scaffold encodes.

## 13.1 What a component is

A component is a function `(props) => SafeHtml`. The JSX runtime calls it directly
when it sees a function-valued tag (`src/jsx-runtime.ts`: `if (typeof tag === 'function') return tag(props)`),
inlining the returned `SafeHtml` into the parent markup.

```tsx
// my-button.tsx — in your component package
import type { SafeHtml } from "kerfjs";

export interface ButtonProps {
  label: string;
  /** A delegation hook, NOT an inline handler — see §13.3. */
  action: string;
  variant?: "primary" | "ghost";
}

export function Button({
  label,
  action,
  variant = "primary",
}: ButtonProps): SafeHtml {
  return (
    <button class={`kbtn kbtn-${variant}`} data-action={action}>
      {label}
    </button>
  );
}
```

The consumer renders it the same way they'd use a local function:

```tsx
import { Button } from "my-kerf-buttons";

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
component module is a _singleton_, shared by every render and every consumer of
that module.

```tsx
// ❌ Shared across ALL <Counter /> instances and ALL apps that import this.
import { signal } from "kerfjs";
const count = signal(0);
export function Counter() {
  return <span>{count.value}</span>;
}
```

That is correct for genuinely global state (a theme toggle, a toast queue) and
wrong for anything that should be per-instance. For per-instance state, export a
**factory** that creates the state and have the component read it from props:

```tsx
import { defineStore, type SafeHtml } from "kerfjs";

export function createCounter(start = 0) {
  return defineStore({
    initial: () => ({ count: start }),
    // `actions` is a builder `(set, get) => ({...})` — not an object of reducers.
    actions: (set, get) => ({ inc: () => set({ count: get().count + 1 }) }),
  });
}

export function Counter({
  store,
}: {
  store: ReturnType<typeof createCounter>;
}): SafeHtml {
  // `state` is one ReadonlySignal<TState>, so read `state.value.count`.
  return <span data-action="counter:inc">{store.state.value.count}</span>;
}
```

```tsx
// Consumer — two independent counters.
const a = createCounter(0);
const b = createCounter(100);
mount(root, () => (
  <>
    <Counter store={a} />
    <Counter store={b} />
  </>
));
```

The rule of thumb: **a reusable component should never own per-instance mutable
module state.** Accept signals/stores via props, or hand the consumer a factory.

## 13.3 Events and cleanup

Components are pure string-builders, so they can't attach listeners or register an
`effect()` and clean it up themselves — there is no lifecycle hook to run teardown.
Two patterns cover the cases:

1. **Markup + delegation (preferred for most components).** The component emits
   stable hooks (`data-action`, a class, an `id`) and the _host_ wires events at the
   `mount()` root with [`delegate()`](5-event-delegation.md), which returns a
   disposer. This survives re-renders because the listener lives on the root, not on
   the (re-rendered) component nodes. Never use inline JSX event handlers
   (`onClick={...}`) — they don't survive the morph, and the
   `no-inline-jsx-event-handlers` lint rule flags them.

   If your component needs its own wiring, export a companion that the consumer
   calls once and disposes:

   ```ts
   import { delegate } from "kerfjs";
   /** Returns a disposer — call it on teardown. */
   export function wireButtons(
     root: HTMLElement,
     onAction: (a: string) => void,
   ) {
     return delegate(root, "click", "[data-action]", (e, el) =>
       onAction(el.getAttribute("data-action")!),
     );
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
   signal-reactive JSX placed _directly inside_ a `data-morph-skip` host stops
   updating, which is exactly why imperative widgets manage their own DOM.

## 13.4 Packaging

The single most important rule: **declare `kerfjs` (and any other shared runtime)
as a `peerDependency`, and never bundle it into your package.** A component returns
`SafeHtml` and reads signals; both rely on the consumer and your package agreeing on
_one_ `SafeHtml` class and _one_ signals instance. If your package bundled its own
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
  "peerDependencies": { "kerfjs": "^5.0.0" },
  "devDependencies": { "kerfjs": "^5.0.0", "tsup": "^8", "typescript": "^5" },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --external kerfjs",
  },
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

### Styles: each component owns its own

Components own their styles and are configured, never overridden — the rule
`@kerfjs/ui` follows internally, applied to your package:

- **A component's stylesheet styles only that component.** `counter.css`
  selects `.kerf-counter` and Counter's own internals, never another
  component's class, `[data-component]` root, `wa-*` element, or `::part()`.
- **Configuration, not overrides.** Consumers change a component's look
  through typed props (the scaffold's `size="compact"` becomes
  `data-size="compact"`) and documented public tokens (`--kerf-counter-gap`),
  never by selecting `.kerf-counter` from their own CSS. Private variables are
  named after their component (`--_kerf-counter-*`) and are nobody else's to
  write.
- **A child styles itself in a parent's context.** When a component must adapt
  inside another one — yours or a Kerf UI component — the child does it in its
  own stylesheet, with the parent only as an ancestor
  (`.kui-toolbar .kerf-counter { … }` lives in `counter.css`). A parent never
  styles a composed child, and never places a hook class on the child's root to
  restyle it.
- **Context is named after its provider.** A value a component hands its
  descendants is a custom property named after the component providing it
  (Counter gives its buttons `--_kerf-counter-control-size`).
- **A missing prop is a component gap.** When a consumer needs a variation no
  prop offers, add the prop (or ask the owning package to); do not document an
  override.

The scaffold's `npm run check:styles` runs `kerf-ui-analyze` over `src/`, and
`prepublishOnly` runs it before every publish. It reports a rule whose subject
is another package's component (`KUI-L019`), another component's private
`--_*` variable (`KUI-L020`), an override of a token a typed prop sets
(`KUI-L021`), and a hook class on a component's root (`KUI-L022`), while your
own component styled in a Kerf UI parent's context passes. Applications that
list your generated `component-composition.json` in their
`.kerf-ui-profile.json` get the same diagnostics for your components, pointing
at your props and at your package for a component-gap report.

### Never import `kerfjs/dev` from a package

kerf's development diagnostics are installed, not inferred: an app writes
`if (import.meta.env.DEV) await import('kerfjs/dev')` in its own entry, gated on
its own build's dev flag (see [Dev-mode warnings](11-dev-warnings.md)). Those
hooks are process-global — installing them changes `defineStore`'s `get()` to
return a read-only proxy and makes a screened URL throw rather than warn, for the
whole application.

That decision belongs to the app. A package that imports the dev entry forces the
diagnostics on every consumer, including in production, where it also drags
~4.7 KB min+gzip into a bundle the consumer thought was dev-free. Keep the import
out of `src/` entirely — put it in your own demo page or test harness, which is
where you want the diagnostics while developing the package anyway.

## 13.5 Publishing

The repo publishes `kerfjs`, `eslint-plugin-kerfjs`, `create-kerf-component`, and
the first-party `@kerfjs/ui` component library
from a single git tag in lockstep — not a workspace monorepo, just sibling
directories each with their own `package.json`, `package-lock.json`, and a
dedicated CI workflow (e.g. `.github/workflows/release-eslint-plugin.yml`,
`release-create-kerf-component.yml`, `release-ui.yml`) gated on an npm Trusted-Publisher
environment. A third-party component package follows the same shape: build with
`tsup`, emit ESM + `.d.ts`, publish with npm provenance. There is no npm org/scope
requirement — `@kerfjs/ui` is scoped; the other three publish unscoped. See
[`21-ui-package.md`](21-ui-package.md) for the first-party component contract.

The repository treats `ui/ai/component-composition.schema.json` as the canonical
composition contract and generates `create-kerf-component`'s bundled copy with
`npm run sync:scaffold-catalog-schema`. The root check and interactive release
flow run the matching check command, so schema drift fails before a release tag
is created.

## 13.6 Checklist

- [ ] Components are functions `(props) => SafeHtml`; no inline event handlers.
- [ ] No per-instance state in module scope — accept signals/stores via props, or export a factory.
- [ ] `kerfjs` is a `peerDependency` and is `external` in the build (never bundled).
- [ ] Events go through `delegate()` at the host root, or a companion `wire(root)` that returns a disposer.
- [ ] Library-owned subtrees use `data-morph-skip` plus a create/dispose pair.
- [ ] Build emits ESM + `.d.ts`; `tsconfig` sets `jsxImportSource: "kerfjs"`.
- [ ] Each stylesheet styles only its own component, consumers configure it through props and public tokens, and `npm run check:styles` (`kerf-ui-analyze`) passes.
- [ ] `src/` never imports `kerfjs/dev` — installing the diagnostics is the consuming app's call; keep it in your demo/test harness.

## 13.7 Generated AI component metadata

Reusable packages should ship a generated composition catalog beside their
code. `create-kerf-component` starts with an explicit `kerf.components.json`
source manifest and these scripts:

```json
{
  "scripts": {
    "catalog:generate": "node scripts/kerf-component-catalog.mjs --write",
    "catalog:check": "node scripts/kerf-component-catalog.mjs --check"
  },
  "kerfComponentCatalog": {
    "source": "./kerf.components.json",
    "output": "./component-composition.json"
  }
}
```

The source manifest requires the package author to decide purpose, named public
exports and subpaths, parent/child composition, zones, state and wiring owners,
responsive behavior, margin/border/padding ownership, public classes and
tokens, accessibility obligations, and source/provenance links. A component
whose wiring helper writes runtime `data-*` state may also declare it under the
optional `composition.wiring.stateAttributes` (`{ name, on, helper, meaning }`),
so tools can tell those wiring-owned attributes from app-authored ones. The
generator does not inspect screenshots or CSS to guess those decisions. Missing decisions,
missing source files, stale named exports, duplicate ids, and stale generated
output produce path-specific errors. Both author metadata and generated output
are validated against the shipped, `additionalProperties: false` schemas;
unknown fields and wrong types are rejected at their exact JSON path. Named
export discovery walks the TypeScript/TSX syntax tree, so JSX text, nested
scopes, comments, and string/template/regular-expression literals cannot
masquerade as a public API. The scaffold declares TypeScript as a development
dependency; install dependencies before running the copied local checker.
Commit both files and keep `catalog:check` in the publishing gate.

At a workspace root, `kerf-component-catalog --root .` follows npm `workspaces`
and processes every package with `kerfComponentCatalog` configuration. Output
is sorted by package path and component id, so identical inputs are byte-for-byte
deterministic.

AI tools merge catalogs as separate package-owned inputs: index entries by the
full `package:id` key, reject duplicate full keys, search the consuming package's
entries before the generic Kerf catalog, and preserve package identity on every
parent, child, and zone reference. Never merge by bare `id`. The generated
`purpose`, `publicExports`, and `sourceLinks` fields answer selection and source
questions; the composition fields answer whether and how two entries fit.

### Placeable classes: `boundaries.placeableClasses` / `rootElement`

Every class in `boundaries.publicClasses` is, by default, the component's
rendered anatomy: an application that writes `acme-meter` onto its own `<div>`
recreates `Meter` by class and inherits (and invites restyling of) its CSS.
Once an application's `.kerf-ui-profile.json` declares the package's catalog
under `catalogs`, `eslint-plugin-kerfjs`'s `ui-public-boundaries` reports that
as `KUI-L103` and names the export to render — the same diagnostic
`@kerfjs/ui`'s own `kui-*` classes get, and for any class name, not only a
`kui-` prefix. The package's own element (`<Meter className="acme-meter">`) is
never reported.

List the subset applications may legitimately write themselves (a layout
utility, item geometry a non-component carrier may take) under the optional
`boundaries.placeableClasses`; absent means none. When the component itself
renders those classes, add `boundaries.rootElement` with the tag it renders
them on, so a plain element of that tag carrying them is still reported as the
component recreated while another carrier keeps them:

```json
{
  "boundaries": {
    "rootClass": "acme-card",
    "publicClasses": ["acme-card", "acme-card--framed"],
    "placeableClasses": ["acme-card", "acme-card--framed"],
    "rootElement": "section",
    "publicTokens": []
  }
}
```

The generator rejects a placeable class that is not public and a `rootElement`
without placeable classes, and copies both fields into the generated
`component-composition.json` (`@kerfjs/ui`'s own catalog carries the same
fields; `content-item` is `rootElement: "div"`).

### Wrapper components: `rendersAs`

Applications often wrap a cataloged component in their own component so they
own its visibility and configuration. Declare the cataloged root the wrapper
renders under `composition.rendersAs`, so UI composition checks treat it as
that root instead of an unknown element:

```tsx
// src/demand-segments-control.tsx
export function DemandSegmentsControl({ visible }: { visible: boolean }) {
  if (!visible) return <></>;
  return (
    <ToolbarControlGroup label="Demand segments">
      <SegmentedControl /* … */ />
    </ToolbarControlGroup>
  );
}
```

```json
{
  "id": "demand-segments-control",
  "name": "DemandSegmentsControl",
  "source": "src/demand-segments-control.tsx",
  "composition": {
    "rendersAs": ["@kerfjs/ui:toolbar-control-group"]
  }
}
```

A wrapper's root element belongs to the catalog it renders, so it usually owns
no public root class: set `boundaries.rootClass` to `null`, which the generator
accepts as an explicit decision (only an absent `rootClass` is undecided).

`rendersAs` is a list because a wrapper may render one of several roots (a
view switcher that renders a `ToolbarControlGroup` or a `ToolbarText`), and an
empty render is always allowed. `kerf-component-catalog` copies it into the
generated entry and fails unless every key resolves: to an entry generated in
the same run, or to an installed package's shipped catalog (its
`package.json#kerfComponentCatalog.output`, or `@kerfjs/ui`'s
`ai/component-composition.json`).

`eslint-plugin-kerfjs`'s `ui-composition` rule, and so `kerf-ui-doctor`, reads
the catalogs your `.kerf-ui-profile.json` declares under `catalogs` and resolves
a wrapper by its package subpath (a bare import) or by its `source` file (an
app's relative import, directly or through relative re-exports such as a
`./components/index.js` barrel's `export { X } from` / `export * from`, chains
included). A private, bundled application
(`package.json#private: true`) declares its wrappers' `publicExports` by name
alone — no `subpath`, so no placeholder `exports` map pointing at `dist/` files
that its bundle never emits — and the generator verifies each name against the
component's `source` file instead. A publishable package still needs every
subpath in `exports`. `package.json#private: true` is the only opt-in
(decided in KF-KDFYME: a profile's `scope` and a separate manifest flag were
considered and rejected, since `private` already states that the package is
never imported by name): an application that is published, or whose manifest
omits `private`, declares real subpaths or sets `"private": true`. A zone accepts the wrapper only if it accepts **every**
declared root; each root's parent contract applies wherever the wrapper is
placed; and a wrapper used as a parent counts as its roots. A wrapper without
`rendersAs` keeps the unknown-element behavior (`KUI-L202`).
