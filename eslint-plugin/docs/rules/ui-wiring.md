# `ui-wiring`

Checks wiring obligations published by the versioned composition catalog. `KUI-L401` reports a used component whose required helper or side-effect registration import is absent. `KUI-L402` reports a helper call whose disposer is discarded.

Declare application entry modules in the application UI profile to check root wiring once per entry:

```json
{ "schemaVersion": 1, "scope": "workspace", "wiring": { "entries": ["src/main.tsx"] } }
```

Entry paths are relative to the workspace root. The rule follows relative imports, re-exports, and literal dynamic imports from each entry. An application-scoped obligation is checked at the entry if any reachable module renders its component; reachable leaf modules need no duplicate wiring. A module outside every declared entry keeps the per-file check. A composition entry can set `wiring.scope` to `"module"` for a helper that must be installed beside its rendering code; omitted scope means `"application"`. Computed import paths and unresolved modules stay outside the static graph, so put them in a declared entry or check them separately. `KUI-L402` still checks the helper's call site.

Assign, return, or otherwise retain a disposer when the binding has a shorter lifetime than the page. A `void` call is accepted as an explicit page-lifetime choice. The rule derives valid helper sources from each component-catalog entry's `publicExports` and `wiring[].import` facts, so aliases, root named imports, root namespaces, wiring-subpath named imports, and wiring-subpath namespaces resolve without a second hard-coded export table. It does not attempt flow-sensitive cleanup proof and offers no autofix.
