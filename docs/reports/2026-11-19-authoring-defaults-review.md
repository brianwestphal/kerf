# Kerf and Kerf UI authoring defaults

Kerf can update a leaf or move a row with very little work. Its main design challenge is making that behavior predictable from ordinary application code. Kerf UI gives authors a strong vocabulary for describing intent, but some interaction and lifetime obligations live outside the rendered component. This review considers architecture, default efficiency, readability and the evidence available to humans and coding agents. Project popularity and ecosystem size are outside its scope.

## Predicting updates

| System | What the author can infer locally | What needs attention |
| --- | --- | --- |
| Kerf | A signal passed to a native text or attribute hole binds to that leaf. JSX and tagged HTML share the runtime. Views can render to strings without a browser. | A signal read inside a repeating render subscribes that render. A row closure may reuse cached HTML. Selecting a cheap path requires recognizing which owner reads the signal. |
| Solid | Compiled JSX generally tracks a formatted getter where its result is consumed. A keyed control-flow primitive establishes ownership per item. | Reading props during setup can snapshot them. A per-row comparison can still reevaluate every row. |
| React | State, handler and the rendered result can sit in one component. Re-rendering recomputes ordinary expressions with current inputs. | State placement, effect dependencies and memoization influence how much work precedes the DOM commit. Compiler-assisted memoization changes some of those costs. |
| Vue | Template expressions identify dynamic regions and the compiler supplies patch hints. | A stateful list still needs a suitable identity, and an arbitrary render function offers less compile-time information than a template. |

Kerf's pure view functions, no-build path and delegated listeners make small, partially interactive pages practical. The runtime coordinates HTML parsing, keyed row caches, morph protection, binding markers and lifetimes. A tiny DOM mutation count therefore cannot establish a tiny render cost. At the original review revision, a conditional mounted hole could retain its previous signal after a byte-identical rerender. KF-ZMER8Y corrected that behavior. Evaluating the branch in source now predicts which signal owns subsequent writes.

References: [React rendering](https://react.dev/learn/render-and-commit), [React Compiler](https://react.dev/learn/react-compiler/introduction), [Solid reactive props](https://docs.solidjs.com/tutorial/props/), [Vue rendering mechanism](https://vuejs.org/guide/extras/rendering-mechanism.html).

## Where the measured tradeoff matters

For 1,000 editable rows, ordinary Kerf ran 1,000 row callbacks when selection changed. A keyed selector evaluated two classes. Median synchronous dispatch fell from 0.90 to 0.10 ms, while cold mount dispatch rose from 3.05 to 7.05 ms. Solid likewise went from 1,000 class evaluations to two when tuned. The median frame opportunities for the two Kerf variants were 9.55 and 9.40 ms. React defers work beyond synchronous dispatch, so its near-zero dispatch durations are a poor basis for comparison. These are eight timed Chromium pages per adapter on one host. All adapters had to preserve the editable draft and caret. The separate picker scenario exercised keyboard selection and exactly one commit after remount. See the [method, compiler conditions, raw samples and results](../../bench/authoring-defaults/README.md).

An explicit per-key content owner preserved drafts across refetches and could track positions only on demand. The existing public `each` with stable DOM keys and `selector` also preserved focus in this workload with considerably less live JS heap at 10,000 rows. Distinguish that from `bindList` content mode, which replaces the host for a new object with the same key. An additive row-owner option makes sense only for a consumer that benefits from its distinct lifetime. See the [keyed-row experiment](../../bench/keyed-content-rows/README.md).

For formatted text and attributes, one stable computed can feed two bindings. The [scalar experiment](2026-11-19-formatted-leaves.md) found equivalent steady-state throughput for a fixture-local inline factory, but another computed allocated per element per coarse render. Teach the shared computed first.

## Component choice and interaction ownership

A Kerf UI Combobox packages labeling, input and suggestions into one readable call. Its component card names alternatives, application-owned state and required wiring. A valid-looking field can still fail to open if the application never calls the helper on an enclosing root. Kobalte's explicit combobox parts take more markup but expose the relationship among input, listbox and selection owner. Radix Dialog likewise groups trigger and content under a behavior-owning root. A Kerf application with many dynamic controls benefits from delegated actions; one standalone action can be easier to trace with a local React handler. See [Kobalte Combobox](https://kobalte.dev/docs/core/components/combobox/), [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), and Kerf UI's [Combobox ownership characterization](../../ui/docs/investigations/combobox-seed-ownership.md).

## Priorities

1. Keep source retargeting correct and measure the stable fast path. Preserve static rows and the ability to render without a browser.
2. Lead selectable-list examples with one selector per owner. Choose a new row API only where its lifetime solves a demonstrated problem.
3. Keep a field's behavior, seed policy, and disposer close enough to inspect together. Preserve the low-level delegated implementation. Use typed command tables to check action names across native and UI controls.
4. Give authors focused, location-specific feedback on reactive holes and UI wiring. A tool should say when dynamic props or runtime scope prevent a definite answer. A short machine-readable contract helps an agent inspect code; its length alone says nothing about whether it improves generated solutions.
5. Measure first-pass behavior, repairs, and reading predictions on the same tasks before promoting a new default. The human and agent study belongs to KF-TDAZMB. KF-E5JEN9 owns the final decision across the prototypes.

The twelve linked follow-ups under KF-QDJM2T track implementation and verification. Experiments above establish costs and behavior for the tested examples. Comparative human or model authoring success requires separate participant evidence.
