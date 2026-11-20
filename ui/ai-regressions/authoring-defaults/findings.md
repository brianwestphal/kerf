# Findings from eight first-pass programs

**The clearest failure was finding the right import.** All four Kerf answers independently put `each` under `kerfjs/list`. The published entry point is `kerfjs`; `kerfjs/list` supplies `bindList`. The supplied Kerf card named both module specifiers without mapping their exports. That ambiguity blocked the whole program, including its otherwise independent picker. These trials directly justify changing the card. They provide limited evidence about what an author using the full package documentation would infer.

## First attempts

Each row represents two independent sessions of the same model. A complete pass requires strict TypeScript and all four browser tasks. A dash means the program never reached the browser. Five prediction fields per executable answer were scored separately. Leaf text and title are closely related observations.

| Condition             | Strict compile | Bundle | Leaf | Rows | Picker | Remount | Complete | Predictions matched / observed |
| --------------------- | -------------: | -----: | ---: | ---: | -----: | ------: | -------: | -----------------------------: |
| Kerf, current card    |            0/2 |    0/2 |    — |    — |      — |       — |      0/2 |                            0/0 |
| Kerf, mode-aware card |            0/2 |    0/2 |    — |    — |      — |       — |      0/2 |                            0/0 |
| Solid + Kobalte       |            2/2 |    2/2 |  2/2 |  2/2 |    2/2 |     2/2 |      2/2 |                          10/10 |
| React + React Aria    |            1/2 |    2/2 |  2/2 |  2/2 |    2/2 |     2/2 |      1/2 |                          10/10 |

One React author correctly predicted two memoized row evaluations on selection, preserved the draft and committed exactly once, yet used a list-item callback whose inferred `object` type had neither `id` nor `name`. Browser behavior alone would have overlooked the type failure. Both React authors explicitly memoized rows. Both Solid authors rendered stable primitive IDs, used a per-key selector, and manually preserved the editor's focus and selection. Selection caused zero Solid row-builder calls and two React row-builder calls. The counter excludes a parent's mapping, reactive computations and DOM operations. These were authored optimizations, with guidance about keys and selectors supplied in the packet.

Across the four executable first-pass programs, a write to the inactive count caused zero badge mutations. All four accurately named the keyboard owner in their prediction. A source review confirmed that the selected library received the commit callback and that the submission supplied no keyboard listener of its own. The remount checks established exactly one commit and no callback from detached fields in these scenarios. The four blocked Kerf programs also named a wiring owner; their behavior was unobservable on first pass.

| First-pass author effort | Provider input tokens | Output tokens | Elapsed seconds |
| ------------------------ | --------------------: | ------------: | --------------: |
| Kerf, current card       |         17,327–17,329 |   2,443–2,564 |       51.9–54.2 |
| Kerf, mode-aware card    |                17,322 |   1,654–1,854 |       35.9–40.6 |
| Solid + Kobalte          |         17,201–17,203 |   1,777–1,871 |       38.2–40.3 |
| React + React Aria       |         17,195–17,197 |   1,452–1,656 |       31.9–35.7 |

All first attempts used the same 10,000-byte source limit and 240-second wall limit, consulted zero files and invoked zero tools. Provider turnaround includes service time. Token and timing ranges have two observations each. They measure work in this particular authoring exercise. For application update and mount costs, use the separate [browser benchmark](../../../bench/authoring-defaults/README.md).

## Feedback-assisted results

All eight cells eventually produced a strictly typed program that passed all four browser tasks. This took fourteen independently generated answers in total, including six repairs. Each repair received only the prior source, diagnostic messages and failed check names.

| Condition             | Passing attempt for replicate 1 | Passing attempt for replicate 2 | Additional answers |
| --------------------- | ------------------------------: | ------------------------------: | -----------------: |
| Kerf, current card    |                               2 |                               3 |                  3 |
| Kerf, mode-aware card |                               2 |                               2 |                  2 |
| Solid + Kobalte       |                               1 |                               1 |                  0 |
| React + React Aria    |                               2 |                               1 |                  1 |

The current-card Kerf replicate that reached attempt three passed TypeScript on its second submission. Only runtime feedback exposed the nested mount. Both candidate-card Kerf submissions passed after a single feedback round. All final programs predicted the five machine-graded observations accurately (40/40); all eight predicted the library or root wiring that their source used to handle the successful keyboard interaction. The model was allowed to revise its predictions during repair, so final calibration and first-pass calibration answer different questions.

## What the single-import control isolates

A diagnostic replay changed exactly `import { each } from 'kerfjs/list'` to `import { each } from 'kerfjs'` in memory. It retained the rest of each original answer byte-for-byte. No model saw this intervention. Run `node score.mjs --correct-list-import` to regenerate the four `evaluator-import-control.json` files. The original results and author repair counts remain separate.

| Condition after evaluator import correction | Strict compile | Programs passing all four browser tasks | Complete | Runtime predictions matched / observed |
| ------------------------------------------- | -------------: | --------------------------------------: | -------: | -------------------------------------: |
| Kerf, current card                          |            1/2 |                                     1/2 |      0/2 |                                    5/5 |
| Kerf, mode-aware card                       |            2/2 |                                     2/2 |      2/2 |                                  10/10 |

Both current-card authors cast picker props or wiring through `unknown`, guessed alternative commit signatures, and supplied a component-level callback as well as a wiring callback. The first current program behaved correctly at runtime after the import correction but retained errors in nullable editor handling. The second compiled after that single correction and immediately hit Kerf's nested-mount guard. It mounted a list inside an already-mounted tree. The program failed before it could show a picker. Neither failure proves the current picker itself is broken.

Both candidate-card authors passed `createLabel={false}`, routed `({ value })` through the documented root wiring, and invoked the returned disposer without casting either public contract. After the one-line import correction, all three runnable Kerf programs preserved the draft, selected row and caret, performed zero selection-time row-builder calls, and committed once after remount. This makes the candidate's specific ownership guidance worth isolating in a picker-only experiment. The comparison cannot establish that the card caused the improved scores. Two samples and a whole-program guard confound that inference.

## Decision

1. **Make import-qualified examples the first improvement.** Show a copied, typechecked line for `each` and another for `bindList`, generated from the public exports. Update the short card and preserve the original packet for historical replay. KF-CV0XV1 already provides a runnable selection example. KF-V2NCC6 covers the import mapping and a retest with smaller task modules.
2. **Expose each picker mode's exact wiring and cleanup contract.** The candidate produced two correctly typed root-scoped solutions. The current card produced two casts around public contracts. Test actual doctor output with an isolated picker fixture, retaining a current-doc arm of equal budget and a remount/stale-input negative case.
3. **Keep compilation, working interaction, and prediction calibration distinct.** A declaration failure, correct keyboard outcome and accurate work prediction can occur in one answer. A shared broken import can hide working behavior in three other tasks. Preserve per-task compilation in the follow-up before ranking framework defaults.

One changed outcome moves a two-trial condition by 50 percentage points. The curated packets, identical model family, non-interactive first attempts, single Chromium version, fixed within-packet task order and care taken by these authors to manage focus limit generalization. No screen-reader, pointer or cross-browser result is implied by this keyboard test. The human arm is formative; aggregate exposure and responses live on KF-TDAZMB. It provides no executable or counterbalanced cross-framework estimate.

The recorded source is commit `04128bda2439910a221fc359911a8c283d778da5`. Runtime checks used Node 26.13.0, TypeScript 7.0.2, esbuild 0.25.12, Playwright 1.63.0 and Chromium 153.0.8010.12. See the [protocol and reproduction commands](./README.md) and [raw attempts](./attempts/).
