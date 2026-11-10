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

Local measurements did not replace the required Linux proof. The following section records the subsequent independent npm Firefox/WebKit single-worker, zero-retry controls. Full canonical CI remains a separate integration gate.

## Exact-source Linux single-worker controls

Both controls used workflow SHA `d08decc8cfbf93a1ddbe1e3d8afb867fb38cf6a2`,
Node **22.23.4**, npm **10.9.9**, editor Playwright **1.64.1**, one engine per
job, **one worker and zero retries**. The real 5,000-file Library fixture and
unchanged **1,000 ms** budget ran through the standard editor hosts. Firefox
**157.0 / build1555** and WebKit **27.2 / build2370** were actually downloaded and
launched. Repository installation in these controls used canonical npm.

| Exact source / engine    | Four task samples (ms) | Maximum visible frame (ms) | Outcome          |
| ------------------------ | ---------------------- | -------------------------- | ---------------- |
| Baseline `56e` / Firefox | 458, 470, 435, 464     | Not measured               | Pass             |
| Baseline `56e` / WebKit  | 2039, 2047, 2049, 2040 | Not measured               | Fail at 1,000 ms |
| Repaired `2f` / Firefox  | 493, 465, 493, 463     | 611                        | Pass             |
| Repaired `2f` / WebKit   | 530, 549, 521, 547     | 647                        | Pass             |

[Baseline run 42783628150](https://github.com/brianwestphal/kerf/actions/runs/42783628150)
checked out `56e4394d992a1ab27d4cfde47676720a7ba3a352`.
[Repaired run 42783632258](https://github.com/brianwestphal/kerf/actions/runs/42783632258)
checked out `2f261cf5d48ced67664a91d673f374a604a09c73`, which includes the
non-null unrelated-branch precondition. Both source identities were validated
against actual checkout HEAD. All other qualification scopes were skipped.
The baseline WebKit failure persists even with one worker. The repaired
Firefox/WebKit samples all passed both timing budgets, changed exactly 25 rows
per click, and preserved the unrelated branch's DOM identity.

These are **whole-tree budget outcomes, not a causal cross-run speedup
estimate**. Intervening RQJ changes exist between source snapshots. The
baseline only logged zero-task samples; the repaired test added JSON,
double-rAF visible frames and mutation/identity instrumentation. No missing
baseline metric is inferred. Hosted CPUs also differed: baseline WebKit used
Intel Xeon 8370C, while repaired WebKit used AMD EPYC 9V74; Firefox used EPYC 9V45
versus EPYC 9V74. All runners reported four available CPUs, but a single worker
does not prove absence of host contention. Recorded load averages precede
installation rather than measuring disclosure-time CPU load. The same-machine
local remove-only CSS controls above provide the separate causal evidence.
No Firefox speedup or Linux speedup ratio is claimed.

The [portable Linux evidence](2026-11-10-library-disclosure-linux-results.json)
retains all four engine/job results, source and workflow SHAs, CPU/toolchain
snapshots, actual browser download revisions, dependency trees, samples,
artifact digests, and raw-file/log hashes. Repaired JSON was saved before timing
assertions. Linux after captures at 1440, 867, 390 and 960 pixels remain in the
artifacts; inspected WebKit 390 and Firefox 1440 captures retain readable,
aligned header, tabs/search, hierarchy and scroll continuation.

This supplies the requested Linux performance evidence without a threshold
increase, retries, arbitrary sleeps or a production installer change. Full
canonical CI remains independently tracked by the integrator. These npm
controls are not Bun installer or runtime qualification.

## Remaining native flow cost and second repair

Canonical run `42794785275` at `9a26630ed92b9c4057534de726c6f486625a20ce` failed Firefox's visible-frame budget with task samples 828/861/797/862 ms and visible-frame samples 832/862/800/1007 ms. All four retained the exact 25-row mutation and unrelated-branch identity contracts. The last sample added 145 ms after its task marker. This identifies the remaining symptom; it does not alone attribute contention or tracing.

New bounded current-product controls used the same macOS machine, exact editor browser versions, four real clicks and identical 5,000 final-icon rows. All table rows are native timing diagnostics, not measurements from the canonical Linux runner:

| Control                           | Firefox visible-frame samples | Firefox forced native layout |
| --------------------------------- | ----------------------------- | ---------------------------- |
| Guarded-divider flex baseline     | 144/147/147/149 ms            | 126–127 ms                   |
| Remove remaining divider selector | 146/148/146/147 ms            | 126–132 ms                   |
| Positive-class divider selector   | 145/148/148/147 ms            | 126–132 ms                   |
| Normal block flow                 | 93/96/80/98 ms                | 67–75 ms                     |
| Flex baseline with tracing        | 221/176/164/137 ms            | 126–130 ms                   |
| Block flow with tracing           | 135/85/105/71 ms              | 60–71 ms                     |

Removing the selector again or replacing its negative guard with a positive class did not improve the post-repair case, so there is no additional marker/API change. Each disclosure's whole-root thumbnail query measured below the Firefox clock's 1 ms resolution. The click phase made 42 attribute reads and 4–5 writes, rather than traversing 5,000 rows for roving focus. Those scans did not dominate these measured operations. Native layout forced by the scrollTop read remained dominant. Caching that read had already failed to improve actual rendering, so it remains unchanged.

Normal block flow also improved Chromium from 137–145 ms visible to 99–103 ms. WebKit's control changed from 130–215 ms to 129–195 ms, a smaller improvement. These are paired local controls, not cross-CPU Linux speedup claims. Tracing can add frame latency locally, but no evidence here attributes the canonical failure solely to tracing or another worker.

TreeList rows already use grid layout and own their widths, density minimums, indentation and natural heights. Removing the containing flex-column algorithm avoids its whole-list layout cost on a keyed branch change. The repair changes only TreeList's owned CSS flow; it introduces no API, fixed row-height assumption, virtualization, observer shortcut or benchmark scheduling change. Both 1,000 ms budgets, every engine, raw metrics, row mutations and identity assertions remain required.

Regression verification includes natural variable-height rows via public minimum-height tokens, both densities, scroll extent, focus-driven End/Home scrolling at wide/narrow widths, existing pointer/keyboard/drag behavior, and the unchanged 5,000-file test. The final exact-source canonical CI result remains the integration gate.

The repaired local build passes the unchanged scale test in all three engines with canonical tracing: maximum task/visible-frame timings are Chromium 107/107 ms, Firefox 80/138 ms, and WebKit 171/196 ms. Every operation retains the 25-row and unrelated-branch identity assertions. The three-engine TreeList browser suite passes 16 tests with eight unchanged Chromium-only capture skips in other engines; variable-height/density/scroll checks, keyboard navigation, and internal/external drag behavior all pass. The complete UI change gate, scoped lint and strict UI types pass; the demo is +4 gzip bytes versus the reviewed baseline without any budget update.

New Firefox Library captures at 1440/867/390/960 and a focused Chromium TreeList crop were inspected for hierarchy, natural spacing, final SVG alignment, readable labels, focus and clipping. They preserve the existing geometry and normal scroll continuation. Canonical CI on this additional product repair is still required before completion.
