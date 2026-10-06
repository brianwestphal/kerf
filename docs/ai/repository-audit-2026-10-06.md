# Repository audit — 2026-10-06

This audit ran the requirements, code hygiene, and code quality workflows in that order. It covers the 25 numbered requirements documents, the public API and feature indexes, `src/`, and the root package gates. The checks were run against the working tree on `main`.

## Requirements against code

The numbered-doc inventory contains 25 files, all present in the `CLAUDE.md` reading order, `docs/ai/requirements-summary.md` dashboard and per-doc summaries, and `llms.txt` link list. The source-layout list in `CLAUDE.md` names every `src/*.ts` and `src/utils/*.ts` file. Its main-entry export block, test-script list, and coverage thresholds agree with `src/index.ts`, `package.json`, and `vitest.config.ts`.

The executable contract checks passed:

| Check                       | Result                                                     |
| --------------------------- | ---------------------------------------------------------- |
| `check:docs:test-inventory` | Pass                                                       |
| `check:docs:api-coverage`   | Pass; every public export appears in the API reference     |
| `check:docs:api-signatures` | Pass; 41 public function signatures agree                  |
| `check:features`            | Pass; 292 indexed behavior rows map to live guarding tests |

No numbered-doc requirement was found to contradict the implementation in this pass. The summary and discovery drift below was corrected in this change:

| Location                                 | Drift                                                                                                           | Resolution                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `docs/ai/code-summary.md` directory tree | Omitted `src/testing.ts`, seven unit tests, four integration tests, and the historical technical changelog page | Added the entries                   |
| `docs/ai/code-summary.md` build outputs  | Claimed every entry is a small shim, although `overlay.js` and `list.js` contain substantial entry-local code   | Described the actual split output   |
| `docs/orientation.md` conventions        | Omitted the sanctioned `bindings.ts:rowCounter` module state                                                    | Added it; page remains at 468 words |
| `llms.txt` scope list                    | Omitted the shipped `createScope()` export                                                                      | Added it                            |

`docs/ai/requirements-summary.md`, `docs/ai/usage-guide.md`, and `README.md` needed no changes. The public main-entry symbols are represented in both AI summaries; the requirements dashboard covers §1–§25. The render-pipeline diagram still reflects signal write, render, `SafeHtml`, morph/list reconciliation, and live DOM. No ambiguous behavior requiring a product decision was identified. This is an inventory and contract-oriented audit; passing guards does not prove every prose sentence or every behavior sequence.

## Code hygiene

The scan found no `any` annotations/casts, non-null assertions, unrecognized top-level `let`, or TODO/FIXME placeholders in `src/`. Relative source imports use `.js`; the design-rule-5 gate passed. The HTML and attribute escapers encode the required characters. Public-boundary checks include null-root validation in `mount`, selector validation in delegation, and parser/result validation in `toElement`. The inspected catch blocks either handle an expected platform failure, restore consistency, or document best-effort cleanup.

One medium-priority maintenance concern was filed as **KF-G60RKM**: `src/overlay-core.ts` is 942 lines and owns document arbitration, native hosting, `overlay()`, `wireDialog()`, `popover()`, and `tooltip()`. These lifecycles should be separated into focused internal modules while preserving the public subpath and shared arbitration. Other long files reviewed (`each.ts`, `morph.ts`, `mount.ts`, `bindings.ts`, and the data table in `jsx-types.ts`) each remain centered on one concern.

## Code quality

| Gate                     | Result                                          |
| ------------------------ | ----------------------------------------------- |
| `npm test`               | 169 files passed; 2,009 tests passed, 2 skipped |
| `npm run test:dist`      | 4 files and 17 tests passed                     |
| `npm run test:dist:full` | 86 files passed; 1,185 tests passed, 2 skipped  |
| `npm run lint`           | Pass; no ESLint or Prettier issues              |
| `npm run typecheck`      | Pass                                            |
| `npm run build`          | Pass                                            |
| `npm pack --dry-run`     | Pass; 87 published files                        |

The two skips are conditional downstream setup cases for package managers unavailable in this environment. Source coverage was **100% lines (3,051/3,051), 100% functions (524/524), 99.71% statements (3,466/3,476), and 98.87% branches (2,195/2,220)**. These exceed the configured 100% lines/functions, 99.5% statements, and 98.5% branches thresholds. Every instrumented source file had 100% line and function coverage. Files with less than 100% branch coverage are listed below; none pulls the total below the configured bar.

| File                           | Covered branches |
| ------------------------------ | ---------------: |
| `attach.ts`                    |            31/34 |
| `dev-rerender-warn.ts`         |            21/22 |
| `list-reconcile-fast-paths.ts` |          129/136 |
| `list-reconcile-granular.ts`   |            56/57 |
| `list-reconcile-snapshot.ts`   |            33/34 |
| `list-row-controller.ts`       |            46/48 |
| `list.ts`                      |            55/57 |
| `morph.ts`                     |          168/171 |
| `overlay-core.ts`              |          250/253 |
| `remount.ts`                   |            20/21 |
| `utils/url-screen.ts`          |            28/29 |

The build emitted all 15 configured ESM entries, corresponding declaration files and source maps, plus 12 shared JavaScript chunks. The pack dry-run included the expected `dist/` entries and AI bundle.

### Behavioral transition review

| Module / state                                                               | Transitions exercised by existing tests                                                                                                                  | Assessment                                                                                                     |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `each()` / `arraySignal`: unbound, empty, bound; snapshot and granular paths | Empty via remove → refill, append → select, update → select, move → select, select → update, clear → refill twice, render failure → count-drift recovery | Adversarial matrix present in `array-signal-transition-matrix.test.ts` and `render-transition-matrix.test.tsx` |
| `bindList`: empty, populated, granular, snapshot                             | Remove last → refill → update; granular → replace → granular; batched insert/move/update/remove                                                          | Adversarial matrix present in `list-transition-matrix.test.ts`                                                 |
| `resource()`: idle, running, completed, failed; keyed cache                  | Concurrent runs, late success/failure, reset in flight, cache eviction during flight, key A → B → A                                                      | Interleavings present in `async.test.ts`                                                                       |
| `scope`: active, disposed, refilled; observing removals                      | Dispose → register, dispose → fresh scope, remove → reinsert → remove, move within root                                                                  | Interleavings present in `scope.test.ts`                                                                       |
| `router`: matched, unmatched, disposed; history/hash                         | Match → unmatched → match, navigate → back, dispose → click, two routers sharing a document                                                              | Transitions present in `router.test.ts`                                                                        |
| Overlay stack: fallback/native, modal/nonmodal, nested surfaces              | Modal → tooltip/popover, out-of-order closes, stacked Escape/Tab, focus restoration                                                                      | Transitions present in `overlay-stacking.test.ts` and browser specs                                            |

No stateful module reviewed was limited to single-operation-from-clean-state tests. The most valuable next improvement is the `overlay-core.ts` split in KF-G60RKM; no failing behavior or missing public API was identified.
