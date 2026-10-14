# Dialog and popup surface scaffolds

`DialogSurface` and `PopupSurface` configure recurring Web Awesome surface
geometry without application `::part()` overrides. They do not replace Web
Awesome behavior: the application still owns open state, dismissal policy, ids,
labels, and content. With `@kerfjs/ui/popup-menu/register` imported, a dropdown
inside `PopupSurface` also keeps keyboard item navigation made during its show
animation when Web Awesome completes its initial focus handoff.

Wrap one `wa-dialog` with `DialogSurface`. Choose `size` (`small`, `medium`, or
`large`), `presentation` (`modal`, `side-sheet`, `fullscreen`, or
`bottom-sheet`; see [Bottom sheets](#bottom-sheets)), and independent
`bodyInset` / `footerInset` (`none`, `compact`, or `comfortable`). The defaults
match Kerf's medium modal, 8px body, and 16px footer rhythm.

The panel corner is concentric with a pill `ToolbarControlGroup` (22px) resting
at the body inset: 30px for `compact` (and `none`) and 38px for `comfortable`,
so header and body controls nest into the curve. A side sheet uses the same
radius on its leading corners, and a bare `wa-dialog` or `PopoverDialogSurface`
takes the 30px default.

The modal size presets have preferred widths of 400px, 560px, and 800px,
respectively, before the viewport width cap. Set `preferredWidth` to a branded
`CssLength` when the desktop shell needs another width. It takes precedence over
`size`, while the viewport cap still applies. For example, 832px and 480px
desktop preferences can share the same responsive dialog without changing its
resource tracks or preview aspect sizing.

### Sibling dialogs keep their identity

Every `DialogSurface` root has the same structure, so two sibling dialogs that
are rendered conditionally are matched by position when the page re-renders:
one open dialog's element (with its accessible name and open state) can be
reused for another, and Web Awesome events such as `wa-after-hide` fire on the
wrong dialog or not at all. Give each sibling a stable key on its root with
`rootAttributes`, instead of wrapping it in an app `div`:

```tsx
<DialogSurface rootAttributes={{ "data-key": "project-setup" }}>
  <wa-dialog label="Set up project">…</wa-dialog>
</DialogSurface>
```

`rootAttributes` takes `data-*` identity only; the surface's own configuration
attributes (`data-size`, `data-presentation`, …) stay protected.

### Modal viewport bounds

`viewportGutter` accepts a branded `CssLength` from `@kerfjs/ui/css-values`.
It sets the minimum horizontal clearance; `preferredWidth` overrides the `size`
preset when supplied. `maxHeight` accepts a branded length or `"viewport"`; explicit caps are
clamped to the dynamic viewport height minus twice the gutter (16px per edge
when the gutter is omitted). Negative gutters/caps clamp to zero. Omitting
both options preserves Web Awesome's existing width and phone height caps.
These options apply only to `presentation="modal"`; side sheets and fullscreen
surfaces keep their own geometry, and a bottom sheet reads `height` and
`maxHeight` as described in [Bottom sheets](#bottom-sheets).

```tsx
import '@kerfjs/ui/surface-scaffold/register';
import { remify } from '@kerfjs/ui/css-values';
import { DialogSurface } from '@kerfjs/ui/surface-scaffold';

<DialogSurface preferredWidth={remify(832)} viewportGutter={remify(8)} maxHeight="viewport" bodyInset="none">
  <wa-dialog label="Close Workspace">{/* Application-owned content and footer */}</wa-dialog>
</DialogSurface>;
```

This gives a desktop modal an 832px preferred width and a phone modal an 8px edge gutter with a `calc(100dvh - 16px)` height
cap without application selectors on Kerf roots or Web Awesome parts. A cap
is not a fixed height: short content stays naturally sized, and taller content
scrolls in Web Awesome's body while its header/footer remain outside that
scroll owner. Choosing a larger cap cannot guarantee that arbitrary content
fits without scrolling; preview tracks, canvas aspect ratios and content sizing
remain application-owned.

Responsive policy is explicit application state: read `deviceClass()` during
the render to choose the gutter, cap or presentation. For example use
`viewportGutter={remify(device.value.handset ? 8 : 16)}` with `maxHeight="viewport"`.
The scaffold introduces no hidden breakpoint or automatic fullscreen switch.
An application can configure device-class breakpoints when its phone policy
differs from the default. Prefer a typed cap such as `maxHeight={remify(640)}`
when the modal should stop growing before the viewport bound.

### Bottom sheets

`presentation="bottom-sheet"` attaches the dialog to the bottom edge of the
screen instead of centering it, the way a phone presents a compose or quick
edit sheet. The default `modal` presentation is unchanged.

- **Geometry.** The panel rests on the viewport's block-end edge. Its top
  corners keep the dialog radius and its bottom corners are square. It is
  full width on a phone and the `size` / `preferredWidth` width, centered, on
  a wider screen.
- **Safe area and keyboard.** The panel runs to the edge, behind the home
  indicator and any virtual keyboard, while a block-end padding keeps its
  content above them. The padding is the largest of
  `--kui-safe-area-block-end`, the keyboard overlap the register measures from
  `visualViewport` (layout height minus the visual viewport's height and top
  offset, ignored while pinch-zoomed), and the VirtualKeyboard API's
  `env(keyboard-inset-height)`. A page whose viewport meta sets
  `interactive-widget=resizes-content` shrinks the layout viewport instead, so
  the measured overlap is zero and the sheet simply follows the dynamic
  viewport. Kerf never sets `navigator.virtualKeyboard.overlaysContent`; an
  application that opts into it gets the `env()` value for free.
- **Height.** `height`, `minHeight`, and `maxHeight` measure the visible
  content height above that clearance. `height` is the opening height
  (omit it to size to content), and `maxHeight` caps it. The panel never
  exceeds the dynamic viewport minus the top safe area and one
  `viewportGutter` (16px by default), so a tall keyboard shrinks the content
  rather than pushing the sheet off the top.
- **Resizing.** `resizable` adds a grabber at the top edge: a focusable
  horizontal `separator` named "Resize sheet" with `aria-valuemin`,
  `aria-valuenow`, and `aria-valuemax` in visible px. Drag it, or use the
  arrow keys (16px), Page Up/Down (64px), Home (`minHeight`, default 160px),
  and End (the cap). The register injects the grabber into the dialog's
  shadow panel, so it never disturbs `bodyLayout` children or a Kerf morph.
  Each opening starts again at `height`.
- **Motion.** The sheet slides up from the bottom edge when it opens and back
  down when it is dismissed. `enterMotion="standard"` or
  `exitMotion="standard"` keeps Web Awesome's scale-and-fade for that
  transition. The slide falls back to Web Awesome's motion under
  `prefers-reduced-motion: reduce` and the document's static effects mode
  (`:root[data-kui-effects="static"]`). A prevented close still pulses.

```tsx
import '@kerfjs/ui/surface-scaffold/register';
import { remify } from '@kerfjs/ui/css-values';
import { DialogSurface } from '@kerfjs/ui/surface-scaffold';

<DialogSurface presentation="bottom-sheet" height={remify(360)} minHeight={remify(200)} resizable bodyInset="none">
  <wa-dialog label="New Message" light-dismiss>
    {/* Application-owned fields */}
  </wa-dialog>
</DialogSurface>;
```

The resize grabber, keyboard clearance, and slide need the `/register`
entry. Without it the sheet keeps its bottom-edge geometry and safe-area
padding, shows no grabber, and opens with Web Awesome's own animation.
`preferredWidth`, `bodyLayout`, the floating header and footer, and the
insets compose with a bottom sheet as they do with a modal.

### Core dialogs as bottom sheets

The core `kerfjs/overlay` surfaces (`overlay()` and the `confirm`, `prompt`,
`form`, and `choice` promise dialogs) take `presentation: 'bottom-sheet'`, but
the core ships no CSS. Import `@kerfjs/ui/overlay-sheet.css` once to give
them this package's bottom-sheet geometry:

- the bottom edge, full width up to 560px and centered beyond;
- square bottom corners under the dialog radius;
- the 8px surface inset, padded at the block end by the larger of the safe
  area and the `--kerf-keyboard-inset` the core publishes;
- a cap below the top safe area;
- a slide up as it opens.

Pass `exitClass: 'kui-overlay-sheet-exit'` (with an `exitDuration` cap such as
`400`) to slide it back down as it closes. The stylesheet covers the plain
host and `native: true`, honors reduced motion and the static-effects switch,
and paints `Canvas` in forced colors.

The core renders bare default markup, so compose the content from components
through the dialog's `render` slot and spread the wiring slots onto native
buttons:

```tsx
import "@kerfjs/ui/overlay-sheet.css";

confirm("Discard this draft?", {
  presentation: "bottom-sheet",
  exitClass: "kui-overlay-sheet-exit",
  exitDuration: 400,
  render: ({ message, ok, cancel }) => (
    <List gap="xs">
      <Toolbar label="Discard Draft" leading={<ToolbarText text="Discard Draft" size="xlarge" headingLevel={2} />} />
      <ListInsetText>{message}</ListInsetText>
      <Row hAlign="right" controlInsets="rl">
        <ToolbarControlGroup label="Discard Draft Actions" content="text">
          <button type="button" {...cancel}>Keep Editing</button>
          <button type="button" {...ok}>Discard</button>
        </ToolbarControlGroup>
      </Row>
    </List>
  ),
});
```

The wired controls can be native buttons, as here, or Web Awesome buttons.
With kerfjs 5.0 or later, the core holds focus on the sheet until a Web
Awesome OK button has rendered, then moves focus to it. On kerfjs 4.x, use
native buttons for the wired controls: the core's first focus reaches a Web
Awesome button before it has rendered and aborts the open.

A core sheet can also be resizable, like a `resizable` `DialogSurface` sheet.
Add the `kui-overlay-sheet-resizable` class next to the default wrapper class,
and call `wireOverlaySheets()` from `@kerfjs/ui/wire-overlay-sheets` once for
each container sheets open in (`document.body`, the core's default):

```tsx
import "@kerfjs/ui/overlay-sheet.css";
import { wireOverlaySheets } from "@kerfjs/ui/wire-overlay-sheets";

const stopSheets = wireOverlaySheets();

overlay(<UpNext />, {
  className: "kerf-overlay kui-overlay-sheet-resizable",
  presentation: "bottom-sheet",
});
```

Each such sheet gets the same grabber at its top edge: a `role="separator"`
that resizes the visible height by drag, the arrow keys (16px), Page Up/Down
(64px), Home (the minimum), and End (the cap), and reports that height as its
ARIA values. The minimum is `--kui-overlay-sheet-min-height` (160px). The
sheet opens at its content height every time. The grabber sticks to the top
edge while the content scrolls, and stays the sheet's first child (and first
tab stop) across re-renders of the overlay's content. Compose the sheet's
content root as a block or column, since the grabber is its first child. The
wiring watches only the container's direct children, which is where the core
appends each overlay; call the disposer to remove every grabber.

### Filling the dialog

`maxHeight` caps a modal that sizes to its content. A layout that fills the
dialog (a list-detail `SplitView`, a `Pane` with its own chrome and scroller)
needs a height to fill instead: set `height` to a branded length or
`"viewport"`. It is bounded exactly like `maxHeight` (the dynamic viewport minus
both gutters) and takes precedence over it. `bodyLayout="fill"` then gives the
body's whole height to its one child, which owns its own scrolling; the body
itself stops scrolling. Combine it with `bodyInset="none"`.

```tsx
<DialogSurface size="large" height={remify(640)} viewportGutter={remify(8)} bodyInset="none" bodyLayout="fill">
  <wa-dialog label="Repository Status">
    <SplitView id="repo-split" label="Changes" listWidth={{ size: 432, maxFraction: 0.5 }} list={list} detail={detail} />
  </wa-dialog>
</DialogSurface>;
```

### Chat dialogs: a floating footer over a filling transcript

A chat-style dialog keeps a heading or notices above one scrolling transcript
and floats its composer over the body's block end. Two props compose it:

- `bodyLayout="fill-last"` stacks the body's children: the leading children
  keep their natural height, and the last one takes the remaining height and
  owns its scrolling (a `scrollable` `List` transcript). The body itself stops
  scrolling. `PopoverDialogSurface` accepts the same layout.
- `footerPresentation="floating"` lays the footer over the body's block end,
  `footerOffset` (a branded `CssLength`, default the 16px container inset)
  from the panel's inline and block-end edges, on a transparent background.
  The modal panel is its positioning context. The default `docked` footer
  sits below the body as before.

The register measures the footer (it follows a composer that grows, wraps, or
hides) and the body reserves that height plus the offset after its own inset,
with a matching `scroll-padding`. Flowing body content scrolls beneath the
floating footer and its end stays reachable above it; with `fill` or
`fill-last` the filling child's scrollport ends at the footer's top. Content
is never hidden beneath the footer.

To let a filling transcript scroll visibly beneath the floating footer, opt
its scroller in with `scrollClearance="block-end"` (a `scrollable` `List`, or a
`Pane`, as the `fill` or last `fill-last` child). The body then stops
reserving the footer below that child, so the child reaches the panel's block
end, and publishes the footer's clearance (measured height plus offset) as the
inherited `--kui-scroll-clearance-block-end` context. The child adds it to its
own block-end padding and `scroll-padding`: messages pass beneath the
transparent footer mid-scroll, the last message rests above the composer at
the end, and focus or `scrollIntoView` never leaves an item hidden beneath it.
The context is general: chrome that overlays a region's block-start or
block-end edge publishes `--kui-scroll-clearance-block-start` / `-end`, and a
scroll owner opts in per edge (see `docs/layout.md` "Scroll clearance"). A
dialog body clears any clearance inherited from the page.

Choose the offset like any other responsive value: the scaffold adds no
breakpoint. An 8px offset lines a composer up with the transcript's
content-item edges when the body has `bodyInset="none"` and list geometry;
`viewportGutter` and `footerOffset` can follow `deviceClass()` when a phone
needs tighter edges. Put a [`Composer`](./composer.md) in the floating footer
with `footerInset="none"`: its raised frame and shadow lift it over the
transcript, and its field grows the measured footer. With `submitOnEnter` and
`wireComposers(root)`, Enter sends through the same action as the Send button.

```tsx
<DialogSurface height={remify(560)} viewportGutter={remify(8)} bodyInset="none" bodyLayout="fill-last" footerPresentation="floating" footerOffset={remify(8)} footerInset="none">
  <wa-dialog label="Assistant">
    <StateBanner title="Answers use the latest nightly build." tone="neutral" />
    <List gap="xs" controlInsets="tb" scrollable scrollClearance="block-end">
      {messages.map((message) => (
        <ContentItem bubble={message.mine ? 'end' : 'start'} appearance={message.mine ? 'brand-loud' : 'neutral'}>
          <Text variant="span">{message.text}</Text>
        </ContentItem>
      ))}
    </List>
    <Composer submitOnEnter slot="footer" id="assistant-message" name="message" label="Message" placeholder="Ask about this build" actions={<wa-button variant="brand" data-action="send-message">Send</wa-button>} />
  </wa-dialog>
</DialogSurface>;
```

### A floating title bar

`headerPresentation="floating"` lays the dialog's header (its title and close
control) over the body's block-start edge on the translucent chrome material,
`--kui-chrome-material-raised` (the raised panel surface at 80% opacity)
behind `--kui-chrome-material-filter` (a blur and saturation backdrop filter).
Content passing beneath the title bar reads as softened color, not as
competing text. The default `docked` header sits above the body as before.

The register measures the header the same way it measures the footer (it
follows a title that wraps, text that grows, or a `without-header` toggle).
The body reserves the measured height before its own inset, with a matching
`scroll-padding`, so flowing content starts below the title bar and scrolls
beneath it. A dialog without the register has no measurement, so its header
stays docked rather than covering content.

To let a filling transcript scroll visibly beneath the title bar, make it the
body's only child (`bodyLayout="fill"`, or `fill-last` with no leading rows)
and opt its scroller in with block-start `scrollClearance`. The body then
stops reserving the header, so the child reaches the panel's block-start
edge, and publishes the header's height as `--kui-scroll-clearance-block-start`.
Leading `fill-last` rows (a notice above the transcript) keep the body's
reservation: they never sit beneath the title bar. Combined with a floating
composer and `scrollClearance="both"`, the transcript scrolls beneath both:

```tsx
<DialogSurface height={remify(560)} viewportGutter={remify(8)} bodyInset="none" bodyLayout="fill" headerPresentation="floating" footerPresentation="floating" footerOffset={remify(8)} footerInset="none">
  <wa-dialog label="Release Thread">
    <ToolbarText slot="label" text="Release Thread" size="xlarge" description="Engineering · 5.2 candidate" />
    <List gap="xs" controlInsets="tb" scrollable scrollClearance="both">
      {bubbles}
    </List>
    <Composer submitOnEnter slot="footer" id="thread-message" name="message" label="Message" placeholder="Reply to the thread" actions={<wa-button variant="brand" data-action="send-message">Send</wa-button>} />
  </wa-dialog>
</DialogSurface>;
```

Like a `Pane`'s overlay header, the title bar draws its divider as scroll
state: a 1px line along its bottom edge only while the body, or a filling
child that reaches beneath it, is scrolled away from its top, and none at
rest. The register follows those scrollers (a nested scroller that starts
below the title bar never counts), and the line is an inset shadow, so it
never moves the header or the content.

The material turns opaque under `prefers-reduced-transparency: reduce` or
`prefers-contrast: more`, and where the browser lacks `backdrop-filter`; in
forced colors the header paints `Canvas` with a `CanvasText` bottom edge.

For a title with a short supporting line, slot a `ToolbarText` as the label
(`<ToolbarText slot="label" text="Release Thread" size="xlarge" description="Engineering · 5.2 candidate" />`).
On the floating title bar an untoned `ToolbarText` keeps AA by itself: its
title takes the normal text color and its description lifts halfway toward
it. Any other quiet copy you place there can fall below AA over the content
passing beneath it, so keep it in the body (see
[Accessibility › Chrome material](accessibility.md#chrome-material)).

Treat a dialog body as a `List` by default. When its rows or sections own their
standard list geometry, set `bodyInset="none"` so the dialog does not add a
second inset. Bare prose is still a list child: wrap it in `ListInsetText` so its
text edge receives the standard 8px margin + 1px transparent border + 8px
padding and aligns with bordered siblings. Reserve `compact` or `comfortable`
body insets for exceptional content that does not already have list/content-item
geometry.

## Non-modal dialogs: `PopoverDialogSurface`

`wa-dialog` is modal: it makes the page inert until it closes. When a dialog
should leave the page interactive and close on Escape or a press outside (a
status panel, a quick inspector), render `PopoverDialogSurface` instead of a
hand-built popover with application chrome CSS. It is a native
`popover="auto"` section with `role="dialog"` that owns Kerf's dialog chrome
(raised surface, border, large radius and shadow, and a backdrop) and the
same geometry props as a modal `DialogSurface`: `size`, `preferredWidth`,
`viewportGutter` (16px by default), `height` / `maxHeight`, and `bodyLayout`
(`flow`, `fill`, or `fill-last`).
Name it with `label` or `labelledBy`. To give it an accessible description,
pass `describedBy`, the id of the element that holds the summary. It renders as
`aria-describedby` on the `role="dialog"` root and usually names a title
`ToolbarText`'s `descriptionId`:

```tsx
<PopoverDialogSurface id="connection-details" labelledBy="connection-title" describedBy="connection-summary" bodyLayout="fill-last">
  <Toolbar label="Connection Details Heading" leading={<ToolbarText text="Connection Details" size="xlarge" id="connection-title" description="Connected to the build server." descriptionId="connection-summary" />} />
  {details}
</PopoverDialogSurface>;
```

`DialogSurface` has no `describedBy`. It wraps a `wa-dialog` that the app
authors, so the app names and describes that dialog on its own markup.

Open it with a control's `popoverTarget` (or `showPopover()`); the browser
places it centered in the top layer, light-dismisses it, and restores nothing
else, so move focus into it with `autofocus` on its first control when that
matters. A closed surface stays hidden; only the open one lays out.
`presentation="embedded"` renders the same surface in flow, with no top
layer and never wider than its container, for a catalog specimen or an inline
preview.

```tsx
<button type="button" popoverTarget="repository-status">Repository Status</button>
<PopoverDialogSurface id="repository-status" label="Repository Status" preferredWidth={remify(1024)} height={remify(640)} viewportGutter={remify(8)} bodyLayout="fill">
  <SplitView id="repo-split" label="Changes" list={list} detail={detail} />
</PopoverDialogSurface>;
```

Use `DialogSurface` with `wa-dialog` whenever the task must block the page.

Wrap one `PopupMenu` (or another single `wa-dropdown`) with `PopupSurface`. `inset="list-zero"` removes menu
padding for a child that already owns row insets, `compact` uses 4px, and
`standard` uses the shared 8px surface inset. Keep the dropdown trigger named and
preserve `data-morph-skip-children` when its upgraded light-DOM items must retain
identity across Kerf rerenders. Import `@kerfjs/ui/popup-menu/register` once for
the focus handoff fix when wrapping a raw `wa-dropdown`.

Import `@kerfjs/ui/surface-scaffold/register` once when using `DialogSurface`: it registers `wa-dialog`, measures each surface's footer for a floating footer's body clearance, draws a floating header's divider while content is scrolled beneath it, wires a bottom sheet's resize grabber, keyboard clearance, and slide, and repairs Web Awesome 3.12 native dialog names before the first modal opening. Headed dialogs reference the rendered title, including live slotted labels; headerless dialogs use the public `label`. Explicit host `aria-label` and pre-existing native names are preserved. A host that is itself an explicit dialog (`role="dialog"` or `"alertdialog"` with its own name) keeps that name alone: the native panel is left unnamed, so one dialog carries the name. Geometry-only markup stays CSS-free and does not register Web Awesome implicitly.
