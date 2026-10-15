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

### Deep content inset

Set `deepInset` on a `Pane` to add 8px of padding on every side of its scrolling
content. A `ContentItem` or `ListItem` that normally sits 8px from the pane's
inline edge then sits 16px from it. The default is `false`. This extra padding
adds to any device safe-area inset; a header or footer still owns the safe-area
padding at its edge while the content keeps its extra 8px. The pane's header,
footer, background, and separators still reach their usual edges.
For opaque edge-to-edge content, set `--kui-pane-scrollbar-gutter: stable` on the
Pane or an ancestor. This reserves a vertical scrollbar gutter so a child that
bleeds through the inline padding stops before the scroll indicator. The default
is `auto`; the optional gutter is outside the published content inset values.

```tsx
<Pane deepInset>
  <ContentItem>Project Atlas</ContentItem>
</Pane>
```

The pane leaves `--kui-layout-inline-margin` at its normal 8px value. Nested
`Row`, `List`, and `Grid` therefore keep their usual item spacing; they do
not inherit a doubled margin. `PaneConfig.deepInset` forwards through
Workbench `mainPane`, panel `pane`, CollapsiblePanel `pane`, and a
`NavStackView.pane`.

### Focusable pane

Set `tabIndex={0}` to put the whole Pane in the Tab order, or `tabIndex={-1}`
when application code should focus it without adding a Tab stop. Keyboard focus
draws the standard focus ring. Set `outlined` to keep that ring visible as an
application-controlled state, such as a drop target, whether or not the Pane is
focused. `PaneConfig` forwards both options through layouts that render a Pane.
Give a focusable Pane a useful `label` when it represents a distinct region.
The ring paints above edge-to-edge child surfaces without intercepting their
buttons, selects, or nested scrolling.

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
`NavStackView` or `TabNavigatorTab` when its view or scene owns scrolling.
For a `SplitView`, put a `Pane` in the list or detail region and set its
appearance; SplitView only arranges the regions and does not own their scroll.
Choose the innermost owner when composing layouts.

The color uses `--kui-sunken-panel-background`, falling back to
`--kui-color-surface-lowered`, just like `SunkenPanel`. Select one scroll owner
in a nested layout so a translucent override paints once. The public color
override may be set at a Pane or layout boundary.

### Background colors

Set `background` when a pane needs a surface color of its own, such as a
media detail page painted in its artwork's color. It takes a typed color from
`@kerfjs/ui/css-values`: `uiColor('surface-raised')` for a theme token,
`fillColor('#1f2a44')` for an app-chosen literal, or `colorVar('--app-hue')`
for an app-owned custom property. The color paints the whole pane, header and
footer included, and replaces the appearance's fill: a sunken pane with a
background drops its lowered color and grain. Omitted, the pane keeps its
default.

```tsx
import { fillColor } from "@kerfjs/ui/css-values";

<Pane background={fillColor("#1f2a44")} header={<AlbumToolbar />}>
  <AlbumTracks />
</Pane>;
```

`PaneConfig.background` forwards like `appearance`, so a Workbench `mainPane`
or panel `pane`, a CollapsiblePanel `pane`, or a `NavStackView` `pane` takes
it. `NavStack` and `TabNavigator` take their own `background` for the stack
or navigator surface and their docked bars, and a `TabNavigatorTab` takes one
for its scene. Overlay chrome keeps the translucent chrome material over any
of them.

The app owns contrast: keep text at AA over the color you choose. A dark
color needs dark-tone controls or a scoped tint for its content. In forced
colors every background paints `Canvas`.

### Tinted surfaces

Set `tint` when a whole region should take on a color, the way a media detail
page takes on its artwork's color: `tint={{ color, scheme }}`. `color` is a
`@kerfjs/ui/css-values` color, usually one the app already knows about its
artwork, and `scheme` says whether that color reads as a `'light'` or a
`'dark'` surface. Kerf does no color detection; the app declares the scheme.

```tsx
import { fillColor } from "@kerfjs/ui/css-values";

<Pane tint={{ color: fillColor(album.bottomColor), scheme: "dark" }} header={<AlbumToolbar />}>
  <AlbumTracks />
</Pane>;
```

