# Dialog and popup surface scaffolds

`DialogSurface` and `PopupSurface` configure recurring Web Awesome surface
geometry without application `::part()` overrides. They do not replace Web
Awesome behavior: the application still owns open state, dismissal policy, ids,
labels, and content. With `@kerfjs/ui/popup-menu/register` imported, a dropdown
inside `PopupSurface` also keeps keyboard item navigation made during its show
animation when Web Awesome completes its initial focus handoff.

Wrap one `wa-dialog` with `DialogSurface`. Choose `size` (`small`, `medium`, or
`large`), `presentation` (`modal`, `side-sheet`, or `fullscreen`), and independent
`bodyInset` / `footerInset` (`none`, `compact`, or `comfortable`). The defaults
match Kerf's medium modal, 8px body, and 16px footer rhythm.

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
surfaces keep their own geometry.

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

Choose the offset like any other responsive value: the scaffold adds no
breakpoint. An 8px offset lines a composer up with the transcript's
content-item edges when the body has `bodyInset="none"` and list geometry;
`viewportGutter` and `footerOffset` can follow `deviceClass()` when a phone
needs tighter edges. Put a [`Composer`](./composer.md) in the floating footer
with `footerInset="none"`: its raised frame and shadow lift it over the
transcript, and its field grows the measured footer.

```tsx
<DialogSurface height={remify(560)} viewportGutter={remify(8)} bodyInset="none" bodyLayout="fill-last" footerPresentation="floating" footerOffset={remify(8)} footerInset="none">
  <wa-dialog label="Assistant">
    <StateBanner title="Answers use the latest nightly build." tone="neutral" />
    <List gap="xs" controlInsets="tb" scrollable>
      {messages.map((message) => (
        <ContentItem bubble={message.mine ? 'end' : 'start'} appearance={message.mine ? 'brand-loud' : 'neutral'}>
          <Text variant="span">{message.text}</Text>
        </ContentItem>
      ))}
    </List>
    <Composer slot="footer" id="assistant-message" name="message" label="Message" placeholder="Ask about this build" actions={<wa-button variant="brand">Send</wa-button>} />
  </wa-dialog>
</DialogSurface>;
```

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

Import `@kerfjs/ui/surface-scaffold/register` once when using `DialogSurface`: it registers `wa-dialog`, measures each surface's footer for a floating footer's body clearance, and repairs Web Awesome 3.12 native dialog names before the first modal opening. Headed dialogs reference the rendered title, including live slotted labels; headerless dialogs use the public `label`. Explicit host `aria-label` and pre-existing native names are preserved. A host that is itself an explicit dialog (`role="dialog"` or `"alertdialog"` with its own name) keeps that name alone: the native panel is left unnamed, so one dialog carries the name. Geometry-only markup stays CSS-free and does not register Web Awesome implicitly.
