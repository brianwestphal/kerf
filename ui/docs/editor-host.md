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

```ts
// src/kerf-ui-registry.ts
import { OrderCard } from "./order-card.js";

export default {
  // Preview the card with sample data the document does not carry.
  "orders-app:order-card": (props: Parameters<typeof OrderCard>[0]) =>
    OrderCard({ total: 4200, ...props }),
};
```

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

- `createEditor({ catalog, document?, save? })`: `document` is the document
  to start with (default an empty Pane), and `save(fileName, text)` replaces
  the default download for Save and Export.
- `createEditorCatalog({ props, composition, selection?, components })`
  combines catalogs. Without a selection catalog a component is named by its
  export.
- `componentMap(props, modules)` maps each catalog key to
  `modules[import][export]`.

The host loads the global stylesheets and registers `popup-menu/register` and
`select/register`, as any Kerf UI app does. Give the mount element
`class="kui-app-root"` so the editor fills the window.
