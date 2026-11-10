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
