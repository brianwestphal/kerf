# Pane and content layout

Import `Pane` from `@kerfjs/ui/pane`. Browser-aware bundlers receive its CSS
automatically; other consumers can import `@kerfjs/ui/pane.css`. Import
`@kerfjs/ui/layout.css` as well when using the `.kui-content` stack and control
layout classes; place `ContentItem` children from `@kerfjs/ui/content-item`. The vocabulary deliberately describes structure rather than
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

Tall fixed chrome can leave a short pane no room for its content (a small
window, or text at 200%). `chromePlacement="auto"` keeps the header and footer
pinned while the pane is at least 480px (30rem, so it scales with the text
size) tall, and below that lets the whole pane scroll as one column, header,
content, and footer together, so the content keeps its natural height. The
default `fixed` always pins them.

### Lowered work surfaces

Set `appearance="sunken"` when the work area itself should use the lowered
surface color, including blank space below short content and the scroll
viewport. The default appearance is unchanged. The fixed Pane paints its
content scroller; with `chromePlacement="auto"`, the Pane root paints the
surface because it becomes the scroller in a short viewport. Header and footer
chrome stay on the normal surface. No second scroll container or
`SunkenPanel` wrapper is needed.
Sunken panes draw their header/footer dividers by default, even when short
content does not scroll. Pass `chromeDividers="scroll"` to restore scroll-state
dividers or `"none"` to hide them.
For custom chrome colors in auto mode, set `--kui-pane-chrome-background`
on the Pane; it defaults to `--kui-color-surface`.

```tsx
<Pane appearance="sunken" footer={<Composer />}>
  <Conversation />
</Pane>
```

`PaneConfig.appearance` forwards through Workbench `mainPane`, panel `pane`,
and CollapsiblePanel `pane`. Workbench also applies that choice to its main or
panel region when it renders no Pane chrome. Set `appearance: "sunken"` on a
`NavStackView` or `TabScaffoldTab` when its view or scene owns scrolling.
For a `SplitView`, put a `Pane` in the list or detail region and set its
appearance; SplitView only arranges the regions and does not own their scroll.
Choose the innermost owner when composing layouts.

The color uses `--kui-sunken-panel-background`, falling back to
`--kui-color-surface-lowered`, just like `SunkenPanel`. Select one scroll owner
in a nested layout so a translucent override paints once. The public color
override may be set at a Pane or layout boundary.

Pass any combination of logical sides to `separators`: `block-start`,
`block-end`, `inline-start`, and `inline-end`. Every line is off by default and
each enabled side uses `--kui-pane-separator-width` (1px) and
`--kui-pane-separator-color` (`--kui-color-neutral-border-normal`). Logical sides keep pane
boundaries correct in both left-to-right and right-to-left layouts.

### Scroll dividers

Toolbars draw no divider by default. The line between pinned chrome and the
content that scrolls beside it is scroll state, not decoration: it shows only
while content is scrolled away from that edge, the way platform navigation bars
gain a hairline once content moves beneath them.

- A near edge (top, left) hides at the scroll start.
- A far edge (bottom, right) hides at the scroll end, and whenever the content
  fits and nothing scrolls.

Call `wireScrollDividers` from `@kerfjs/ui/wire-scroll-dividers` once at the
application root and keep its disposer:

```ts
import { wireScrollDividers } from "@kerfjs/ui/wire-scroll-dividers";

const stop = wireScrollDividers(appRoot);
```

