# Editor host

The Kerf UI editor edits view documents (`*.kui.json`; see
[`docs/26-ui-editor.md`](../../docs/26-ui-editor.md)). It ships in two forms:

- **`@kerfjs/ui/vite-editor`**: a Vite plugin that runs the editor inside your
  application's own dev server, so your components preview with their real
  functions, CSS, and aliases.
- **`@kerfjs/ui/editor`**: the editor module itself, for a host that builds
  its own page.

## Run it in your app

```ts
// vite.config.ts
import { kerfUiEditor } from "@kerfjs/ui/vite-editor";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [kerfUiEditor()],
});
```

Start the dev server and open `/__kerf-ui-editor/`. The plugin runs only on
the dev server; a production build never includes it.

The editor saves every change through the dev server. Until you choose a path
with **Save As…**, a document autosaves as a draft in `.kerf-ui-editor/drafts/`
at your project root; that folder holds its own `.gitignore`, so drafts never
reach git. After Save As, changes save to the `.kui.json` path you chose, and
the editor reopens it on your next visit. The plugin's file endpoint
(`/__kerf-ui-editor/api/file`) reads and writes only `.kui.json` files inside
the project, outside `node_modules` and `.git`, and only for requests the
editor itself makes. A host that mounts the editor itself passes
`createEditor({ catalog, storage: devServerStorage() })` and adds
`editorFileMiddleware(root)` to its server. The same middleware lists the
project's documents (GET `/__kerf-ui-editor/api/files`: every `.kui.json`
outside `node_modules`, `dist`, `test-results`, and dot-folders), which
Add a child's **Existing document…** offers in a picker.

The editor offers Kerf UI's components and every component your
`.kerf-ui-profile.json` declares a catalog for. Generate your package's
`component-props.json` with `kerf-ui-props --write` and name it beside your
composition catalog:

```json
{
  "schemaVersion": 1,
  "scope": "workspace",
  "catalogs": [
    {
      "package": "orders-app",
      "composition": {
        "path": "./component-composition.json",
        "schemaVersion": 1
      },
      "props": { "path": "./component-props.json", "schemaVersion": 1 }
    }
  ]
}
```

Each component previews with the function its catalog entry names (`import`
and `export`), including components that live in your app's source. Your
components appear under **Application** in the palette, and adding one lists
your package in the document's `catalogs`. A component whose function cannot
be found previews as a labeled placeholder rather than failing the canvas.

Options:

- `route`: where the editor is served (default `/__kerf-ui-editor/`).
- `registry`: a module, resolved against Vite's `root`, whose default export
  maps catalog keys to component functions, to add or replace the ones the
  catalogs provide. Default: `src/kerf-ui-registry.ts` when it exists.
- `fieldEditors`: a module, resolved the same way, whose default export maps
  type names to field editors (below). Default:
  `src/kerf-ui-field-editors.ts` when it exists.
- `devicePresets`: a module, resolved the same way, whose default export is
  play mode's device presets (see Play mode). Only loaded when named.
- `playHandlers`: a module, resolved the same way, whose default export maps
  action names to play mode's mock handlers (see Play mode). Only loaded
  when named.

```ts
// src/kerf-ui-registry.ts
import { CustomOrderCard } from "./custom-order-card.js";

export default {
  // Replace the real function, including canvas and play rendering.
  // Use libraryPreviews below for Library-only sample data.
  "orders-app:order-card": CustomOrderCard,
};
```

## Field editors for your types

The Inspector edits an object prop in a form built from its type, a list of
objects item by item, strings as tags, and icon data in a picker. To edit one
of your types your own way, register a field editor for its name, a props
catalog definition such as `ShippingWindow`. It replaces the type-driven form
wherever a prop or field has that type, and Edit as JSON, Reset, and Fill
with example stay around it.

