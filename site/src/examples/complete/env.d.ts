// Minimal stand-in for `vite/client`'s `ImportMetaEnv`.
//
// Every complete example gates kerf's dev diagnostics on `import.meta.env.DEV`,
// which Vite replaces with a literal at build time. The examples' tsconfig sets
// `"types": []` on purpose — the typecheck gate runs from the repo root, where
// `site/node_modules` may not be installed — so `vite/client` can't be pulled
// in for the one property we use. Declaring it here keeps the gate hermetic.
//
// A real app using Vite writes `/// <reference types="vite/client" />` instead
// and gets this (plus `MODE`, `PROD`, `BASE_URL`, and its own `VITE_*` vars).
interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
