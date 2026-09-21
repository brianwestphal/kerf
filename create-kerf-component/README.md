# create-kerf-component

Scaffold a publishable [kerf](https://github.com/brianwestphal/kerf) component
package that already follows kerf's hard packaging rules — so you don't have to
reverse-engineer them.

```bash
npm create kerf-component@latest my-widgets
# or: npm init kerf-component my-widgets
# or: npx create-kerf-component my-widgets
cd my-widgets
npm install
npm run build
npm run catalog:check
```

Run it with **no argument** (`npm create kerf-component`) and it prompts for the
directory. Pass `.` to scaffold into the current directory. The target
directory's basename is used as the package name.

## What you get

A ready-to-publish component package that encodes the rules from the kerf docs
(_Building reusable component packages_):

- **`kerfjs` as a `peerDependency`, `external` in the tsup build** — never
  bundled, so `isSafeHtml` brand checks and signal identity stay intact across
  the package boundary.
- **ESM + `.d.ts` output** via `tsup`, with **subpath exports** (`.` and
  `./counter`).
- **An MIT `LICENSE`** carrying the generated package's contributor notice and
  included in the package publish allowlist.
- **`tsconfig` with `jsxImportSource: "kerfjs"`** so the author's `.tsx` compiles
  against kerf's JSX runtime; consumers need no extra setup.
- **An example `Counter` component** demonstrating the two patterns every kerf
  component needs:
  - **per-instance state via a factory + props** (`createCounter` → `<Counter store={…} />`), and
  - **a `wire(root)` delegation disposer** (`wireCounter`) instead of inline event handlers.
- **Author-owned AI metadata** in `kerf.components.json`, with explicit purpose,
  exports, composition, geometry, public `rootClass`, tokens, accessibility,
  and source links. Run
  `npm run catalog:generate` to emit the package-qualified
  `component-catalog-v2.json`; `npm run catalog:check` fails on drift, deleted
  sources, renamed exports, duplicate ids, an omitted author decision, or any
  source/output field that violates the shipped schemas. Export verification
  uses the TypeScript/TSX syntax tree, so JSX text, nested scopes, comments, and
  string/template/regular-expression literals cannot masquerade as public
  exports. The scaffold already declares TypeScript; run `npm install` before
  invoking its copied local checker in a fresh offline directory.

## Layout produced

```
my-widgets/
├── package.json        # peerDependencies.kerfjs, exports map, publish files
├── tsconfig.json       # jsxImportSource: "kerfjs"
├── tsup.config.ts      # external: ['kerfjs'], format esm, dts
├── kerf.components.json # explicit source metadata (never inferred from pixels)
├── component-catalog-v2.json # deterministic generated AI catalog
├── scripts/
│   ├── kerf-component-catalog.mjs # local generator + check mode
│   ├── component-metadata.schema.json # author-source schema used by the checker
│   └── component-catalog-v2.schema.json # emitted-catalog schema used by the checker
├── LICENSE             # MIT license with the package contributor notice
├── .gitignore
├── README.md
└── src/
    ├── index.ts        # public barrel
    └── counter.tsx     # factory + component + wire() disposer
```

This package is part of the kerf repository and releases in lockstep with
`kerfjs`.

The package also exposes `kerf-component-catalog`. It accepts `--write` (the
default), `--check`, and `--root <path>`. A root package with npm `workspaces`
generates every child package that declares `package.json#kerfComponentCatalog`,
in deterministic package and component order.
