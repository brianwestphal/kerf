# Pane and content layout

Import `Pane` from `@kerfjs/ui/pane`. Browser-aware bundlers receive its CSS
automatically; other consumers can import `@kerfjs/ui/pane.css`. Import
`@kerfjs/ui/layout.css` as well when using the related content-item and control
layout classes. The vocabulary deliberately describes structure rather than
location: the same pane can be placed anywhere.

## Anatomy

```tsx
<Pane
  element="aside"
  label="Workspace"
  contentElement="nav"
  contentLabel="Workspace pages"
  separators={["inline-end"]}
  header={<Toolbar label="Workspace" ... />}
  footer={<Toolbar label="Actions" ... />}
>
    <section>...</section>
    <section>...</section>
</Pane>
```

`Pane` has no padding. It reserves rows for an optional vertical header, one
scrolling vertical content area, and an optional footer. A header may contain a
top toolbar followed by secondary toolbar or status rows. A main area or dialog
often omits the footer; a navigation pane commonly uses all three. Fixed chrome
stays outside `.kui-pane__content`, which is the pane's only scroll owner.

Pass any combination of logical sides to `separators`: `block-start`,
`block-end`, `inline-start`, and `inline-end`. Every line is off by default and
each enabled side uses `--kui-pane-separator-width` (1px) and
`--kui-pane-separator-color` (`--kui-color-border`). Logical sides keep pane
boundaries correct in both left-to-right and right-to-left layouts.