```tsx
// src/kerf-ui-field-editors.tsx (name it with the plugin's `fieldEditors`
// option; the default path is src/kerf-ui-field-editors.ts)
import { Button } from "@kerfjs/ui/button";
import type { FieldEditors } from "@kerfjs/ui/editor";
import { List } from "@kerfjs/ui/list";

const fieldEditors: FieldEditors = {
  ShippingWindow: {
    render: (context) => (
      <List>
        <List controlInsets="trbl" gap>
          <Button
            action={context.setAction}
            rootAttributes={context.set({ from: "Mon", to: "Fri" })}
          >
            This week
          </Button>
        </List>
        {context.form()}
      </List>
    ),
  },
};

export default fieldEditors;
```

`render(context)` receives:

- `value`, `type`, and `definitions`: the value being edited and its type.
- `commit(next)`: writes the next value as one undoable edit (`undefined`
  unsets it).
- `setAction` and `set(next)`: a button with that `action` and those
  `rootAttributes` sets the value to `next`.
- `control(path, kind)`: attributes for your own control (a `TextField`'s
  `rootAttributes`, or a native input) that commits the field at `path` on
  `change`, read as `text`, `number`, `switch`, `select`, or `list` (JSON).
- `form(path?)`: the type-driven form for the value, or for the object at
  `path` inside it.

A field editor may also name its `container` (`'subview'`, pushed in the
Inspector, or `'dialog'`; the default rule pushes at most 10 fields) and a
`wire(root, context)` that wires its own events once, reads the open value's
context with `context()`, and returns a disposer.

## Build your own host

```ts
import "@kerfjs/ui/document.css";
import "@kerfjs/ui/styles.css";
import "@kerfjs/ui/layout.css";
import "@kerfjs/ui/workbench.css";
import "@kerfjs/ui/editor.css";
import "@kerfjs/ui/popup-menu/register";
import "@kerfjs/ui/select/register";

import selection from "@kerfjs/ui/ai/component-catalog.json";
import composition from "@kerfjs/ui/ai/component-composition.json";
import props from "@kerfjs/ui/ai/component-props.json";
import * as button from "@kerfjs/ui/button";
import {
  componentMap,
  createEditor,
  createEditorCatalog,
} from "@kerfjs/ui/editor";
import { mount } from "kerfjs";

const catalog = createEditorCatalog({
  props: [props],
  composition: [composition],
  selection: [selection],
  // Catalog key → component function, from the modules the catalog names.
  components: componentMap([props], { "@kerfjs/ui/button": button }),
});
const root = document.getElementById("editor")!;
const editor = createEditor({ catalog });
mount(root, editor.render);
editor.wire(root);
```

- `createEditor({ catalog, document?, save?, storage?, fieldEditors?, devicePresets?, playHandlers? })`:
  `document` is the document to start with (default an empty document
  with no root, whose canvas asks for the first component),
  `save(fileName, text)` replaces the default download for Save and Export,
  `fieldEditors` registers field editors by type name (above), and
  `devicePresets` adds play mode's devices and `playHandlers` its mock
  action handlers (below). `storage` (an `EditorStorage`, `read(path)` and
  `write(path, text)` by project path) also loads the documents a `#view`
  composes, so the canvas renders them and Problems validates against them;
  without it a `#view` previews as a placeholder. An optional `list()`
  answers the project's documents as project-relative `.kui.json` paths;
  with it, Add a child's **Existing document…** inserts one as a `#view`
  from a picker, and without it that choice asks for a path. With it, the
  Library also lists those documents after its components, to insert by
  click or drag.
  `devServerStorage(api?, listApi?)` implements all three over the dev
  server (`EDITOR_FILE_API`, `EDITOR_LIST_API`).
- `createEditorCatalog({ props, composition, selection?, components, placeholders? })`
  combines catalogs. Without a selection catalog a component is named by its
  export. `placeholders` maps `<component key>.<prop>` to a factory for the
  canvas's stand-in for an app-supplied prop (a function or a model) that a
  document takes through a prop-typed param, such as
  `"orders-app:order-list.renderRow": () => (order) => OrderRow({ order })`.
  They add to and replace Kerf UI's own.
- `componentMap(props, modules)` maps each catalog key to
  `modules[import][export]`.

The host loads the global stylesheets and registers `popup-menu/register` and
`select/register`, as any Kerf UI app does. Give the mount element
`class="kui-app-root"` so the editor fills the window.

