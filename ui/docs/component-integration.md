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

## Change-local verification and bundle review

Run `npm run check:change` after changing a public component. It synchronizes
both catalog projections, declarations, AI signatures, and compatibility
digests; names every checked-in projection changed by that synchronization;
runs the catalog/component contracts, unit coverage, consumer bundle tests,
source and packed type contracts; rebuilds the package and production catalog
through the same `demo:bundle` script `npm run demo:build` uses; and reports
the exact gzip byte delta from the last reviewed baseline. Every step runs on
the Node that invoked it, so `check:change` and `demo:build` measure the same
bytes. The broader `npm run check` remains the release gate.

Intentional bundle changes use the same workflow with an explicit review
reason:

```bash
npm run check:change -- --update-bundle-budget \
  --reason "Added the reviewed List detail states and keyboard behavior"
```

That mode writes `demo-bundle-budget.json`, records the previous and new exact
measurements and budgets with the reason and timestamp, and rounds the total
budget to the next 100 bytes. Gzip output depends on the zlib bundled with
Node, so reviewed baselines are recorded on the repository's pinned Node major
(`.nvmrc`, also CI's version): an update on another major is refused, and a
plain check on one prints a warning. Do not edit the budget or add a history comment
by hand.
