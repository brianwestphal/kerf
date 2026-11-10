# Editor Library preview extensions

Source: KF-RQJ15M. The Library must offer the same preview authoring mechanism to
first-party components, installed component packages and application components.

The Library grid remains a ContentItem/Grid presentation, with the component's
name as its accessible label and a decorative thumbnail. Preview registrations
add no controls, tabs, insertion settings, or Inspector fields.

Public registration is keyed by the full catalog key. A typed helper derives
sample prop and renderer context types from a literal component function map;
unknown keys and incorrect sample props fail consumer typechecks. Registration
fields are sampleProps (fresh executable props/content), render (a pure static
SafeHtml renderer), icon (Lucide IconNode fallback), and fit (contain or fill).
A registration is optional; unknown keys do not create components or tiles.

Serializable composition-catalog metadata carries only literal JSON sample props
and optional module references. It does not evaluate $param, $bind, $css, $icon,
actions, functions, promises or arbitrary JavaScript. Executable modules are
separate imports loaded only by the editor host. Local module CSS and assets
enter through normal Vite imports before thumbnails render.

Precedence is deterministic, with later whole-entry replacement:
built-in registration, serializable composition sample, catalog/package preview
module in catalog order, createEditorCatalog registration, createEditor override.
An explicit empty object removes inherited customization and restores automatic
live rendering. Built-in schematics and icons use these same entries and lookup.

A custom static renderer has first opportunity, followed by ordinary seeded live
rendering with Library-only samples. Missing, thrown or empty custom output falls
back safely. Markup with no visible geometry uses the configured icon, then the
generic component icon. For visible but unhelpful ordinary rendering, register a
schematic or a static LucideIcon renderer. Built-ins that intentionally depict an icon register a
static icon renderer through the public mechanism.

No registration changes the canonical component registry, seeded insertion data,
document defaults, canvas rendering, play mode, saved JSON or generated views.
Thumbnail sample rendering uses a fresh local registry and temporary seeded node;
JSON samples are copied and executable samples are factories.

All renderer output lives in inert, aria-hidden shadow thumbnails with static
markup only. The editor mounts or wires no interactive content there. Stylesheet
sharing, inherited theme tokens, clipped bounds, default contain fitting, and
fill-mode schematics preserve responsive presentation. Each owner cancels pending
animation frames, unobserves removed hosts, and disconnects observers on disposal.

A downstream fixture demonstrates JSON samples for an ordinary component, an
executable layout schematic, and an empty component's icon. Wide and narrow grid
captures are inspected; insertion, defaults and canvas behavior are checked apart
from thumbnail rendering. Unit, consumer type, packed type, Vite host, browser,
projection, bundle and normal UI change gates verify the complete contract.

## Public host API

```tsx
import { defineLibraryPreviews } from "@kerfjs/ui/editor";
import { OrderCard, OrderWorkspace } from "./orders.js";

export default defineLibraryPreviews({
  "orders:card": OrderCard,
  "orders:workspace": OrderWorkspace,
}, {
  "orders:card": { sampleProps: () => ({ title: "Order #1042", total: 4200 }) },
  "orders:workspace": {
    fit: "fill",
    render: ({ props }) => <svg viewBox="0 0 96 72" width="100%" height="100%" aria-hidden="true">{/* static schematic */}</svg>,
  },
});
```

Pass the resulting map to `createEditorCatalog({ libraryPreviews })` or
`createEditor({ libraryPreviews })`. `defineLibraryPreviews` uses the literal
component function map to infer each prop type; a broad runtime
`Record<string, ComponentFunction>` cannot recover those source types. Renderer
contexts contain the component `key`, display `name`, and read-only sampled
`props`. Samples and renderers are synchronous, static and pure: no setup hooks,
subscriptions or widget wiring run in a thumbnail. Each editor caches its static
thumbnail output; registrations are configuration rather than reactive state.

A composition catalog may declare:

```json
{
  "libraryPreviews": {
    "orders:card": { "props": { "title": "Order #1042", "total": 4200 } }
  },
  "libraryPreviewModule": "./editor/library-previews.js"
}
```

The Vite host resolves a relative module at the composition catalog's directory,
or resolves an installed package export there. Missing module references are
ignored; the ordinary preview and JSON samples still work. Catalog modules merge
in catalog order. The host's `libraryPreviews` option names a final override
module; omitted, it loads `src/kerf-ui-library-previews.ts` when present. A custom
host imports executable maps itself; catalog JSON never executes code. Use
factory samples for functions, models, signals or SafeHtml content.

Preview modules may import local CSS and asset URLs normally through Vite. Their
CSS loads before the editor mounts, and readable page stylesheets are shared with
thumbnail shadow roots. Theme custom properties inherit from the page. Imported
images and SVG assets use normal module URLs; intrinsic sizes avoid unnecessary
layout changes, and load/content-resize notifications refit thumbnails. This is a
Library presentation hook, not a production component registry replacement.

The real downstream example is `editor/fixtures/app/`: its composition catalog
supplies OrderCard JSON samples and names a package schematic module, while the
host's default preview module supplies OrderMarker's icon. Its custom stylesheet
and imported SVG asset demonstrate the same delivery path as installed packages.
