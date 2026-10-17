# List-detail dialog

`@kerfjs/ui/list-detail-dialog` is the modal form of a list-detail layout: a
list column beside the selected item's detail, each running the dialog's full
height. It is one of three dialog types:

| Type                                                           | Use it for                                               |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| `DialogSurface` ([surface-scaffold.md](surface-scaffold.md))   | One pane: a title, a body, and footer buttons.           |
| `ListDetailDialog` (this page)                                 | Pick a record from a list and show its detail beside it. |
| `WorkbenchDialog` ([workbench-dialog.md](workbench-dialog.md)) | An editing task with side panels.                        |

```ts
import {
  ListDetailDialog,
  openDialog,
} from "@kerfjs/ui/list-detail-dialog";
import { deviceClass } from "@kerfjs/ui/device-class";
```

In a browser bundler that honors the `browser` export condition, the import
also loads the stylesheets of every component it renders (DialogSurface,
SplitView, NavStack, Pane, and the toolbar components). Without that
condition, import `@kerfjs/ui/list-detail-dialog.css`, which pulls in the same
stylesheets, or `@kerfjs/ui/styles.css`.

## Where things go

- **The detail column owns the dialog's identity.** Its header toolbar carries
  the primary title (an xl level-2 heading, with an optional `description`
  line), the `actions` you pass, and the close control, last. Record actions go
  in the detail `footer`, pinned below the scrolling detail.
- **The list column is secondary.** Its header carries `list.title` at the
  default toolbar size, so it reads as pane identity beside the primary title,
  followed by your `list.toolbar` controls. An add control or count can go in
  `list.footer`.
- **The surface draws no header.** Both columns start at the dialog's top
  edge, so the divider between them runs the dialog's full height.
- **The description is yours to name.** The detail `description` describes the
  selected record, not the dialog, so it is not the dialog's accessible
  description. Pass `describedBy`, the id of app-owned summary copy, to render
  `aria-describedby` on the dialog.

Each column is a `Pane`: its header and footer stay pinned and its content
scrolls on its own. Pass content that owns its geometry, usually a `List`.

## Responsive by device class

The component is declarative. The app derives `compact` from the device class
and tracks its own selection and, on compact devices, whether the detail is
pushed:

```tsx
const device = deviceClass();
const selected = signal("atlas");
const detailOpen = signal(false);

<ListDetailDialog
  id="projects"
  label="Project Details"
  compact={device.value.compact}
  detailActive={detailOpen.value}
  backLabel="Back to Projects"
  list={{
    title: "Recent Projects",
    content: <List>{rows}</List>,
  }}
  detail={{
    title: project.name,
    content: <List>{details}</List>,
    footer: actions,
  }}
/>;
```

- **Roomy** (`compact: false`): a modal of `size` `large` with a definite
  height (default 560px, bounded by the viewport; pass `maxHeight` instead to
  size it to its content). The list column is 280px, at most 40% of the
  dialog, by default; set `list.width` like SplitView's `listWidth`.
- **Compact** (`compact: true`): the dialog fills the screen and becomes a
  `NavStack`. The list is the root view (titled `list.title`, with its toolbar
  controls); `detailActive` pushes the detail (titled `detail.title`, with its
  `actions`). Every view keeps the close control, and each view's `footer` is
  pinned below it. The stack's back control dispatches `nav-back`; set
  `detailActive` back to `false` in response. Wire `wireNavStack` above it for
  the push and pop motion.

Render one `ListDetailDialog` for both presentations, so crossing the compact
breakpoint while it is open morphs it in place and it stays open.

## Opening and closing

It is a `DialogSurface` underneath: open it with `openDialog(element)` and close
it with `closeDialog(element)`, the close control, Escape, an element with
`data-dialog-close`, or (with `lightDismiss`) a press on the backdrop. Both
functions are re-exported from this subpath. Give sibling dialogs distinct
`rootAttributes['data-key']` values so a re-render morphs each into itself.

See the [list-detail dialog recipe](recipes.md#list-detail-dialog) for a
complete, production-backed example.
