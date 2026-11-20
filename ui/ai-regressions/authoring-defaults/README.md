# Can an author predict and implement the defaults?

This pilot pairs independently authored code with a prediction made in the same submission. The four tasks combine a source-switching text/attribute binding, immutable editable row identity, keyboard selection and remount cleanup. All versions, prompts, emitted answers, prediction fields, failures and retries are available here. See [findings](./findings.md) for outcomes.

## Method

Eight fresh first-pass contexts of `gpt-6.2-sol` each received one public task packet, one framework card and a structured answer schema. Each context returned its predictions and a complete TSX module. Kerf received two current-catalog trials and two prototype doctor-card trials. Solid/Kobalte and React/React Aria each received two trials. The initial order was Kerf, Solid, React, React, Solid, Kerf, followed by the two Kerf candidate trials. Each answer covered the same four tasks in the same order. The CLI rejected tool use in generated evidence. No model accessed the grader, behavior key, prior trials, private participant data or repository. No participant text is stored in this directory.

The [task packet](./prompt.txt) and [guidance](./guidance/) pin the permitted package set. Kerf and Kerf UI are 5.0.0, Solid is 1.9.9, Kobalte is 0.13.11, React and React DOM are 19.2.0, and React Aria Components is 1.13.0. The production build uses the ordinary browser runtimes with React Compiler off. The candidate is a hand-frozen example of a mode-specific doctor reply. Both Kerf arms have the same base card and the same number of input bytes including inert padding. The current card summarizes the published [Kerf UI Combobox catalog](../../ai/components/combobox.md). Both cards identify the wiring helper. The candidate adds a suggestions-only mode, concrete commit dispatch and cleanup ownership. Cross-framework cards summarize public documentation within the same 1,210-byte guidance ceiling. The provider's system instructions, hidden reasoning and tokenization add overhead. Per-attempt metadata records the actual input, cached input, output and reasoning-token counts. The model identifier is a serving alias. No immutable backend revision or sampling seed was available.

The [V3 feedback conditions](../conditions-v3.json) supply a three-attempt ceiling. First attempts receive guidance alone. A failing program gets its previous source, bounded compile diagnostics and failed runtime check names in another fresh context. A strict compile and all four browser passes stop repairs. Every attempt has the same model setting, low reasoning effort, 240-second response deadline, one-file limit and 10,000-byte source cap. `run.json` reports provider elapsed time, one attempt number, input and response digests; file and tool counts refer to model actions. Repairs necessarily consume more input because they include the previous answer and its feedback. Each program experiences the same verification opportunities. The output schema asks for predictions first. One structured request cannot establish exactly when the model formed a prediction relative to writing its code.

## Behavior key

The author receives only the packet, assigned card and response schema. These checks live in the evaluator.

| Task           | Required browser behavior                                                                                                                                                                                                      | Additional observation                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Formatted leaf | Badge text and title begin at 4 crates, switch to 7 crates, ignore an incoming write, and follow an outgoing write to 9 crates. The surrounding note preserves draft, node identity, focus and caret.                          | Count mutation records on the badge during the inactive write.                                                                        |
| Editable rows  | Select ID 3, refetch four new objects with an edited label, then swap IDs 1 and 2. Match the whole order, all selection attributes and edited label. ID 2's original input retains its draft, focus and caret.                 | Count actual row-builder calls during selection with `mark("row")`. At least four initial marks verify that the instrumentation runs. |
| Picker         | Locate a combobox by accessible name Fruit, type Blu, wait for the Blueberry option, then press ArrowDown and Enter. Require exactly one Blueberry callback.                                                                   | Check source ownership separately from the visible keyboard result.                                                                   |
| Lifecycle      | Open and close twice. Each close removes the field and its popup. Dispatch Enter on each previously attached field. Reopen and confirm once. A further input/Enter on the old field after final disposal produces no callback. | Count commits after reopening. Existing independent listboxes are allowed.                                                            |

The native TypeScript compiler checks the submitted file and independently assigns the exported function to the required handle type. Bundling and browser replay still run when a declaration error allows JavaScript to emit. A missing export that prevents bundling leaves runtime and prediction fields unobserved. Each scenario starts with a fresh Chromium context with external network requests blocked; the controlled origin serves only the page, bundle and CSS. All updates settle for two rendering frames. Numeric counters measure row creation work only. They do not measure full reconciliation, scheduling or paint. Five prediction fields compare exact observed values. The keyboard-owner explanation needs source inspection and observed keyboard behavior.

## Replay

From a contributor checkout with the root and UI toolchains installed, build the packages and install the locked study dependencies.

```sh
npm run build
npm --prefix ui run build
npm ci --prefix bench/authoring-defaults
npm ci --prefix ui/ai-regressions/authoring-defaults
cd ui/ai-regressions/authoring-defaults
node score.mjs
node score.mjs --correct-list-import
node summarize.mjs
```

The replay reads recorded answers and writes outcome rows. It uses the root Playwright Chromium installation. To score one case, use `node score.mjs kerf-current-1`. To collect new trials, copy the checkout to a fresh location, move its `attempts/` directory aside, and run `node study.mjs` with an authenticated Codex CLI 0.170.0. It generates missing cells, replays outcomes and advances failed cells through the feedback ladder. Individual answers cannot be overwritten by the generator. Fully retired package/model versions or changes to the serving backend may prevent exact new generation. Existing answers replay locally without an account.

For the primary references behind the comparison cards, see [React state and keys](https://react.dev/learn/preserving-and-resetting-state), [React Aria ComboBox](https://react-spectrum.adobe.com/react-aria/ComboBox.html), [Solid For](https://docs.solidjs.com/reference/components/for) and [Kobalte Combobox](https://kobalte.dev/docs/core/components/combobox/). Runtime performance and bundle size were measured separately in the [production browser baseline](../../../bench/authoring-defaults/README.md).
