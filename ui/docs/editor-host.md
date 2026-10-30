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
`editorFileMiddleware(root)` to its server.

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

```ts
// src/kerf-ui-registry.ts
import { OrderCard } from "./order-card.js";

export default {
  // Preview the card with sample data the document does not carry.
  "orders-app:order-card": (props: Parameters<typeof OrderCard>[0]) =>
    OrderCard({ total: 4200, ...props }),
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

- `createEditor({ catalog, document?, save?, storage?, fieldEditors? })`:
  `document` is the document to start with (default an empty Pane),
  `save(fileName, text)` replaces the default download for Save and Export,
  and `fieldEditors` registers field editors by type name (above).
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
