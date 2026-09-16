# Split view (list-detail)

`@kerfjs/ui/split-view` is a list-detail layout: a list and a
detail side by side on roomy screens, collapsing to a `NavStack` (list → detail)
on compact ones. One of the opt-in app layouts (see
[`../../docs/23-app-layouts.md`](../../docs/23-app-layouts.md)).

```ts
import { SplitView } from '@kerfjs/ui/split-view';
import { deviceClass } from '@kerfjs/ui/device-class';
import '@kerfjs/ui/split-view.css';
// plus nav-stack.css when the compact path is reachable, and
// wireResizableRegions / wireNavStack for the interactive behavior.
```

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

Compose the interactive wiring from the existing helpers — `SplitView` adds no
wire of its own.
