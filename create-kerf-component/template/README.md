# __PKG_NAME__

A reusable [kerf](https://github.com/brianwestphal/kerf) component package,
scaffolded with `create-kerf-component`.

## Develop

```bash
npm install
npm run build       # tsup → dist/ (ESM + .d.ts); kerfjs stays external
npm run typecheck
```

## Use it

A kerf app that already has `jsxImportSource: "kerfjs"` configured can import and
render the component like any local function — there's no extra toolchain:

```tsx
import { mount } from 'kerfjs';
import { Counter, createCounter, wireCounter } from '__PKG_NAME__';

const counter = createCounter(0);          // per-instance state (a factory)
const root = document.getElementById('app')!;

mount(root, () => <Counter store={counter} label="Clicks" />);

const dispose = wireCounter(root, counter); // delegation disposer (call on teardown)
```

## The rules this package follows

These are kerf's hard packaging rules (see the kerf docs,
*Building reusable component packages*). The scaffold encodes them so you don't
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

## Publish

```bash
npm publish --access public
```

`prepublishOnly` runs the build first; `files` ships only `dist/` + docs.