It covers, by structure, every `Pane` below the root (the header's bottom line
and the footer's top line, whatever the chrome holds — a `Toolbar`, a
`mainHeader` list, a `TabBar`) and every `TabBar` strip (a line on each side
whose tabs are scrolled out of view). That includes the panes a `Workbench`,
`CollapsiblePanel`, or `Catalog` renders; `wireCatalog` installs it for its
own root. It also covers every `NavStack` (the top chrome's bottom line and the
bottom toolbar's top line, around the active view) and every `TabScaffold`
(the bar's top line, over the active scene). The layout keys on whichever
element actually scrolls there: the view or scene itself, or, through a sole
child with no chrome of its own on that edge, a `Pane`'s content or a nested
`NavStack`'s active view. A sole `Pane` fills its view or scene, so its content
scrolls under its pinned header; with a header it draws the line under that
header itself, so the stack's chrome never doubles it. It follows re-renders: panes that appear later are paired, and an
attribute a morph drops returns before paint.

The wiring only reports state; every component draws its own line. It writes
`data-scroll-overflow` (the edges with content hidden beyond them, in canonical
`t`/`r`/`b`/`l` order) on each scroller and `data-scroll-divider` (the sides to
draw) on each piece of chrome, and the Pane, NavStack, TabScaffold, TabBar,
Toolbar, and List stylesheets draw from those. The line is an inset shadow or a pseudo-element
inside the component, so no state ever moves the chrome, the content, or a tab.
Never write a border onto a component to show one.

Configure a pane with `chromeDividers`: `scroll` (the plain-pane default) follows
the scroll state and draws nothing until the wiring runs; `always` (the sunken
pane default) keeps both lines; `none` drops them. Explicit values override
either default. Layouts forward it through `PaneConfig`
(`mainPane.chromeDividers`, a panel's `pane.chromeDividers`). A `NavStack` and a
`TabScaffold` take the same `chromeDividers` for their own chrome (the stack's
top chrome and bottom toolbar, the scaffold's bar), and a `SplitView` forwards
it to its compact stack through `compactStack`.

For an app-owned arrangement outside a `Pane`, name the scroller and its chrome
by `id` in `targets`; a `Toolbar` or `List` named as chrome draws the divider
on its side facing the scroller:

```ts
wireScrollDividers(appRoot, {
  targets: [{ scroller: "results", top: "results-toolbar", bottom: "status" }],
});
```

A CSS-only version is not used: scroll-driven animations are not available in
Firefox, scroll-state container queries only in Chromium, and neither lets
the pinned chrome — a sibling of the scroller — read the scroller's state on
its own. One wiring keeps the behavior identical in every engine.

A pane is safe-area aware. Its background and separators paint through a
device's unsafe areas while its header, content, and footer pad for each side
the pane still reaches; the content's block insets are scroll padding, so its
first and last items can always be scrolled clear. Layouts clear the sides a
pane does not reach. In an app-owned arrangement, pass `safeAreaEdges` (the
same logical sides as `separators`; all four by default, `[]` to opt out). See
[Choosing an app layout › Safe areas](app-layouts.md#safe-areas).

`.kui-content` is a vertical stack with a 24px gap between major children.
Sections may contain adjacent `ListItem` rows without adding another major gap.
Ordinary surface-like children are `ContentItem`s and own their complete
geometry (see [Content items](#content-items)).

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

## Content items

Render an ordinary surface-like `.kui-content` child with `ContentItem` from
`@kerfjs/ui/content-item` (browser-aware bundlers receive its CSS automatically;
`@kerfjs/ui/layout.css` and `@kerfjs/ui/content-item.css` both deliver it). It
owns its complete geometry:

- 8px inline margin from the pane edge
- 1px border, transparent by default
- 8px internal padding
- `calc(1px + remify(11px))`, or 12px, rounded corners

```tsx
import { ContentItem } from "@kerfjs/ui/content-item";

<Pane label="Inspector">
  <ContentItem>{details}</ContentItem>
  <ContentItem frame="framed">{pendingChanges}</ContentItem>
  <ContentItem flush>{markdownPreview}</ContentItem>
  <ContentItem shape="pill">{summary}</ContentItem>
</Pane>;
```

`frame="framed"` paints the standard neutral border in the 1px the item always
reserves, so framed and unframed items share the same geometry. Frame an item
only when it marks a real distinction and must read as visibly bounded; do not
frame it to make it "look contained". `shape="pill"` selects the 22px pill
radius expressed as `calc(1px + remify(21px))`. There is deliberately no filled
variant: a lowered, filled surface is `SunkenPanel`, and bare text that only
needs to align with neighboring items is `ListInsetText`. Safe `data-*`
metadata goes in `rootAttributes`. Pass `ariaLabel` only for a distinct named
region (`role="region"`), and `focusTarget` to make the item a programmatic
focus target (`tabindex="-1"`), for example a NavStack view's `data-nav-focus`
target. `flush` removes block padding and both block borders while retaining
the inline margin, padding, and border. Use it for content such as a markdown
preview that must reach the item's top and bottom edges. `title` passes through
to the root element as a native tooltip.

For a selectable card, set `interactive`, a delegated `action`, and an optional
`itemId`. Wire `wireContentItems(root)` once on the containing app root; it
activates focused cards with Enter or Space and forwards the resulting click to
the app's ordinary `data-action` handler. `selectionMode="toggle"` maps
`selected` to a button's `aria-pressed`; `selectionMode="single"` maps it to an
option's `aria-selected` and belongs in an app-owned `role="listbox"` container.
An interactive card is a Tab stop, and `disabled` removes its action and Tab
stop while exposing `aria-disabled`. Hover uses the normal neutral fill so it
remains visible on a lowered surface; hover, pressed, focus, and selected paints
do not change geometry. A single-action card has no interactive descendants.
For a rich card with a primary and secondary action, render a static
`ContentItem` with sibling buttons inside it. Each button then has its own
focus stop and action without nesting controls inside an interactive card.
`ListActionRow` already packages this pattern for a simple two-action row.
`rootAttributes` still accepts safe app `data-*` metadata, while the card owns
its interaction data.

The rendered classes — `.kui-content-item`, `.kui-content-item--framed`,
`.kui-content-item--pill`, and `.kui-content-item--flush` — stay public for the
rare element that must carry the
geometry itself (for example a `<ul>` list or a `Text` paragraph in an
application-owned adapter). Prefer `ContentItem` everywhere else so the framing
choice is typed. A plain `<div class="kui-content-item">` is exactly what
`ContentItem` renders, so the catalog records that element
(`rootElement: "div"`): `eslint-plugin-kerfjs`'s `ui-public-boundaries` reports
it in application code as `KUI-L103` ("render `ContentItem`"), and
`npm run check:guidance` derives the same boundary from the catalog to reject it
in the package's examples, browser fixtures, and UX catalog.

These classes, the layout utilities (`.kui-content`, `.kui-scroll-owner`,
`.kui-control-cluster`, `.kui-inline-metadata`), and `.kui-app-root` are the
catalog's `boundaries.placeableClasses`: the only public classes an application
writes onto its own elements. Every other public class is a component's
rendered anatomy — render `Pane` rather than writing `.kui-pane` /
`.kui-pane__content` onto an `<aside>` — and `eslint-plugin-kerfjs`'s
`ui-public-boundaries` reports it on an application-owned element as
`KUI-L103`. Selecting those classes in CSS to place your own content in a
component's context stays allowed (see `KUI-L019`).

## Public roles and tokens

| Need                                     | Class                        | Token / default                                                    |
| ---------------------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| Unpadded header/content/footer structure | `Pane`, `.kui-pane`          | —                                                                  |
| Scrolling pane content                   | `.kui-pane__content`         | —                                                                  |
| Optional logical-edge separators         | `Pane.separators`            | `--kui-pane-separator-width: 1px`                                  |
| Safe-area sides a pane may pad           | `Pane.safeAreaEdges`         | `--kui-safe-area-*: env(safe-area-inset-*)`, routed by each layout |
| Major vertical rhythm                    | `.kui-content`               | `--kui-layout-content-gap: 24px`                                   |
| Self-contained child geometry            | `ContentItem`                | 8px margin + 1px border + 8px padding                              |
| Pill child                               | `ContentItem shape="pill"`   | `--kui-layout-pill-radius: 22px`                                   |
| Visibly framed child                     | `ContentItem frame="framed"` | neutral 1px border, same geometry                                  |
| Related controls                         | `.kui-control-cluster`       | `--kui-layout-control-gap: 8px`                                    |
| Inline metadata                          | `.kui-inline-metadata`       | `--kui-layout-metadata-gap: 4px`                                   |
| Explicit scroll owner outside a pane     | `.kui-scroll-owner`          | `overflow: auto`                                                   |

The component layer applies the same contract to `Toolbar`, `ListHeader`,
`ListItem`, `Toolbar`, `StateBanner`, `ValueTable`,
`ValueTableRow`, tabs, and form controls. A value-table row separator starts at
the row's 8px content inset, or at 40px when the row contains its 24px leading
icon and 8px gap, and always ends 8px from the right edge. Each value-table row
also keeps 8px of root-scaled block padding independently of its semantic inline
inset. Most interactive rows and toolbar groups are 44px tall.
Toolbar groups reserve a real 1px outer border around a 42px inner area, even
when their border and background are transparent.
A `Toolbar` lays its zones out against one 44px control band at its top: an
item no taller than the band is centered in it by its own size, and a taller
item (a wrapped title, a second trailing row) starts at the band's top and
grows down, so it never moves the other controls. A wrapped `ToolbarText`
centers its first line in the band.
Trailing icon actions share one axis: a toolbar control centers its glyph in
that 44px slot at the 8px inline margin, and a `ListHeader` action centers its
fitted 36px square in a slot of the same size (a transparent hit layer extends
its pointer target to fill that 44px slot), so a Pane header's trailing toolbar
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

`Text` is also the answer for a normal-color subsection title. `ToolbarText`
below `xlarge` (`large`, `default`, `small`) is deliberately quiet: it labels a
toolbar's identity — a pane name or a status — and must not compete with the
content and controls around it, so it has no tone option. A subsection title is
document content, not toolbar identity: use `Text` with the `h2`–`h6` variant
the outline calls for (inside a `List` with `controlInsets`, its text lines up
with content items). Use `ListHeader` when the section is a list or menu group
that needs a count, badge, action, or disclosure, and keep extra-large
`ToolbarText` for the panel, dialog, or page title. A narrow peripheral rail or
drawer is the exception that proves the rule: beside a work area that already
carries the extra-large title, its header names the pane with the default size,
because extra-large would truncate there ("Inspector" becomes "Ins…" in a 160px
rail) and pane identity should stay quiet.

Presentation is independent of the native element: use `tone="quiet"` for
supporting copy, `tone="danger"` for error or validation copy, `size="compact"`
for compact metadata, `size="large"` for prominent copy, `size="xlarge"` for
display copy, and `font="monospace"` for code or identifiers (the
`--kui-font-mono` stack, which Kerf owns even with Web Awesome loaded). These
finite props compose with each other and with every semantic `variant`; omit
them to inherit the surrounding color, size, and font.

Control long copy with `wrap`: `normal` (default) restores ordinary wrapping,
`anywhere` breaks long unbroken strings, `nowrap` holds one line, and
`truncate` holds one line with an ellipsis. `truncate` sets `min-width: 0`, so
Text can shrink beside a fixed-size sibling in a `Row`; the sibling keeps its
width. On `normal` or `anywhere`, set a positive integer `maxLines` to clamp
wrapped text with an ellipsis. Omit `maxLines` for unlimited lines. The cap is
incompatible with `nowrap` and `truncate`.

```tsx
import { Text } from "@kerfjs/ui/text";

<Text variant="h2" id="details-title">Details</Text>;
<Text variant="h3">Notifications</Text>; // normal-color subsection title
<Text aria-describedby="details-title">Supporting copy</Text>;
<Text tone="quiet" size="compact">Updated yesterday</Text>;
<Text size="large">A prominent summary</Text>;
<Text variant="h2" size="xlarge">A display-sized section title</Text>;
<strong>Inbox<Text variant="span" tone="quiet" size="compact"> · 3 msg</Text></strong>;
<Text tone="danger" font="monospace">ERR_INVALID_ID</Text>;
<Text wrap="anywhere">A-very-long-unbroken-identifier</Text>;
<Text wrap="truncate" variant="span">Long vendor name</Text>;
<Text wrap="normal" maxLines={2}>A long summary capped at two lines.</Text>;
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

Use `Grid` from `@kerfjs/ui/grid` when equal-width columns must share the
available width. Set a fixed positive `columns` count or a typed
`minColumnWidth` for automatic container-width collapse. Fixed tracks use
`minmax(0, 1fr)`; responsive tracks use `auto-fit` and cap their minimum at
100% so a narrow container keeps one column without overflow. Grid defaults
to the `xs` gap and accepts the same finite spacing names, complete typed
`CssLength` values, and typed flex-participation contract as Row.

```tsx
import { Grid } from "@kerfjs/ui/grid";
import { px } from "@kerfjs/ui/css-values";

<Grid columns={2} gap="m">
  <label>Quantity <input /></label>
  <label>Unit <input /></label>
</Grid>;

<Grid minColumnWidth={px(376)} gap="m">
  <label>Provider <input /></label>
  <label>Endpoint <input /></label>
</Grid>;

<Grid minColumnWidth={px(160)} autoFill gap="m">
  <DocumentTile />
</Grid>;
```

`columns` must be a positive safe integer; invalid counts throw instead of
silently producing invalid CSS. Import `px` from `@kerfjs/ui/css-values` for a
pixel minimum. `columns` and `minColumnWidth` are mutually exclusive. In the
responsive mode, the container width decides how many equal tracks fit; constrain
the Grid's outer width when the form should have a maximum count.
`autoFill` keeps the unoccupied responsive tracks so one or two tiles retain
their shared track width rather than expanding across an otherwise empty row.
It requires `minColumnWidth`; the default `auto-fit` keeps the existing form
behavior. When Grid is a direct child of a flex-owned `ListInsetControl`, pass
`flex` so the Grid takes the available row width instead of shrink-wrapping.
Grid is layout-only and adds no ARIA grid role. The application owns child
semantics.
Use application-owned CSS grid for intrinsic, asymmetric, spanning, or masonry
tracks, and use `ResizableRegion` when people must adjust a boundary.

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

### Filling a fixed-height parent

`flex` sizes a Row, List, or Grid inside a flex layout. When one of them is the
layout **root** of a parent with a definite height (an app mount container
with the `.kui-app-root` height chain, a dialog body, or a fixed-height catalog
frame), pass `fill` instead: the root takes the parent's full height
(`height: 100%`), so its `flex` children can grow into it. Use `fill` only on
that sole layout root; a sibling inside a flex layout keeps using `flex`.

Put route, test, or recipe metadata on the same root with `rootAttributes`,
which accepts safe `data-*` pairs and keeps each component's structural
attributes (`data-component`, `data-flex`, `data-fill`, alignment, inset, and
column markers) protected:

```tsx
<Row gap="none" fill rootAttributes={{ "data-recipe": "sidebar" }}>
  <CollapsiblePanel id="rail" side="left" collapsed={railCollapsed.value}>
    …
  </CollapsiblePanel>
  <List flex>…</List>
</Row>
```

Do not wrap a layout in a frame `Pane` just to get a definite height or a root
attribute: the pane's content slot becomes a scroll owner that never scrolls,
and its safe-area padding keeps an edge-docked rail or drawer from painting
through the unsafe area. A `Pane` is for a real column with a header, one
scrolling content region, or a footer.

Both components also accept `textInsets` and `controlInsets` using the shared
physical `Sides` union. Values follow canonical top/right/bottom/left order
(`t`, `rb`, `tbl`, `trbl`, and so on). A selected control side adds 8px of
padding. A selected text side adds the complete content-item alignment inset —
8px outer margin + 1px border + 8px inner padding, represented as 17px of
container padding. When both props select the same side, the text inset wins.
Each nested `Row` or `List` resolves its own four inset sides; unselected sides
reset to zero instead of inheriting a same-type parent's inset selection.
The same holds for `gap` and `flex` on a nested `List`, `Row`, or `Grid`: an
omitted prop falls back to that component's own default (no gap for `List`,
`xs` for `Row` and `Grid`; the CSS initial `flex`) rather than the enclosing
instance's value.

`ListInsetText` and `ListInsetControl` use the same `sides` vocabulary and
default to `trbl`. The text wrapper applies its complete 8/1/8 geometry only on
selected sides; the control wrapper applies its 8px outer margin only on
selected sides. Every direct child of `ListInsetControl` grows to fill the row
(a `Select`, a `wa-input`, or a `wa-button` spans the full inset width), and
several children share the row with an 8px gap; stack controls vertically with
a `List` using `controlInsets` instead. Pass `sides="rl"` for tight text that
keeps the horizontal inset without adding vertical box space.

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