A pane is safe-area aware. Its background and separators paint through a
device's unsafe areas while its header, content, and footer pad for each side
the pane still reaches; the content's block insets are scroll padding, so its
first and last items can always be scrolled clear. Layouts clear the sides a
pane does not reach. In an app-owned arrangement, pass `safeAreaEdges` (the
same logical sides as `separators`; all four by default, `[]` to opt out). See
[Choosing an app layout › Safe areas](app-layouts.md#safe-areas).

`.kui-content` is a vertical stack with a 24px gap between major children.
Sections may contain adjacent `ListItem` rows without adding another major gap.
Ordinary surface-like children use `.kui-content-item` and own their complete
geometry:

- 8px inline margin from the pane edge
- 1px border, transparent by default
- 8px internal padding and 8px internal gap
- `calc(1px + remify(11px))`, or 12px, rounded corners

Use `.kui-content-item--pill` for the 22px pill radius expressed as
`calc(1px + remify(21px))`. Consumers can make a content item visible without
changing its geometry by setting `--kui-content-item-border` and
`--kui-content-item-background`.

Nested selection and hover highlights stay concentric and match their owning
control's shape. Their inner radius is the outer radius minus the full inset,
expressed by the shared `--kui-layout-highlight-inset` token (2px by default).
For example, `SegmentedControl` and `ToolbarControlGroup` place each highlight
behind a 1px control border and 1px control padding, so a rounded control's 12px
outer radius produces a 10px highlight radius; a 22px pill produces 20px.

A visible parent surface does not make every child another visible card. The
composer recipe keeps its form as the single surface, uses a heading `Toolbar` for
its task hierarchy, and places field and action control edges on the shared 8px
inline gutter instead of nesting them inside another padded content item. A
conditional `StateBanner` remains visibly distinct because it communicates
semantic status.

## Public roles and tokens

| Need                                     | Class                     | Token / default                                                             |
| ---------------------------------------- | ------------------------- | --------------------------------------------------------------------------- |
| Unpadded header/content/footer structure | `Pane`, `.kui-pane`       | —                                                                           |
| Scrolling pane content                   | `.kui-pane__content`      | —                                                                           |
| Optional logical-edge separators         | `Pane.separators`         | `--kui-pane-separator-width: 1px`                                           |
| Safe-area sides a pane may pad           | `Pane.safeAreaEdges`      | `--kui-safe-area-*: env(safe-area-inset-*)`, routed as `--kui-edge-inset-*` |
| Major vertical rhythm                    | `.kui-content`            | `--kui-layout-content-gap: 24px`                                            |
| Self-contained child geometry            | `.kui-content-item`       | 8px margin + 1px border + 8px padding                                       |
| Pill child                               | `.kui-content-item--pill` | `--kui-layout-pill-radius: 22px`                                            |
| Related controls                         | `.kui-control-cluster`    | `--kui-layout-control-gap: 8px`                                             |
| Inline metadata                          | `.kui-inline-metadata`    | `--kui-layout-metadata-gap: 4px`                                            |
| Explicit scroll owner outside a pane     | `.kui-scroll-owner`       | `overflow: auto`                                                            |

The component layer applies the same contract to `Toolbar`, `ListHeader`,
`ListItem`, `Toolbar`, `StateBanner`, `ValueTable`,
`ValueTableRow`, tabs, and form controls. A value-table row separator starts at
the row's 8px content inset, or at 40px when the row contains its 24px leading
icon and 8px gap, and always ends 8px from the right edge. Each value-table row
also keeps 8px of root-scaled block padding independently of its semantic inline
inset. Most interactive rows and toolbar groups are 44px tall.
Toolbar groups reserve a real 1px outer border around a 42px inner area, even
when their border and background are transparent.
Trailing icon actions share one axis: a toolbar control centers its glyph in
that 44px slot at the 8px inline margin, and a `ListHeader` action centers its
fitted square in a slot of the same size, so a Pane header's trailing toolbar
action and the `ListHeader` action beneath it line up (30px from the pane edge
at the default scale).
Panel, dialog, and page headings are plain `Toolbar` compositions. The leading
zone holds an optional icon `ToolbarControlGroup` and a direct extra-large
`ToolbarText`; actions belong in a trailing group. Omit empty groups. Supporting
copy is app-owned content below the toolbar and aligns with the intended content
edge.

## Spacing scale

Spacing is not a free choice. The official scale is five canonical steps, each
expressing exactly one relationship — pick the step by **how connected two
elements are**, not by eye. Every scalable value is `remify`-authored against the
fixed 16px baseline, so it delivers as `rem`.

| Value | Token              | Relationship — when to use                                                                                                               |
| ----- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0px   | `--kui-space-none` | No separation. The elements read as a single unit (a control and its own affordance, adjacent `ListItem` rows).                          |
| 4px   | `--kui-space-2xs`  | Very minor. Still one connected cluster, but readability or aesthetics demand a hair of air (inline metadata, an icon beside its label). |
| 8px   | `--kui-space-xs`   | Standard. Between elements **within a group** — the content-item padding/gutter, gaps between toolbar controls in a group.               |
| 16px  | `--kui-space-m`    | Minor. Between **homogeneous groups** — two lists, two sibling sections of the same kind.                                                |
| 24px  | `--kui-space-l`    | Major. Between **heterogeneous groups** — the `.kui-content` rhythm between major, differing regions.                                    |

The two relationships that get confused most are 8px vs 24px: 8px is _inside_ a
group, 24px is _between_ major, differing regions. 16px sits between them for
same-kind groups.

For `Row.gap`, `Grid.gap`, and `List.gap`, pass these token names directly (`gap="xs"`, `gap="m"`) or use
`space('xs')` from `@kerfjs/ui/css-values` when composing a value in JavaScript.
Use `rem`, `em`, `px`, `pct`, `lengthVar`, and `calc(plus(...))` only when a
named spacing relationship does not express the requirement; do not pass raw
CSS strings.

## Text

Use `Text` from `@kerfjs/ui/text` for ordinary semantic headings, paragraphs,
and inline secondary text. It renders a native `p` by default; set `variant` to
`h1`–`h6` when the document outline calls for a heading, or `span` for inline
copy inside a row, label, or table cell. Ordinary global, `data-*`, and `aria-*`
attributes pass through. Block variants reset their native margin, own a 1px
transparent border, and supply the standard 8px item padding. The `span`
variant owns no margin, border, or padding. Choose heading levels from the
document outline, not for visual size. Toolbar identity and page-heading
compositions continue to use `ToolbarText`.

Presentation is independent of the native element: use `tone="quiet"` for
supporting copy, `tone="danger"` for error or validation copy, `size="compact"`
for compact metadata, and `font="monospace"` for code or identifiers. These
finite props compose with each other and with every semantic `variant`; omit
them to inherit the surrounding color, size, and font.

```tsx
import { Text } from "@kerfjs/ui/text";

<Text variant="h2" id="details-title">Details</Text>;
<Text aria-describedby="details-title">Supporting copy</Text>;
<Text tone="quiet" size="compact">Updated yesterday</Text>;
<strong>Inbox<Text variant="span" tone="quiet" size="compact"> · 3 msg</Text></strong>;
<Text tone="danger" font="monospace">ERR_INVALID_ID</Text>;
```

## Spacer

Use `Spacer` from `@kerfjs/ui/spacer` for one intentional empty dimension that
is not the repeated relationship owned by a parent's `gap`. Its `width` and
`height` accept the same finite `UiSpaceName` vocabulary or a complete typed
`CssLength`. Fixed spacers use `flex: 0 0 auto`, so flex layouts do not compress
the requested dimension. Pass `flex` to use `1 1 auto` and consume the remaining
space along a `Row`, `List`, or other flex parent's main axis.

```tsx
import { Row } from "@kerfjs/ui/row";
import { Spacer } from "@kerfjs/ui/spacer";

<Row gap="none">
  <button>Back</button>
  <Spacer flex />
  <button>Save</button>
</Row>;
```

Spacer is always decorative (`aria-hidden="true"`), accepts no children, and
uses physical width and height. Prefer `Row.gap` or `List.gap` for uniform
sibling rhythm, and never use Spacer to cancel or duplicate component-owned
insets.

## Grid

Use `Grid` from `@kerfjs/ui/grid` when a fixed positive number of columns must
share the available width evenly. Every track is `minmax(0, 1fr)`, so a child
with wider intrinsic content cannot make its column wider than its peers. Grid
defaults to the `xs` gap and accepts the same finite spacing names, complete
typed `CssLength` values, and typed flex-participation contract as Row.

```tsx
import { Grid } from "@kerfjs/ui/grid";

<Grid columns={2} gap="m">
  <label>Quantity <input /></label>
  <label>Unit <input /></label>
</Grid>;
```

`columns` must be a positive safe integer; invalid counts throw instead of
silently producing invalid CSS. Grid is layout-only and adds no ARIA grid role.
The application owns child semantics and responsive count changes. Use
application-owned CSS grid for intrinsic, asymmetric, spanning, auto-fit, or
masonry tracks, and use `ResizableRegion` when people must adjust a boundary.

## Row and List alignment

Use `Row` for a horizontal flex layout and `List` for a vertical one. `Row`
defaults to `hAlign="left"`, `vAlign="full"`, `gap="xs"`, and no wrapping;
`List` retains its existing full-width, top-aligned defaults and zero gap.
Both components accept the same physical-axis vocabulary, with baseline
alignment additionally available on the horizontal `Row` cross axis:

| Axis       | Values and aliases                                                                                                                                  | Flex behavior                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Horizontal | `left` / `l` / `flex-start`; `center` / `c` / `space-around`; `right` / `r` / `flex-end`; `full` / `f` / `space-between`                            | Distributes a Row's children; aligns a List's children across its width.  |
| Vertical   | `top` / `t` / `flex-start`; `middle` / `m` / `c` / `space-around`; `bottom` / `b` / `flex-end`; `full` / `f` / `space-between`; Row-only `baseline` | Aligns a Row's children across its height; distributes a List's children. |

Cross-axis `space-around` and `space-between` are not valid `align-items`
values. Kerf therefore maps `middle` to centered items and `full` to stretched
items, while applying the requested distribution to `align-content` when a
Row wraps. Prefer the descriptive values in application code; the short and
CSS-shaped aliases are provided for compact or migrated call sites.
`baseline` is Row-only because CSS baseline alignment applies to a flex
container's cross axis; a vertical List's `vAlign` controls main-axis
distribution through `justify-content`, which has no baseline value.

`Row.flex` and `List.flex` share one typed participation contract. Omit the prop
for the CSS initial value, pass `true` for `1 1 auto`, select the finite
`"none"`, `"auto"`, or `"initial"` keyword, or use
`flex(grow, shrink, basis)` from `@kerfjs/ui/css-values` for a complete branded
shorthand. A `CssLength` is not a flex shorthand, and arbitrary strings are
rejected by the type contract.

Both components also accept `textInsets` and `controlInsets` using the shared
physical `Sides` union. Values follow canonical top/right/bottom/left order
(`t`, `rb`, `tbl`, `trbl`, and so on). A selected control side adds 8px of
padding. A selected text side adds the complete content-item alignment inset —
8px outer margin + 1px border + 8px inner padding, represented as 17px of
container padding. When both props select the same side, the text inset wins.
Each nested `Row` or `List` resolves its own four inset sides; unselected sides
reset to zero instead of inheriting a same-type parent's inset selection.

`ListInsetText` and `ListInsetControl` use the same `sides` vocabulary and
default to `trbl`. The text wrapper applies its complete 8/1/8 geometry only on
selected sides; the control wrapper applies its 8px outer margin only on
selected sides. `ListInsetText.horizontalOnly` remains a deprecated alias for
`sides="rl"`; an explicit `sides` value takes precedence.

`--kui-space-s` (12px) and `--kui-space-xl` (32px) exist but are **off the
canonical rhythm** — reach for them only as a deliberate exception, never as a
default step. Prefer the five canonical tokens so spacing stays legible and
consistent across every surface.

## Ownership rules

1. Do not pad a sidebar, main area, dialog, or `.kui-pane` shell. Children own
   their own margin, border, background, padding, and radius.
2. Use 24px gaps for major vertical separation and 8px gaps inside an item or
   between toolbar groups. Do not confuse the two relationships.
3. Wrap toolbar content in `ToolbarControlGroup`, including dormant text. A
   transparent group still reserves the same 44px geometry as a visible group.
4. Keep one scrolling content owner per pane. Toolbar and footer siblings stay
   fixed while the content scrolls.
5. A split item keeps dormant and interactive regions separate. For example,
   `ListHeader` renders its title/count-or-badge cluster separately from its optional
   logical-end 44px action. The header fills the available inline width and its
   action glyph defaults to 18px; disclosure mode makes the title cluster itself
   the button and supplies the production `DisclosureArrow` unless `actionIcon`
   replaces it.
   `ListActionRow` uses a noninteractive row root around sibling 44px primary
   and trailing buttons. `ListItem.trailing` remains dormant content.
   In multiline `ListItem` and `ListActionRow` rows, the leading icon stays
   centered on the label's first line rather than the full wrapped label.
6. Reading width, column placement, and responsive relocation remain application
   decisions. The shared classes define local geometry, not the whole shell.
7. A visible collapsible pane owns its collapse control in that pane's toolbar.
   When the pane is hidden, move the restore control into the adjacent main
   toolbar on the same logical edge: an inline-start pane restores from the
   main toolbar's leading group, and an inline-end pane restores from its
   trailing group. Do not leave an otherwise empty icon-only rail behind.

At narrow widths or 200% zoom, relocate or stack panes before shrinking targets.
The 8/1/8 item contract and 44px controls remain stable, so screenshots and
focus-order tests exercise the same model at every viewport.
