# Compile-time contracts

Kerf UI rejects invalid integrations at compile time only when TypeScript can
prove the relationship from one call. The versioned
[`compile-time-contracts-v1.json`](../ai/compile-time-contracts-v1.json)
artifact names those guarantees with stable `KUI-T###` ids. Its source fixture
is compiled twice: against `src/` and against declarations extracted from the
actual `npm pack` tarball. `npm run check:catalog` also verifies that every
contract still points to a real catalog entry/import and a symbol in the emitted
public-signature artifact.

## Strengthened contracts

| ID         | Compile-time guarantee                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KUI-T001` | `ListHeader` is a passive heading, a fully named/icon-bearing trailing action, or a controlled disclosure with `action` + `expanded`. Props ignored by the selected mode are rejected. |
| `KUI-T002` | `Select` has a visible `label` or an `ariaLabel`.                                                                                                                                      |
| `KUI-T003` | A literal `Select.value` belongs to its literal `choices`.                                                                                                                             |
| `KUI-T004` | A literal `SegmentedControl.value` belongs to its literal `choices`.                                                                                                                   |
| `KUI-T005` | `expanded`, `expandAction`, and `expandLabel` exist only on `TokenSearchField({ collapsible: true })`.                                                                                 |
| `KUI-T006` | `TokenSearchEditorAttributes` accepts application `data-*` metadata but rejects component-owned identity, morph, count, and placeholder attributes.                                    |
| `KUI-T007` | `PanelHeader.summaryId` cannot exist without rendered `summary` content.                                                                                                               |
| `KUI-T008` | `ToolbarText.maxLines` requires `wrap: true`; it is never silently ignored in typed code.                                                                                              |
| `KUI-T009` | A literal `TabScaffold.active` id belongs to its literal `tabs`.                                                                                                                       |
| `KUI-T010` | Adjacent-token keyboard removal requires `onRemoveToken`; disabling removal rejects the now-meaningless callback.                                                                      |
| `KUI-T011` | Finite public variants have named exported union types, including divider sides, tab activation, banner urgency, and all ToolbarControlGroup presentation axes.                        |

Literal identity inference is intentionally additive for dynamic applications.
When choices or ids arrive at runtime and the state signal is correctly typed as
`string`, widen the component explicitly:

```tsx
<Select<string> value={loadedValue.value} choices={loadedChoices.value} ... />
<SegmentedControl<string> value={mode.value} choices={loadedModes.value} ... />
<TabScaffold<string> active={active.value} tabs={loadedTabs.value} ... />
```

The widening is an honest statement that TypeScript cannot know the runtime
dataset. Do not cast a known literal typo merely to bypass the relationship.

## Complete public-surface audit

The following existing contracts were already exact and remain covered by the
ordinary source/type gates:

- required identity or accessible-name inputs on `AppTab`, `FloatingToolbar`,
  `NavStack`, `SplitView`, `Workbench`, `TabBar`, `ResizableRegion`,
  `SegmentedControl`, `TokenSearchField`, `PanelHeader`, and `ValueTable`;
- finite variants exported or represented as literal props on `DisclosureArrow`,
  `FloatingToolbar`, `Pane`, `ResizableRegion`, `SegmentedControl`, `StateBanner`,
  `SunkenPanel`, `ToolbarText`, `CollapsiblePanel`, `Catalog`, and the wire helpers;
- required controlled-state callbacks on `wireResizableRegions`, `wireTabBars`,
  and `wireTabScaffold`;
- mutually exclusive count/badge metadata on `ListHeader`; and
- protected application metadata boundaries on `AppTab`, `ListItem`,
  `ListActionRow`, `ListHeader`, `Pane`, `CatalogExample`, and
  `CatalogExampleStack`.

The remaining components (`LucideIcon`, `DisclosureArrow`, `Toolbar`,
`ToolbarControlGroup`, `ListInsetControl`, `ListInsetText`, `LoadingSpinner`,
`Skeleton`, `EmptyState`, `StateBanner`, `ValueTableRow`, and the
pure helpers) have independent props with no further conditional invalid state
that TypeScript can truthfully remove. Optional labels on decorative icons and
unnamed non-landmark surfaces are intentional variants, not missing contracts.

## Boundaries TypeScript cannot prove

Types do not claim to validate:

- the contents of `SafeHtml` slots (for example, “only AppTab children” or “no
  interactive descendants”);
- nonempty arrays, unique ids, numeric min/max ordering, or a controlled value
  loaded from dynamic data;
- equality between ids rendered in separate calls, elements discovered later in
  the DOM, or an ARIA relationship's live target;
- that a caller retained and invoked a wiring disposer; or
- CSS class/token use inside arbitrary strings.

Those remain catalog `KUI-C###` diagnostics, runtime filtering/guards, lint or
browser assertions. Encoding them as permissive-looking TypeScript brands would
move errors into casts without making the integration safer.

## Migration from the earlier declarations

- Add `actionLabel` and `actionIcon` to a non-toggle `ListHeader` action. For a
  disclosure, set literal `toggle: true`, provide `action` and controlled
  `expanded`, and remove trailing-action-only props.
- Give every `Select` either `label` or `ariaLabel`. Use an explicit `<string>`
  generic only for genuinely dynamic choice data.
- Put `expanded`/expand-action props behind `collapsible: true`.
- Replace `wireTokenSearchFields({ keyboard: true })` with either
  `{ keyboard: { onRemoveToken } }` or
  `{ keyboard: { removeAdjacentToken: false } }` when only caret navigation is
  wanted.
- Remove orphaned `summaryId`, or render the matching `summary`; add
  `wrap: true` anywhere `ToolbarText.maxLines` is used.
- Replace `Toolbar({ divider: false })` with `dividerSides: ''`; the default
  remains a bottom divider, while canonical combinations such as `tr` and
  `trbl` select more physical edges.

JavaScript runtime behavior remains defensive for previously emitted calls, but
new TypeScript builds report these invalid or ignored combinations.