The pane paints its tinted surface, and everything inside it re-derives from
the color: the surface and raised surface, normal and quiet text, link and
brand text, and everything built on them (quiet fills, the lowered surface,
the chrome material behind overlay headers, popup rows). Each token's
lightness is clamped into a band that keeps text at WCAG AA over any color: a
light tint's surface stays at or above 90% OKLCH lightness under dark text,
and a dark tint's surface at or below 30% under light text. Chroma is capped,
so text stays near-neutral and the surface reads as a tint of the color. A
seed sweep across hue and lightness holds every text token at 4.5:1 or better
over the surface, raised surface, and quiet fills, with and without the Web
Awesome theme (`tests/browser/tone-contrast.spec.ts`).

The scope also takes the declared `color-scheme` and the Web Awesome
`wa-light` / `wa-dark` class, so Web Awesome components inside it re-derive
their own fills. Without relative color syntax, and under
`prefers-contrast: more`, the scope keeps the plain palette in its declared
scheme. `tint` and `background` combine: `background` paints the pane, and
`tint` still re-derives the tokens for its content.

Add `accent` (usually the artwork's most vivid color) to re-derive the brand
ramp too: `tint={{ color, scheme, accent }}`. Loud fills (primary buttons, the
current popup row, checked controls) and their text, brand text and links,
text on brand fills, and the focus ring all take the accent's hue. Lightness
is clamped so each pair keeps AA for any accent: in a light scope the fill
stays at or below 50% OKLCH lightness under white text and brand text at most
45%; in a dark scope the fill stays between 72% and 85% under near-black text
and brand text at least 80%.

`PaneConfig.tint` forwards like `background`. `NavStack`, `TabNavigator`, and
each `TabNavigatorTab` take `tint` for the stack, the navigator, or one scene.

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
bottom toolbar's top line, around the active view) and every `TabNavigator`
(the bar's top line, over the active scene). The layout keys on whichever
element actually scrolls there: the view or scene itself, or, through a sole
child with no chrome of its own on that edge, a `Pane`'s content or a nested
`NavStack`'s active view. A sole `Pane` fills its view or scene, so its content
scrolls under its pinned header; with a header it draws the line under that
header itself, so the stack's chrome never doubles it. It follows re-renders: panes that appear later are paired, and an
attribute a morph drops returns before paint.

Multiple calls in one document share one attribute writer, including calls on
overlapping roots. Each call contributes its own root and optional named
targets; its disposer removes only that registration. When the last disposer
runs, the writer removes the attributes it owns. An app that calls `wireCatalog`
for a root already has scroll dividers there and does not need another call.

The wiring only reports state; every component draws its own line. It writes
`data-scroll-overflow` (the edges with content hidden beyond them, in canonical
`t`/`r`/`b`/`l` order) on each scroller and `data-scroll-divider` (the sides to
draw) on each piece of chrome, and the Pane, NavStack, TabNavigator, TabBar,
Toolbar, and List stylesheets draw from those. The line is an inset shadow or a pseudo-element
inside the component, so no state ever moves the chrome, the content, or a tab.
Never write a border onto a component to show one.

Configure a pane with `chromeDividers`: `scroll` (the plain-pane default) follows
the scroll state and draws nothing until the wiring runs; `always` (the sunken
pane default) keeps both lines; `none` drops them. Explicit values override
either default. Layouts forward it through `PaneConfig`
(`mainPane.chromeDividers`, a panel's `pane.chromeDividers`). A `NavStack` and a
`TabNavigator` take the same `chromeDividers` for their own chrome (the stack's
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

### Overlay header

`headerPresentation="overlay"` lays a Pane's header over the top of its
scrolling content instead of giving it its own row, the way platform
navigation bars let content scroll visibly beneath a translucent bar:

```tsx
<Pane
  label="Inbox"
  headerPresentation="overlay"
  header={<Toolbar label="Inbox" leading={<ToolbarText text="Inbox" size="xlarge" />} />}
>
  {messages}
</Pane>
```

The header paints the shared chrome material, `--kui-chrome-material` (the
surface at 80% opacity) behind `--kui-chrome-material-filter` (a blur and
saturation backdrop filter), so content passing beneath it reads as softened
color, not as competing text. The material becomes the opaque surface under
`prefers-reduced-transparency: reduce` or `prefers-contrast: more`, where
the browser lacks `backdrop-filter`, on a slow-updating display
(`update: slow`), and when the app sets `data-kui-effects="static"` on the
root element (see [Chrome material](accessibility.md#chrome-material)). In forced colors the header paints
`Canvas` with a `CanvasText` bottom edge.

`wireScrollDividers` measures each overlay header (its border-box height,
safe-area padding included) with a `ResizeObserver` and publishes it on the
Pane as the `--kui-scroll-clearance-block-start` context (see
[Scroll clearance](#scroll-clearance)). The Pane's content clears it
automatically, with no `scrollClearance` prop. At rest the first item sits just
below the header. Mid-scroll, content passes beneath it, and anything focused
or scrolled into view still comes to rest clear of it. The clearance follows
the header as its title wraps or its text grows. The header draws its scroll
divider as a docked header does, once content is scrolled beneath it. The
wiring also marks the Pane `data-header-overlay="measured"`, and only then
does the header move over the content. Until the wiring runs, the header stays
docked in its own row, so it can never cover content it has not measured. A
re-render that drops the measurement gets it back before paint.

The overlay needs pinned chrome. With `chromePlacement="auto"`, the header
stays docked. `PaneConfig` carries `headerPresentation`, so a Workbench
`mainPane` or panel `pane`, a `CollapsiblePanel` `pane`, or a `NavStack` view's
`pane` can lay its header over its content the same way. Overlay-header text
must stay at AA over whatever passes beneath: an untoned `ToolbarText` there
takes the normal text color for its title and lifts its `description` toward
it, and other quiet secondary copy belongs in the content (see
[Accessibility › Chrome material](accessibility.md#chrome-material)).

An overlay scrollbar (macOS by default) passes beneath the header like the
content. A classic, space-taking scrollbar (Windows and Linux, or macOS with
"always show scrollbars") stays uncovered: the wiring also measures the
content's vertical scrollbar (`offsetWidth` beyond `clientWidth`) and publishes
its inline size on the Pane as `--kui-pane-scrollbar-inline-size`, and the
header ends where the scrollbar's track begins, so its thumb and arrow buttons
remain visible and usable. The measurement follows the scrollbar as content
starts or stops overflowing.

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

### Clear header

`headerPresentation="clear"` is an overlay header with no fill: the same
measuring, placement, and scroll clearance as `overlay`, but fully
transparent, for a header laid over imagery such as a `BackdropImage` hero.
The header is not what keeps its controls legible over the image: put them
in glass control groups (`ToolbarControlGroup material="glass"`), or give the
content a scrim. A clear header draws no scroll divider. Set `underChrome` on a
`BackdropImage` that opens the content to run its artwork up beneath the
header.

A clear header stays clear while content scrolls beneath it. To fade a
backing in gradually instead, the scroll-edge effect of iOS, set
`scrollEdge="material"` (the translucent chrome material) or
`scrollEdge="surface"` (the opaque surface). The backing tracks the scroll:
it is fully clear at rest and fully in once content has scrolled
`scrollEdgeDistance` pixels beneath the header (default 60), and out again as
you return to the top. Only its opacity changes; the blur itself never
animates. `wireScrollDividers` publishes the progress
(`--kui-scroll-edge-progress`, 0 to 1) from the scroll it already tracks, so
it works in every engine with no extra wiring; unwired, the header stays
clear.

```tsx
<Pane
  label="Album"
  headerPresentation="clear"
  scrollEdge="material"
  header={<Toolbar label="Album" leading={<BackGroup />} trailing={<AlbumActions />} />}
>
  <BackdropImage src={art} alt="" fadeTo={uiColor("surface")} underChrome>
    <Tracks />
  </BackdropImage>
</Pane>
```

Clear chrome turns opaque where transparency would hurt: under
`prefers-reduced-transparency: reduce` or `prefers-contrast: more` it paints
the opaque material, and in forced colors it paints `Canvas` with a
`CanvasText` edge. Under the static-effects switch or on a slow-updating
display, the scroll edge snaps on while content lies beneath the bar instead
of tracking the scroll.
`NavStack` (`chromePresentation`, `bottomToolbarPresentation`) and
`TabNavigator` (`barPresentation`) take the same `clear` value and
`scrollEdge` and `scrollEdgeDistance` props; a bottom bar fades its backing
out over the last `scrollEdgeDistance` pixels, clearing once the content
reaches its end.

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
  <ContentItem appearance="success">{completedWork}</ContentItem>
  <ContentItem flush>{markdownPreview}</ContentItem>
  <ContentItem shape="pill">{summary}</ContentItem>
</Pane>;
```

`frame="framed"` paints the standard neutral border in the 1px the item always
reserves, so framed and unframed items share the same geometry. Frame an item
only when it marks a real distinction and must read as visibly bounded; do not
frame it to make it "look contained". `shape="pill"` selects the 22px pill
radius expressed as `calc(1px + remify(21px))`. `appearance="surface"` paints
the base surface. The `neutral`, `info`, `pop`, `success`, `warning`, and
`danger` appearances coordinate the same quiet status background, border, and
foreground tokens as `StateBanner`; `transparent` is the default. A lowered,
inset surface around a content stack is `SunkenPanel`, and bare text that only
needs to align with neighboring items is `ListInsetText`. Safe `data-*`
metadata goes in `rootAttributes`. Pass `ariaLabel` only for a distinct named
region (`role="region"`), and `focusTarget` to make the item a programmatic
focus target (`tabindex="-1"`), for example a NavStack view's `data-nav-focus`
target. `flush` removes block padding and both block borders while retaining
the inline margin, padding, and border. Use it for content such as a markdown
preview that must reach the item's top and bottom edges. `title` passes through
to the root element as a native tooltip.

For a static item that needs focus, set `tabIndex={0}` for a Tab stop or
`tabIndex={-1}` for programmatic focus. Set `outlined` for a persistent focus
ring, such as a drop target, on static or interactive items. Interactive items
retain their own Tab stop, keyboard activation, selection, and disabled behavior;
`focusTarget` remains the shorthand for a static programmatic target.

For a selectable card, set `interactive`, a delegated `action`, and an optional
`itemId`. Wire `wireContentItems(root)` once on the containing app root; it
activates focused cards with Enter or Space and forwards the resulting click to
the app's ordinary `data-action` handler. `selectionMode="toggle"` maps
`selected` to a button's `aria-pressed`; `selectionMode="single"` maps it to an
option's `aria-selected` and belongs in an app-owned `role="listbox"` container.
For a card with nested controls and multi-selection, place
`selectionMode="multiple"` cards inside a `List selectionMode="multiple"` with
`ariaLabel`. The List is a labeled `grid` with `aria-multiselectable`, each card
is a focusable `row` with `aria-selected`, and its content is a `gridcell` that
may contain native controls. The app owns the selection set, including
Shift/Cmd extension; the card renders the supplied `selected` state and
dispatches its `action`. Give nested controls their own actions.
When the app delegates clicks by `data-action`, guard the card's selection
handler with `isContentItemActivation(event, card)` from
`@kerfjs/ui/wire-content-items`; it ignores clicks from nested controls that
have no separate action, including a `PopupMenu` trigger.
`wireContentItems` moves focus among enabled rows with Up/Down and Home/End
when a row has focus; arrows from nested controls retain their native behavior.
An interactive card is a Tab stop, and `disabled` removes its action and Tab
stop while exposing `aria-disabled`. Hover uses the normal neutral fill so it
remains visible on a lowered surface; hover, pressed, focus, and selected paints
do not change geometry. A single-action card has no interactive descendants.
For a rich card without card selection, render a static `ContentItem` with
sibling buttons inside it. Each button then has its own focus stop and action.
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

| Need                                     | Class                                | Token / default                                                    |
| ---------------------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| Unpadded header/content/footer structure | `Pane`, `.kui-pane`                  | —                                                                  |
| Scrolling pane content                   | `.kui-pane__content`                 | —                                                                  |
| Optional logical-edge separators         | `Pane.separators`                    | `--kui-pane-separator-width: 1px`                                  |
| Safe-area sides a pane may pad           | `Pane.safeAreaEdges`                 | `--kui-safe-area-*: env(safe-area-inset-*)`, routed by each layout |
| Header laid over scrolling content       | `Pane.headerPresentation`            | `--kui-chrome-material`, `--kui-chrome-material-filter`            |
| Dialog title bar laid over its body      | `DialogSurface.headerPresentation`   | `--kui-chrome-material-raised`, `--kui-chrome-material-filter`     |
| Stack top bar laid over the active view  | `NavStack.chromePresentation`        | `--kui-chrome-material`, `--kui-chrome-material-filter`            |
| Stack bottom toolbar laid over the view  | `NavStack.bottomToolbarPresentation` | `--kui-chrome-material`, `--kui-chrome-material-filter`            |
| Tab bar laid over the active scene       | `TabNavigator.barPresentation`       | `--kui-chrome-material`, `--kui-chrome-material-filter`            |
| Major vertical rhythm                    | `.kui-content`                       | `--kui-layout-content-gap: 24px`                                   |
| Self-contained child geometry            | `ContentItem`                        | 8px margin + 1px border + 8px padding                              |
| Pill child                               | `ContentItem shape="pill"`           | `--kui-layout-pill-radius: 22px`                                   |
| Visibly framed child                     | `ContentItem frame="framed"`         | neutral 1px border, same geometry                                  |
| Related controls                         | `.kui-control-cluster`               | `--kui-layout-control-gap: 8px`                                    |
| Inline metadata                          | `.kui-inline-metadata`               | `--kui-layout-metadata-gap: 4px`                                   |
| Explicit scroll owner outside a pane     | `.kui-scroll-owner`                  | `overflow: auto`                                                   |

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
ordinary `ToolbarText`, `ToolbarControlGroup`, or standalone trailing
`Button` no taller than the band is centered in it by its own size, and a
taller one (a wrapped title, a second trailing row) starts at the band's top
and grows down, so it never moves the other controls. A wrapped `ToolbarText`
centers its first line in the band. Other direct zone content centers against
the zone's full height by default, including when a sibling makes that zone
taller than the control band.
The leading zone clips a shrinking title but reserves 4px of paint overflow
for the focus outline of a control at its edge. Focus rings in all three zones
remain visible at narrow and wide widths.
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
When the title itself opens editing, set `ToolbarText action="edit-title"` and
render it directly in the leading zone beside any status chip. The button
shrinks and ellipsizes at the space left by its siblings without filling unused
space; the app swaps its own input into the edit state.

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

For `Row.gap`, `Grid.gap`, and `List.gap`, pass one token name (`gap="xs"`,
`gap="m"`) to use it on both axes, or pass
`gap={{ column: 'none', row: 'm' }}` to set each axis independently. Each axis
also accepts a complete typed `CssLength`, including `space('xs')` from
`@kerfjs/ui/css-values`. A List is a single vertical column, so its row gap
separates items; its column gap is exposed for the same CSS axis contract.
Use `rem`, `em`, `px`, `pct`, `lengthVar`, and `calc(plus(...))` only when a
named spacing relationship does not express the requirement; do not pass raw
CSS strings.

## Text

`FieldLabel` from `@kerfjs/ui/text` gives a read-only or click-to-edit field
preview the same visible heading as a themed Web Awesome form control. Put it
in `ListInsetControl sides="trl"` above the preview so its text starts at the
same 17px content column as a `ContentItem` value. Unlike a native `<label>`, it
is a plain element: give it an `id` and name the preview's group with
`aria-labelledby`. Keep the app's preview/edit switching and hint copy beside
the preview; use the live control's own `label` when editing.

```tsx
import { ContentItem } from "@kerfjs/ui/content-item";
import { ListInsetControl } from "@kerfjs/ui/list-inset-control";
import { FieldLabel } from "@kerfjs/ui/text";

<div role="group" aria-labelledby="needed-by-label">
  <ListInsetControl sides="trl">
    <FieldLabel id="needed-by-label">Needed By</FieldLabel>
  </ListInsetControl>
  <ContentItem>October 16, 2026</ContentItem>
</div>;
```

Use `Text` from `@kerfjs/ui/text` for ordinary semantic headings, paragraphs,
and inline secondary text. It renders a native `p` by default; set `variant` to
`h1`–`h6` when the document outline calls for a heading, or `span` for inline
copy inside a row, label, or table cell. Ordinary global, `data-*`, and `aria-*`
attributes pass through. Block variants reset their native margin, own a 1px
transparent border, and supply the standard 8px item padding. The `span`
variant owns no margin, border, or padding. Choose heading levels from the
document outline, not for visual size. Toolbar identity and page-heading
compositions continue to use `ToolbarText`.

`Text.controlMargins` accepts canonical physical `Sides` (`t`, `r`, `b`, `l`,
in that order, or empty). Selected edges gain the exterior
`--kui-layout-inline-margin` gutter (8px by default); the border and padding
stay unchanged, including with `flush`. Use `controlMargins="rl"` for a
single text box that needs the control gutter without a Row wrapper. Do not
combine it with a parent inset on the same edges. Spans remain native inline
elements: horizontal margins separate inline content, while vertical margins
do not create line spacing.

`Text` is also the answer for a normal-color subsection title. `ToolbarText`
below `xlarge` (`large`, `default`, `small`) is deliberately quiet: it labels a
toolbar's identity — a pane name or a status — and must not compete with the
content and controls around it. Set `tone="dark"` on a loud-filled toolbar
surface (the inverse `--kui-color-neutral-fill-loud`) to use
`--kui-color-neutral-on-loud` at every size, matching dark control groups; it
inverts with the color scheme. Over a dark photo or scrim keep the default
tone inside a `BackdropImage` overlay, which takes the dark scheme under its
`scrim`. Default tone keeps existing identity and heading colors. A subsection title is
document content, not toolbar identity: use `Text` with the `h2`–`h6` variant
the outline calls for (inside a `List` with `controlInsets`, its text lines up
with content items). Use `ListHeader` when the section is a list or menu group
that needs a count, badge, action, or disclosure, and keep extra-large
`ToolbarText` for the panel, dialog, or page title. A narrow peripheral rail or
drawer is the exception that proves the rule: beside a work area that already
carries the extra-large title, its header names the pane with the default size,
because extra-large would truncate there ("Inspector" becomes "Ins…" in a 160px
rail) and pane identity should stay quiet.

`ListHeader.size` controls its label's visual scale independently of
`headingLevel`: `sm` is the current compact uppercase style and remains the
default; `xs` uses the 2xs font with capitalized words; `m`, `l`, and `xl` match
the themed h5, h4, and h3 typography. Pick `headingLevel` from the document
outline even when a different size suits the layout. `FieldLabel` stays at the
small uppercase style of the default ListHeader.

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

With `wrap="truncate"`, `truncate` chooses where the ellipsis goes: `end`
(default) keeps the start; `start` keeps the tail, for a branch name or the
end of an identifier; and `middle` keeps the start and a suffix, for a file
path. `truncateKeep` sets that suffix: `segment` (default) keeps the last path
segment with its `/` or `\` separator (the last 10 characters when there is
none), or a number keeps that many trailing characters. `middle` needs string
or number children so it can split them. Both positions are for left-to-right
identifiers and paths, keep the whole value in the DOM in order for assistive
technology, and show it as the element's `title` unless you pass your own.
Never hand-roll these with `direction: rtl` or split spans in app CSS.

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
<Text wrap="truncate" truncate="middle" font="monospace">{path}</Text>;
<Text wrap="truncate" truncate="start" variant="span">{branchName}</Text>;
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

<Grid columns={2} gap={{ column: 'none', row: 'm' }}>
  <DocumentTile />
  <DocumentTile />
  <DocumentTile />
  <DocumentTile />
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
`textInsets` adds the standard 17px physical-side inset and `controlInsets`
adds 8px on selected sides; text insets take precedence where they overlap.
Grid is layout-only by default and adds no ARIA grid role. With
`selectionMode="multiple"` and a required `ariaLabel`, it supplies a labeled
multi-select grid for `ContentItem selectionMode="multiple"` tiles. Their
row/gridcell structure can contain independent controls, while
`wireContentItems` follows the rendered tile positions with arrow keys.
The application owns child
semantics.
Use application-owned CSS grid for intrinsic, asymmetric, spanning, or masonry
tracks, and use `ResizableRegion` when people must adjust a boundary.

## Column tracks

A board of parallel columns (kanban lanes) is a `ColumnTrack`: one horizontal
scroll owner that fills its parent's height, with columns that sit flush and
own their insets and vertical scrolling. By default columns share the width
equally but never narrow below `minColumnWidth` (250px), so a narrow board
scrolls sideways instead of crushing them. `layout="paged"` gives each column
nearly the visible width, lets the next one `peek` in (24px), snaps to column
starts, hides the scrollbar, and scrolls smoothly unless reduced motion is
preferred. Choose the layout per device class in the app.

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

A `scrollable` List owns its overflow: its rows keep their natural height and
scroll rather than shrink. To bound one by an ancestor's `max-height` instead
of a definite height, make that ancestor a flex column and pass `flex` (not
`fill`): `<List flex scrollable>` takes at most the remaining height and
scrolls the rest, with no app-owned scrolling wrapper.

A scrollable List is also a keyboard-focusable scroller: Chromium gives it a
Tab stop when it holds no focusable rows, and a dialog may focus it first.
When it has focus it draws the theme focus ring inset by the ring width and
rounded with `--kui-radius-m`, so a rounded or `overflow: hidden` parent
never clips it. Do not style `.kui-list` focus yourself.

### Scroll clearance

Chrome that lies over a scroll owner's block edge (a `DialogSurface` floating
footer over a transcript, or translucent chrome over a scrolling region)
publishes how far it covers that edge through an inherited context:
`--kui-scroll-clearance-block-start` and `--kui-scroll-clearance-block-end`.
A scroll owner opts in per edge with `scrollClearance` (`"block-start"`,
`"block-end"`, or `"both"`) on a `scrollable` `List` or a `Pane`. It adds the
published clearance to its own block padding and `scroll-padding`, so content
scrolls visibly beneath the chrome while the first and last items (and any
item focused or scrolled into view) still come to rest clear of it. Without
the prop the context is ignored. `PaneConfig` carries `scrollClearance` too,
so a composed Pane opts in the same way: a Workbench `mainPane` or panel
`pane`, a `CollapsiblePanel` `pane`, or a `NavStack` view's `pane` (for
example a NavStack view inside a dialog with a floating composer).

Opt in only the one scroller that reaches the covered edge; a nested scroller
must not opt in again. `DialogSurface` publishes block-end for its floating
footer and block-start for its floating header (see
`docs/surface-scaffold.md`), and clears the context in every dialog body. A `Pane` with `headerPresentation="overlay"` publishes block-start for
its own header, once `wireScrollDividers` has measured it, and its content
clears it without the prop (see [Overlay header](#overlay-header)). When an application overlays its own chrome on a region (for example a
translucent toolbar laid over the top of a scrolling list), it publishes the
chrome's block size on that region's container, the one place where an app
sets this context:

```tsx
<section style="position:relative;display:grid;--kui-scroll-clearance-block-start:48px">
  <List scrollable scrollClearance="block-start">{rows}</List>
  {translucentToolbar}
</section>;
```

### Framed result pickers

For a bounded, framed list of `ListItem` rows (search results, duplicate
candidates, a recent-items picker), configure the List instead of wrapping it
in an app-owned scroller:

```tsx
<List scrollable frame gap="2xs" minHeight={rem(4.25)} maxHeight={rem(14)}>
  {candidates.map((candidate) => (
    <ListItem action="pick-duplicate" itemId={candidate.id} label={candidate.title} description={candidate.detail} multiline />
  ))}
</List>;
```

`frame` draws a 1px `--kui-color-neutral-border-normal` border with the
`--kui-radius-m` control radius and a 4px inset on every side (replacing
`inset`, `textInsets`, and `controlInsets`). That inset is exactly a row's
focus-ring reach, so the first and last rows' rings stay inside the clip at
the scroll extremes. Every `scrollable` List, framed or not, carries block
scroll padding of that reach plus 2px of slack (6px; nothing moves at rest),
so a middle row focused or scrolled into view also stops with its ring inside
the clip, even where Chromium's focus scroll stops a pixel short of the padded
target. An unframed scrollable List has no inset, so its first and last rows
still meet the clip at the scroll extremes; use `frame` when those rows must
show a whole ring.
How far `focus()` scrolls a partly visible row is up to the engine: Chromium
brings it to the nearest edge, Firefox leaves it until about half of it is
hidden and then centers it, and WebKit leaves a partly visible row where it
is. Call `wireListFocusScroll(root)` from `@kerfjs/ui/wire-list-focus-scroll`
once at the app root (keep its disposer) to make keyboard focus consistent:
when a `:focus-visible` element inside a `scrollable` List has a ring that
crosses the clip, it calls `scrollIntoView({ block: 'nearest' })`, which
honors the List's scroll padding in every engine. It leaves pointer focus
alone, so a click never scrolls its row from under the pointer, and it is a
no-op where Chromium has already scrolled. `maxHeight` and `minHeight` take typed
`CssLength`s from `@kerfjs/ui/css-values` and bound the List directly, with no
flex-column ancestor; pair `maxHeight` with `scrollable`. A frame of settings
rows with dividers between them is a `FramedList`, not a framed List.

For long reading content, such as a reader view, pass `inset="document"`: 24px
block and 32px inline on all four sides, narrowing to 16px inline below 576px.
It replaces any `textInsets`/`controlInsets` on that List.

A List is transparent by default. Pass `surface="base"` (the page surface) or
`surface="raised"` to paint a solid background behind the stack and its
insets — for example a banner strip above a sunken work area, which otherwise
shows the lowered tint around the banner. Give that strip `controlInsets="tb"`
so the banner's own inline margin, not a second List inset, sets its edges. A
lowered region is a `SunkenPanel`, not a List surface.

Put route, test, or recipe metadata on the same root with `rootAttributes`,
which accepts safe `data-*` pairs and keeps each component's structural
attributes (`data-component`, `data-flex`, `data-fill`, alignment, inset, and
column markers) protected. A `List` or `Row` root also takes `aria-*`
attributes and a structural `role` (`region`, `group`, `list`, `status`, a
landmark, …), so a labeled drop-target region or an `aria-busy` stack needs no
wrapper; widget roles are dropped, and a multi-select `List` keeps its own
grid role and name:

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

`Row`, `Grid`, and `List` also accept `textInsets` and `controlInsets` using the shared
physical `Sides` union. Values follow canonical top/right/bottom/left order
(`t`, `rb`, `tbl`, `trbl`, and so on). A selected control side adds 8px of
padding. A selected text side adds the complete content-item alignment inset —
8px outer margin + 1px border + 8px inner padding, represented as 17px of
container padding. When both props select the same side, the text inset wins.
Each nested `Row`, `Grid`, or `List` resolves its own four inset sides;
unselected sides reset to zero instead of inheriting a same-type parent's inset selection.
The same holds for `gap` and `flex` on a nested `List`, `Row`, or `Grid`: an
omitted prop falls back to that component's own default (no gap for `List`,
`xs` for `Row` and `Grid`; the CSS initial `flex`) rather than the enclosing
instance's value.

`ListInsetText` and `ListInsetControl` use the same `sides` vocabulary and
default to `trbl`. The text wrapper applies its complete 8/1/8 geometry only on
selected sides; the control wrapper applies its 8px outer margin only on
selected sides. Every direct child of `ListInsetControl` grows to fill the row
(a `Select`, a `TextField`, or a `Button` spans the full inset width), and
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
   `ListHeader` renders its title/indicator cluster separately from its optional
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
