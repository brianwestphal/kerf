# Workbench dialog

`@kerfjs/ui/workbench-dialog` is the modal form of a `Workbench`: a work area
with side rails (layers, an inspector) inside a dialog. It is one of three
dialog types:

| Type                                                                | Use it for                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------- |
| `DialogSurface` ([surface-scaffold.md](surface-scaffold.md))        | One pane: a title, a body, and footer buttons.           |
| `ListDetailDialog` ([list-detail-dialog.md](list-detail-dialog.md)) | Pick a record from a list and show its detail beside it. |
| `WorkbenchDialog` (this page)                                       | An editing task with side panels.                        |

```tsx
import { deviceClass } from "@kerfjs/ui/device-class";
import { openDialog, WorkbenchDialog } from "@kerfjs/ui/workbench-dialog";
import { wireWorkbench } from "@kerfjs/ui/wire-workbench";

const device = deviceClass();
const layersHidden = signal(false);

<WorkbenchDialog
  id="edit-slide"
  label="Edit Slide"
  title="Edit Slide"
  compact={device.value.compact}
  main={<SlideCanvas />}
  mainBottomToolbar={{ label: "Slide Actions", trailing: <SaveButtons /> }}
  leftRail={{
    label: "Layers",
    collapsed: layersHidden.value,
    toolbar: {
      label: "Layers",
      title: <ToolbarText text="Layers" />,
      toggle: { action: "toggle-layers", name: "Layers" },
    },
    content: <LayerList />,
  }}
/>;

wireWorkbench(root, {
  id: "edit-slide-workbench",
  panels: { leftRail: { collapsed: layersHidden } },
});
openDialog(document.getElementById("edit-slide"));
```

## Layout

The dialog draws no surface header and no body inset. Its body is a
`Workbench` (`<id>-workbench`):

- **The work area's toolbar** carries the dialog's primary title (an xl
  level-2 heading, id `<id>-title`) with an optional `description`, any
  `leading` groups, the `actions`, and the close control. Close stays the
  outermost trailing control, after a hidden right rail's toggle.
- **The rails** (`leftRail`, `rightRail`) keep their own toolbars, with
  default-size titles, and run the dialog's full height. A hidden rail's
  toggle relocates into the work area's toolbar.
- **The bottom** of the work area takes `mainFooter` and a
  `mainBottomToolbar` for the dialog's buttons; `bottomDrawer` adds a drawer
  under the work area.

## Compact devices

Pass `compact` from `deviceClass().value.compact`. The dialog fills the
screen, and each rail presents as an overlay over the work area instead of
narrowing it. Start the rails collapsed on compact devices; their toolbar
toggles show them. With `wireWorkbench` and each rail's `collapsed` signal,
an open rail takes focus, keeps Tab inside it, and closes on Escape or a press
outside it. Escape closes an open rail before the dialog sees it; a second
Escape closes the dialog.

## Props

- `id`, `label` (required): identity and the dialog's accessible name.
- `title` (required), `description`, `leading`, `actions`.
- `main` (required), `mainFooter`, `mainBottomToolbar`.
- `leftRail`, `rightRail`, `bottomDrawer`: `WorkbenchPanel`s.
- `compact`, `closeLabel` (default `Close`), `lightDismiss`.
- Roomy sizing: `size` (default `large`), `preferredWidth`, `height` (default
  560px), `maxHeight`, `viewportGutter`, and `mainMinSize`.
- `rootAttributes`, `className`, `slot`.

Open and close it like any dialog surface with `openDialog()` and
`closeDialog()`, which this module re-exports.
