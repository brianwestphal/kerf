# `ui-wiring`

Checks wiring obligations published by the versioned composition catalog. `KUI-L401` reports a used component whose required helper or side-effect registration import is absent. `KUI-L402` reports a helper call whose disposer is discarded.

Declare application entry modules in the application UI profile to check root wiring once per entry:

```json
{ "schemaVersion": 1, "scope": "workspace", "wiring": { "entries": ["src/main.tsx"] } }
```

Entry paths are relative to the workspace root. The rule follows relative imports, re-exports, and literal dynamic imports from each entry. An application-scoped obligation is checked at the entry if any reachable module renders its component; a recognized helper call or required registration import in any reachable module satisfies it. Reachable leaf modules need no duplicate wiring. A module outside every declared entry keeps the per-file check. A composition entry can set `wiring.scope` to `"module"` for wiring that must be installed beside its rendering code; omitted scope means `"application"`. Computed import paths and unresolved modules stay outside the static graph, so put them in a declared entry or check them separately. `KUI-L402` still checks the helper's call site.

For a page-lifetime root helper, declare the actual app entry in the workspace `.kerf-ui-profile.json`. For example, if `src/client/app.tsx` imports `init.ts`, `init.ts` calls `wireShellSearch(root)`, and that imported helper calls `wireTokenSearchFields(root)`, use:

```json
{ "schemaVersion": 1, "scope": "workspace", "wiring": { "entries": ["src/client/app.tsx"] } }
```

The entry graph then covers a `TokenSearchField` in an imported view without duplicate wiring in that view. Include every independently mounted application entry. The path must resolve through relative imports from each entry to both the view and the helper; merely naming the helper in the profile does not count as invoking it.

Consumer composition catalogs can name an application helper's defining file in `wiring.sources`:

```json
"wiring": {
  "required": true,
  "helpers": ["wireTicketSearch"],
  "sources": [{ "export": "wireTicketSearch", "source": "src/interactions/ticket-search.ts" }]
}
```

The source path is relative to the catalog package root. The rule resolves relative imports, aliases, and re-export barrels to that file, so another function with the same name does not satisfy the obligation.

The selection catalog can declare a public wiring provider in `wiringProviders`, naming its export, import source, and the helpers it installs. A recognized `wireCatalog` call from `@kerfjs/ui/wire-catalog` provides `wireScrollDividers`, so the rule does not ask for a duplicate call on the same application entry. The provider's disposer still needs to be retained.

Assign, return, or otherwise retain a disposer when the binding has a shorter lifetime than the page. A `void` call is accepted as an explicit page-lifetime choice. The rule derives valid helper sources from each component-catalog entry's `publicExports` and `wiring[].import` facts, so aliases, root named imports, root namespaces, wiring-subpath named imports, and wiring-subpath namespaces resolve without a second hard-coded export table. It does not attempt flow-sensitive cleanup proof and offers no autofix.
