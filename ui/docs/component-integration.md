# Public component integration workflow

The canonical `ai/component-catalog.json` is also the integration manifest for
first-party public components. Every entry with `source: "kerf"` and
`kind: "component"` projects into the package, build, root API, catalog demo,
and AI authoring surfaces. This keeps a new List-like primitive from reaching a
late build or release gate before an omitted surface is discovered.

Author the implementation, CSS, catalog facts, demo, and behavior tests first.
Then run:

```bash
npm run component-integrations:dry-run
```

The dry run reports every mismatched projection together, using diff-like
`expected` and `actual` lines without changing files or failing the command.
Resolve the complete report, build the package, regenerate signatures with
`npm run ai:signatures:sync`, and refresh reviewed compatibility digests with
`npm run ai:compatibility:sync`. `npm run check:component-integrations` runs the
same validator in failing CI mode, and the package `check` gate includes it.

For each catalog component, the validator checks:

- the source module and stylesheet;
- the tsup entry and typed package subpath, including the browser-conditioned
  entry when the catalog declares `browserImport`;
- the CSS package export;
- root-barrel exposure for browser-conditioned components;
- the stable catalog route, demo module, and exhaustive demo registry; and
- inclusion of the public subpath in the generated AI signature reference.

The existing catalog sync and compatibility gates remain responsible for the
typed catalog projections, catalog count/order, and artifact digests. Public
API signatures derive component subpaths from the catalog, so a newly cataloged
component can no longer be silently omitted from that corpus.

Non-component helpers, wiring modules, compositions, recipes, and development
tools remain explicit package surfaces. They do not masquerade as visual
components merely to enter this workflow.
