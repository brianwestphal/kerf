# Split view (list-detail)

`@kerfjs/ui/split-view` is a list-detail layout: a list and a
detail side by side on roomy screens, collapsing to a `NavStack` (list → detail)
on compact ones. One of the opt-in app layouts (see
[`../../docs/23-app-layouts.md`](../../docs/23-app-layouts.md)).

```ts
import { SplitView } from "@kerfjs/ui/split-view";
import { deviceClass } from "@kerfjs/ui/device-class";
// plus wireResizableRegions / wireNavStack for the interactive behavior.
```

In a browser bundler that honors the `browser` export condition (Vite, esbuild, and
webpack do by default), the import above also
loads SplitView's stylesheet and those of the components it renders internally
(its compact `NavStack`, `ResizableRegion`, and the toolbar
components). Without that condition, import the manual stylesheets instead:
`@kerfjs/ui/split-view.css` plus those components' CSS, or `@kerfjs/ui/styles.css`.

## Safe areas

The list pane grows by the inline-start unsafe inset and pads for the edges it
touches; the detail pads for its own outer edges. Neither is inset on the
shared interior edge. A pane whose only child is a `Pane` lets that child own
the insets, and the compact form hands them to its `NavStack`. See
[Choosing an app layout › Safe areas](app-layouts.md#safe-areas).

For a lowered list or detail background, render a `Pane` in that region with
`appearance="sunken"`. SplitView arranges regions but does not own their
vertical scroll; its compact NavStack form can use the view's or nested Pane's
appearance. See [Lowered work surfaces](layout.md#lowered-work-surfaces).

## Responsive by device class

`SplitView` is declarative; the app derives `compact` from the device class and
tracks its own selection:

```tsx
const device = deviceClass();
const selected = signal<string | null>(null);

<SplitView
  id="mail"
  label="Mail"
  compact={device.value.compact}
  detailActive={selected.value !== null}
  list={<ThreadList />}
  detail={<Message id={selected.value} />}
  listTitle="Threads"
  detailTitle="Message"
  resizable={{ size: 320, min: 220, max: 480 }}
/>;
```

- **Roomy** (`compact: false`): both panes show. With `resizable`, the list sits
  in a `ResizableRegion` (wire it with `wireResizableRegions`); without it the
  list takes a fixed `--kui-split-view-list-width` (default 320px) and the detail
  fills the rest.
- **Compact** (`compact: true`): the split collapses to a `NavStack`. The list is
  the root; when `detailActive` is true the detail is pushed over it with an
  automatic back control (wire it with `wireNavStack`, whose `onBack` clears the
  app's selection). This is the portrait-tablet / handset presentation; as a
  dialog the compact form is a full-screen or large partial-cover modal.

## Configuring the list region and the compact stack

`resizable` forwards the list's `ResizableRegion` configuration alongside
`size`, `min`, and `max`: `separator` (`"hidden"` keeps the resize hit target
but paints no line), `handleIcon`, `contentOverflow`, and collapse —
`collapsed`, `transitioning`, `collapseMotion`, `restoreControl`, and
`restorePosition`. A collapsed list snaps to zero width, renders `inert` and
`aria-hidden`, and the detail fills the split; the app owns the `collapsed`
flag and renders the restore control (usually a `FloatingToolbar`). Omitted
options keep the region's defaults.

```tsx
resizable={{
  size: listWidth.value,
  min: 220,
  max: 480,
  collapsed: listCollapsed.value,
  restoreControl: <ShowThreadsToolbar />,
}}
```

`compactStack` configures the compact `NavStack`: `toolbarConfig`, `backIcon`,
`backText`, `hideToolbar`, the persistent `bottomToolbar`, and `chromeDividers`
forward to the stack, and `list` / `detail` give each view its own structured
top `toolbar` (`leading`, `center`, `trailing`) and `bottomToolbar`:

```tsx
compactStack={{
  backText: "Threads",
  toolbarConfig: { headingLevel: 1 },
  list: { toolbar: { trailing: <ComposeGroup /> } },
  detail: {
    toolbar: { trailing: <ReplyGroup /> },
    bottomToolbar: { label: "Message actions", leading: <MessageActions /> },
  },
}}
```

The catalog's **Interactive compact drill-down** example exercises this exact
controlled flow: a list action sets the selected message, `detailActive` pushes
its detail, and the wired Back action clears the selection to reveal the
preserved list. It also forwards `compactStack`: a level-2 heading title over
a bottom divider, a Compose group on the list view, and a Reply group plus a
bottom toolbar on the detail. Use the same structure in application demos so
compact examples show the interaction rather than rendering a disconnected
detail state.

The catalog's **Resizable, collapsible list** example forwards `resizable`: a
hidden separator that still resizes the list (its committed width comes back
through `wireResizableRegions`' `onCommit` into the app's size signal), a Hide
control in the list's own toolbar, and a `FloatingToolbar` restore control in
the split's bottom-start corner.

Compose the interactive wiring from the existing helpers — `SplitView` adds no
wire of its own.
