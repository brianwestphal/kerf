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
```

Pass `.` to scaffold into the current directory. The target directory's basename
is used as the package name.

## What you get

A ready-to-publish component package that encodes the rules from the kerf docs
(*Building reusable component packages*):

- **`kerfjs` as a `peerDependency`, `external` in the tsup build** — never
  bundled, so `isSafeHtml` brand checks and signal identity stay intact across
  the package boundary.
- **ESM + `.d.ts` output** via `tsup`, with **subpath exports** (`.` and
  `./counter`).
- **`tsconfig` with `jsxImportSource: "kerfjs"`** so the author's `.tsx` compiles
  against kerf's JSX runtime; consumers need no extra setup.
- **An example `Counter` component** demonstrating the two patterns every kerf
  component needs:
  - **per-instance state via a factory + props** (`createCounter` → `<Counter store={…} />`), and
  - **a `wire(root)` delegation disposer** (`wireCounter`) instead of inline event handlers.

## Layout produced

```
my-widgets/
├── package.json        # peerDependencies.kerfjs, exports map, files: [dist]
├── tsconfig.json       # jsxImportSource: "kerfjs"
├── tsup.config.ts      # external: ['kerfjs'], format esm, dts
├── .gitignore
├── README.md
└── src/
    ├── index.ts        # public barrel
    └── counter.tsx     # factory + component + wire() disposer
```

This package is part of the kerf repository and releases in lockstep with
`kerfjs`.
