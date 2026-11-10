# Library disclosure performance (KF-1XBJDT)

The remaining 5,000-file disclosure delay came from native style/layout work associated with ListItem's adjacent-divider `:has()` selector. The keyed TreeList already changed only the 25 affected document rows. Removing only this rule in a disposable browser control reduced WebKit's visible-frame latency from 768–847 ms to 144–213 ms with identical rows, final SVG icons, scroll-divider observer, and forced layout read.

## Repair boundary

Internal ListTreeItem rows emit an owned `data-kui-tree-row` marker. Their divider is always `none`; TreeList exposes no divider option. The expensive adjacent-divider selector excludes these rows before evaluating `:has()`. No public prop or rendering policy changes. Caller root attributes cannot replace the marker or divider. Public ListItem/ListItemLink rows, including caller-authored tree roles, retain divider matching.

## Bounded controls

A disposable detached checkout at `ad7de1f994907ab54762d72905cc17d6b4b3203d` served the built editor with 200 folders × 25 documents. Four real clicks alternated collapse/expand. Instrumentation measured capture-click to zero-delay task and to a second animation frame (one intervening rendering opportunity). Local Node was 22.23.4; editor Playwright 1.64.1 used Chromium revision 1248 (156.0.8078.4), Firefox revision 1555, and WebKit revision 2370 (27.2). UI divider checks used its separate locked Playwright 1.63.0 set.

| WebKit control                      | Visible-frame range |
| ----------------------------------- | ------------------: |
| Original final-icon build           |          768–847 ms |
| Block rather than flex list         |          718–789 ms |
| Row content visibility              |          687–745 ms |
| Remove only adjacent divider rule   |          144–213 ms |
| Equivalent split divider selectors  |          641–710 ms |
| Equivalent parent-has-divider guard |          702–858 ms |
| Exclude internal tree rows          |          136–198 ms |

Caching the scrollTop read did not improve Chromium's visible frame: it merely moved layout work. Row layout containment also showed no useful gain. These approaches were rejected; the repair preserves layout, scroll-divider wiring, and all mounted rows. CPU profiling attributed time to the getter because it forced pending native style/layout work; changing that reader alone would conceal the cost.

## Regression evidence and limits

The scale test retains its 1,000 ms task budget and adds the same visible-frame budget. Before timing assertions it writes `KF-1XBJDT-disclosure-metrics.json` and attaches it to results. It also asserts exactly 25 row additions/removals and surviving unrelated-branch DOM identity. There are no retries or threshold increases. Initial repaired three-engine task times were Chromium 140–145 ms, Firefox 144–150 ms, and WebKit 114–179 ms, with canonical first-attempt tracing enabled.

Six real-browser ListItem tests across three engines passed. Actual computed-corner assertions cover custom tree roles, nested siblings, before/both versus after/none, and sibling removal. TreeList units check owned marker/divider behavior alongside existing keyboard, focus, and keyed-identity transitions. The full UI change gate passed, including unit coverage, contracts, generated projections, production demo, and bundle budget (+13 gzip bytes).

Inspected WebKit Library captures cover 1440, 867, 390, and 960 pixel viewports. The panel, final SVGs, labels, hierarchy, and scroll viewport remain aligned and readable. The partially visible final row communicates scroll continuation.

Local measurements do not replace Linux proof. The independent npm Firefox/WebKit single-worker, zero-retry probe and canonical CI remain integration gates. Previously failing Linux budgets are not considered resolved until covering exact-source runs pass.
