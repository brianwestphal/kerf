# **PKG_NAME**

A reusable [kerf](https://github.com/brianwestphal/kerf) component package,
scaffolded with `create-kerf-component`.

## Develop

```bash
npm install
npm run build # tsup → dist/ (ESM + .d.ts); kerfjs stays external
npm run typecheck
npm run catalog:check # verify component-catalog-v2.json is current
```

## Use it

A kerf app that already has `jsxImportSource: "kerfjs"` configured can import and
render the component like any local function — there's no extra toolchain:

```tsx
import { mount } from "kerfjs";
import { Counter, createCounter, wireCounter } from "__PKG_NAME__";

const counter = createCounter(0); // per-instance state (a factory)
const root = document.getElementById("app")!;

mount(root, () => <Counter store={counter} label="Clicks" />);

const dispose = wireCounter(root, counter); // delegation disposer (call on teardown)
```

## The rules this package follows

These are kerf's hard packaging rules (see the kerf docs,
_Building reusable component packages_). The scaffold encodes them so you don't
have to:

- **`kerfjs` is a `peerDependency` and is `external` in the build — never
  bundled.** A bundled second copy of kerfjs would break `isSafeHtml` brand
  checks and signal identity across the package boundary.
- **No per-instance state in module scope.** A module-level `signal`/`store` is a
  singleton shared by every instance and every app. Hand the consumer a factory
  (`createCounter`) or accept a signal/store via props.
- **No inline JSX event handlers.** Components are pure `(props) => SafeHtml`
  string-builders; emit `data-action` hooks and let the host wire events with
  `delegate()` (see `wireCounter`), which returns a disposer.
- **Build emits ESM + `.d.ts`; `tsconfig` sets `jsxImportSource: "kerfjs"`.**
- **Never import `kerfjs/dev`.** kerf's dev diagnostics install global hooks, so
  installing them is the consuming _app's_ call, not a library's — the app
  writes `if (import.meta.env.DEV) await import('kerfjs/dev')` in its own entry.
  To get the diagnostics while developing this package, add that line to your own
  test harness or demo page instead (it belongs to the harness, not to `src/`).

## Publish

```bash
npm publish --access public
```

`prepublishOnly` checks the catalog and runs the build; `files` ships `dist/`,
the metadata/catalog pair, the README, and the license.

## AI component metadata

`kerf.components.json` is the author-owned source for the component's purpose,
public exports, composition rules, geometry ownership, tokens, accessibility,
and source links. `boundaries.rootClass` explicitly names the public class that
owns runtime geometry (or is `null` when none does); `publicClasses` order has no
semantic meaning. Keep decisions explicit: the generator deliberately does not
derive semantic or geometry ownership from rendered appearance. It validates
both this source and the generated catalog against the schema copies beside the
checker, including rejection of unknown fields. Named exports must exist in
the TypeScript/TSX syntax tree; JSX text, nested scopes, comments, and literals
are not exports. The checker uses this package's installed TypeScript compiler,
so run `npm install` before the first local catalog command.

```bash
npm run catalog:generate # write component-catalog-v2.json
npm run catalog:check    # no writes; fail when metadata, source, or output drift
```

The generated catalog ships with the package. AI tools join each entry to
Kerf's catalog by its `package:id` key, search this package first for
application-specific concepts, and retain both packages' identities when
following cross-catalog composition references.