## Play mode

**Play** in the Canvas toolbar runs the document as its users would, in a
frame at a phone-sized viewport, scaled down to fit when the window is
smaller. **Done**, or Escape while focus is outside
the frame, returns to editing with the selection as it was. The frame loads
your editor page again with a `?kerf-ui-play` query, and `createEditor`
returns the player on that page instead of the editor, so a host needs no
extra route or code. The player gets the document from its editor by
same-origin `postMessage`. Your host's page must keep `createEditor`,
`mount`, and `wire` unconditional, and serve the same page for that query.
Inside the frame, the components run with their real wiring. Each NavStack
starts at its first view, as an app launches; your mock handlers push the
rest (below). Tabs switch and close, a NavStack's back pops, regions and
Workbench panels resize, a SplitView collapses on a phone-sized device
and pushes its detail from a row, value controls (switches, selects,
sliders, segmented controls, chips, and the rest) keep what you set, a
repeated tab selects for its own row (and a control inside a repeated
row keeps its own row's value), and Workbench rails and sidebars collapse, all on a
play-time copy of the document. Nothing you do in play mode changes the
document.

The play bar picks the device: phones, tablets, laptops and desktops, and
Flexible (a width and height you type or drag). Phones and tablets rotate
and have an **Installed app** toggle. Off, the view runs as a browser tab:
the device's safe areas are outside the page, as with the default
`viewport-fit`. On, the view fills the device and gets its safe areas
through Kerf UI's `--kui-safe-area-*` tokens, so components that claim safe
areas lay out as on the device. **Scale** is Fit (the default, never larger
than 100%) or a fixed percentage, which may overflow and scroll the stage.
The view sits in a generic mock of the device. The **Device frame** toggle hides it without changing the layout. The frame's viewport is always the device's, so media queries and
`deviceClass()` inside it answer for that device. Touch input, pixel
density, and the on-screen keyboard aren't emulated, as the device menu notes.
The editor remembers the choice per browser.

Add your own devices with `createEditor({ devicePresets })`, or the Vite
plugin's `devicePresets` module. An array adds presets, replacing a shipped
one with the same `id`; a function receives the shipped list
(`SHIPPED_DEVICE_PRESETS`) and returns the whole list.

```ts
// src/kerf-ui-devices.ts (name it with the plugin's `devicePresets` option)
import type { DevicePreset } from "@kerfjs/ui/editor";

const devices: DevicePreset[] = [
  {
    id: "kiosk",
    label: "Store kiosk",
    kind: "tablet",
    width: 1080,
    height: 1920,
    safeArea: {
      portrait: { top: 0, right: 0, bottom: 0, left: 0 },
      landscape: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    frame: "tablet",
  },
];
export default devices;
```

A preset's sizes are CSS pixels in portrait. `safeArea` is the insets an
installed app gets per orientation; `browserChrome`, when given, is what a
browser tab's chrome takes instead (it defaults to the safe areas).

The view's actions (the names its `$action`s give) call your mock handlers
when you register them, so a flow such as "row opens its detail" can be
walked end to end. Pass `createEditor({ playHandlers })`, or name a module
with the Vite plugin's `playHandlers` option. The handlers run inside the
play frame.

```ts
// src/kerf-ui-play-handlers.ts (name it with the plugin's `playHandlers` option)
import type { PlayHandlers } from "@kerfjs/ui/editor";

const playHandlers: PlayHandlers = {
  "open-order": ({ view }) => {
    view.setParams({ selectedId: view.key ?? "" });
    view.navStack("orders")?.push("order");
  },
};
export default playHandlers;
```

A handler receives `{ action, nodeId, event, params, view }`:

- `params` holds the view's current param values.
- `view.key` is the row's `data-key`.
- `view.setParams(values)` re-renders the view with new values.
- `view.navStack(name)` finds a NavStack by its author name, `id`, or node
  id. Its `push(viewKey)` shows one of the document's views for that stack,
  and `pop()` goes back one.

A handler may also open an overlay. A handler that throws (or rejects) is
logged, and the view keeps running. An action with no handler is only
logged. The play bar's **Action log** counts the actions you haven't seen
and lists them, newest first, with whether a handler ran.

## Project TypeScript parameters

The Params rail opens a text editor in a dialog. Its completions and live errors
come from the owning project's TypeScript configuration and source exports.
A unique exported name is saved as a portable inline `import()` type. Formatting
runs on blur, and the dialog's NavStack explores object fields, array items and
union members. Define new named types in application source.

`devServerStorage()` includes the project compiler transport. The plugin serves
`KERF_UI_EDITOR_TYPES_API` (`/__kerf-ui-editor/api/types`), a JSON POST endpoint
requiring `X-Kerf-UI-Editor: 1`. Requests name a project-relative `.kui.json`
source. Analysis requests carry `{ action: "analyze", source, text, cursor? }`;
validation requests carry `{ action: "validate", source, document }`. The server
uses TypeScript's Node API; compiler code never enters the browser bundle.

A custom host can pass `createEditor({ typeService })`, a `ProjectTypeService`
function that answers the same typed requests. Export of compiler-backed
parameters waits for whole-document checking against actual generated bindings
and defaults. An unavailable compiler or a failed check prevents that export.
Legacy parameter descriptors continue to work without a compiler service.

## Library-only component previews

Use `defineLibraryPreviews` from `@kerfjs/ui/editor` with a literal map of your
component functions. It checks each catalog key and each sample prop against the
component's real interface:

```tsx
import "./library-previews.css";
import { defineLibraryPreviews } from "@kerfjs/ui/editor";
import { MapPin } from "lucide";
import { OrderCard, OrderWorkspace, OrderMarker } from "./orders.js";

export default defineLibraryPreviews({
  "orders:card": OrderCard,
  "orders:workspace": OrderWorkspace,
  "orders:marker": OrderMarker,
}, {
  "orders:card": { sampleProps: () => ({ title: "Order #1042", total: 4200 }) },
  "orders:workspace": { render: () => <svg viewBox="0 0 96 72" width="100%" height="100%" aria-hidden="true">{/* schematic */}</svg>, fit: "fill" },
  "orders:marker": { icon: MapPin },
});
```

Pass that map through `createEditorCatalog({ libraryPreviews })` or
`createEditor({ libraryPreviews })`. For Vite, put its default export in
`src/kerf-ui-library-previews.ts`, or name a module with
`kerfUiEditor({ libraryPreviews: "src/library-previews.tsx" })`. Installed package
composition catalogs may name their editor-only ESM module with
`libraryPreviewModule` (relative to the catalog or an installed package export).
Their `libraryPreviews` JSON field contains only `{ props: { ...literalJSON } }`
entries by component key. JSON does not evaluate `$param`, `$css`, `$icon`,
functions or JavaScript. Use executable factory samples for SafeHtml content,
functions, models or signals. A custom host imports executable maps explicitly.

Precedence is built-ins, catalog JSON samples, package modules in catalog order,
catalog host overrides, then editor host overrides. Later registrations replace
whole entries; `{}` restores automatic live rendering. A static renderer runs
before ordinary seeded rendering, with sampled props. Thrown, undefined, invalid
or empty renderer results fall back to ordinary rendering; incompatible samples
retry ordinary props. Visually empty markup shows the configured icon or the
generic component icon. For visible but unhelpful ordinary output, supply a
schematic or a static LucideIcon renderer. `fit: "contain"` is the default;
`"fill"` is for schematics authored to occupy the complete 4:3 tile.

Factories/renderers are synchronous, pure and static; thumbnail output is cached
per editor. No widgets are mounted or wired there. Output stays inert and hidden
from accessibility APIs inside an isolated shadow root; the tile itself keeps the
component's accessible name. Import preview CSS and assets from the module as
usual: readable page stylesheets are shared into thumbnails, inherited theme
variables remain available, and asset load/content resize events refit them.
Samples and overrides never alter document defaults, inserted nodes, canvas or
play rendering, or generated production views. The `registry` option continues
to replace real component functions; use `libraryPreviews` for Library-only data.
