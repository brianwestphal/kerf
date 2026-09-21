# Catalog — a reusable component-gallery shell

`@kerfjs/ui/catalog` is an opt-in, whole-screen shell for building a **component
catalog** — the collapsible category sidebar + titled preview stage + resources
footer that the kerf UI catalog itself uses. Point it at your own components and
you get the same shell without rebuilding it. Like the app layouts, it is a
subpath-only, tree-shakeable module that adds nothing to the main barrel.

```bash
npm install @kerfjs/ui # kerfjs is a peer; @kerfjs/ui/select/register is needed only if entries use `related`
```

- `Catalog(props)` returns the shell as `SafeHtml` (a `<main class="kui-catalog">`).
  It is **controlled and stateless**: your app owns the `active`, `collapsed`, and
  `theme` signals and computes the preview `content` from `active` in its own
  `mount()` render.
- `wireCatalog(root, options)` wires the interactions (sidebar selection, the
  related-entry popup menu, and the collapse/theme toggles) with one delegated
  listener set and returns a disposer; it can also mirror the active id into the
  URL and reveal the active sidebar row after a controlled render.

## What you supply

- **`sections`** — category-grouped entries: `{ category, entries: [{ id, name,
description?, tags?, resources?, related? }] }`. Each entry becomes a sidebar
  `ListItem` under a `ListHeader` for its category. Short `tags` render as quiet
  trailing pills for decision metadata such as `Discouraged`.
- **`content`** — the rendered preview for the active entry. Keep a map of `id →
() => SafeHtml` in your app and call `renderers[active]()` in your render.
- **`brand`** — `{ title, subtitle?, logoUrl? }` for the sidebar header.
- **`secondarySections`** — an optional secondary "ecosystem" group shown below the
  primary sections with a quieter treatment: `{ label, sections, collapsible?,
expanded? }`. When `collapsible`, the label is a disclosure toggle controlling
  `expanded` (the app owns it; wire it with `wireCatalog`'s `onToggleSecondary`).
- Optional slots: `headerActions` (extra header controls), `sidebarFooter` (extra
  sidebar content), and `status` (a footer status line).

Per-entry `resources` render as "open in new tab" links in the footer, and
`related` renders a "Related entries" popup menu — a `single` `ToolbarControlGroup`
around a `wa-dropdown` (grouped by each entry's `group`), so register its elements
with `@kerfjs/ui/select/register` when you use it.

## Catalog demo authoring contract

This section is the single authoritative contract for tools and people that
author Catalog previews. The machine-readable discovery entry is
[`catalog-authoring.json`](../ai/catalog-authoring.json); exact props remain in
[`public-api-signatures-v1.md`](../ai/public-api-signatures-v1.md#kerfjsuicatalog).
The component catalog deliberately does not duplicate these rules: it describes
which component to choose, while this contract describes how to present the
chosen component.

### Choose the demo mode

Classify every entry before rendering it:

| Entry kind            | Preview purpose                                                         | Geometry overlay                                                                    |
| --------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Focused component     | Show one public component, its meaningful variants, and adverse states. | `true`; the overlay inspects each selected specimen.                                |
| Composition or recipe | Show several components cooperating as one product surface.             | `false`; child geometry remains unmarked so the composition can be read as a whole. |

Keep `geometryOverlay` present and compute it from the active entry. Do not make
it a permanent catalog-wide `true`, and do not give individual specimens their
own overlay implementation.

### Required structure

- `Catalog` is the one shell. The app owns active-entry state and passes one
  active preview through `content`.
- `CatalogExampleStack` is the group for one preview's rows. Put route/test
  metadata such as `data-demo` on its rendered root through `rootAttributes`.
- `CatalogExample` is one row: optional generated `ListHeader` label, optional
  generated note, then one specimen or one intentionally coupled specimen
  cluster. Use one row per variant/state; do not hand-author the helper's private
  classes.
- The specimen is an immediate child of `CatalogExample`. A focused component
  row should place the component root there, without a decorative card or
  spacing wrapper. A composition row may place the composition root there.

Use `align="glyph"` for a bare glyph/text specimen, `align="inline-control"`
for a control whose own inline padding contributes about 8px, and `align="none"`
(the default) for a content item or composition that owns its geometry.

```tsx
import { CatalogExample, CatalogExampleStack } from "@kerfjs/ui/catalog";

const buttonPreview = (
  <CatalogExampleStack
    label="Button variants"
    rootAttributes={{ "data-demo": "button" }}
  >
    <CatalogExample label="Icon" note="A bare glyph." align="glyph">
      <LucideIcon icon={Plus} name="plus" />
    </CatalogExample>
    <CatalogExample label="Control" align="inline-control">
      <SegmentedControl id="view" label="View" value="list" choices={choices} />
    </CatalogExample>
    <CatalogExample
      label="Authoring note"
      note="Explanatory chrome is not a specimen."
      rootAttributes={{ "data-catalog-geometry-overlay-skip": "" }}
    >
      <p>Use the public helper contract.</p>
    </CatalogExample>
  </CatalogExampleStack>
);
```

The overlay selects every immediate child of a `CatalogExample` except the
helper-generated label and note. It does not recursively promote a nested child
to be the specimen. Outside an example row, it selects only top-level
`[data-component]` roots in the canvas and ignores nested component descendants.
These rules keep a row's label/group scaffolding out of the measurement and make
the authored nesting determine exactly what is inspected.

### Metadata ownership

Use `rootAttributes` on either helper for authoring metadata such as `data-demo`
or `data-catalog-geometry-overlay-skip`; the metadata lands on that helper's
rendered root. The slot accepts only `data-*` strings. Structural
`data-catalog-example`, `data-catalog-example-stack`, and `data-align` semantics
remain helper-owned and are rejected case-insensitively at runtime, including
from structurally widened or JavaScript objects. Do not copy the helpers'
private `kui-catalog-*` classes into preview markup.

The app owns entry ids, `kind`, routing, sources, relationships, and test hooks.
The helpers own their structural markers, label/note anatomy, alignment marker,
and private classes. Component metadata such as margin/border/padding ownership
lives in `component-catalog.json`; do not infer or overwrite it from overlay
pixels.

### Geometry overlay and legend

Pass the conditional `geometryOverlay` boolean to `Catalog`, then call
`wireCatalogGeometryOverlay(root)` once after the first render and retain its
disposer alongside `wireCatalog`'s.

| Overlay mark            | Meaning                                                                                              | It is not                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Orange translucent band | A positive computed margin on the selected specimen, after subtracting the helper's alignment inset. | Padding, gap, or empty content. Zero and negative margins are not drawn.               |
| Quiet dashed outline    | The border-box outer bound of a selected specimen whose computed background is transparent.          | A real CSS border, focus ring, padding edge, or proof that the specimen owns its size. |

The overlay does not visualize padding, borders, gaps, negative/zero margins,
scroll overflow, hit targets, nested descendants, or geometry ownership. Inspect
computed styles and the machine-readable `geometry` metadata for those facts.
Opaque specimens do not receive the transparent-bound outline.

```tsx
<Catalog
  {...props}
  geometryOverlay={activeEntry.kind === "component"}
  content={renderers[active.value]()}
/>
```

Put `rootAttributes={{ "data-catalog-geometry-overlay-skip": "" }}` on a
`CatalogExample` or `CatalogExampleStack` only when that whole subtree is
explanatory chrome rather than a specimen. The marker excludes the marked root
and every descendant from selection; it does not merely hide one band. It is
normally unnecessary in a composition because the active entry already sets the
global overlay to `false`.

Use the overlay together with machine-readable geometry ownership metadata; the
overlay verifies what is rendered, while metadata tells people and AI tools
whether the component, its parent, or its children are responsible for margin,
border, and padding. Catalogs for downstream components should conform to the
[`component-catalog-extension.schema.json`](../ai/component-catalog-extension.schema.json)
contract and can start from the checked
[`component-catalog-extension.json`](./examples/component-catalog-extension.json)
example; provide those entries beside Kerf's shipped catalog to AI tools.

## Selection reveal

Set `revealSelection: true` on `wireCatalog` for a long desktop sidebar. After
`onSelect` updates controlled state, the helper waits one animation frame, finds
the exact matching `data-item-id`, and scrolls it into view without changing
focus. A newer selection or disposal cancels the pending reveal. The default
media guard is the Catalog desktop layout (`min-width: 52.01rem`), so compact
layouts keep their existing scroll position.

Pass an options object instead of `true` to customize `block`, `inline`,
`behavior`, or `media`; `media: false` deliberately enables the behavior at all
sizes. For an initial deep link that did not come through `wireCatalog`, call
`revealCatalogEntry(app, initialId, { block: "center" })` after the first mount.

## Complete example

```tsx
import { mount, signal, type SafeHtml } from "kerfjs";
import {
  Catalog,
  CatalogExample,
  CatalogExampleStack,
  type CatalogSection,
} from "@kerfjs/ui/catalog";
import {
  revealCatalogEntry,
  wireCatalog,
  wireCatalogGeometryOverlay,
} from "@kerfjs/ui/wire-catalog";
import "@kerfjs/ui/styles.css"; // or import each primitive's CSS + @kerfjs/ui/catalog.css

type DemoKind = "component" | "composition";
type DemoEntry = CatalogSection["entries"][number] & { kind: DemoKind };

// 1. Describe selection and overlay mode once.
const entries: DemoEntry[] = [
  {
    id: "button",
    name: "Button",
    kind: "component",
    description: "A pressable control.",
    resources: [
      { label: "Source", href: "/src/button.tsx", detail: "src/button.tsx" },
    ],
  },
  {
    id: "profile-form",
    name: "Profile form",
    kind: "composition",
    description: "A labeled field and save action working together.",
  },
];
const sections: CatalogSection[] = [
  {
    category: "Examples",
    entries: entries.map(({ kind: _kind, ...entry }) => entry),
  },
];

// 2. Every preview uses one public group and public example rows.
const renderers: Record<string, () => SafeHtml> = {
  button: () => (
    <CatalogExampleStack
      label="Button states"
      rootAttributes={{ "data-demo": "button" }}
    >
      <CatalogExample label="Default" align="inline-control">
        <Button label="Save" />
      </CatalogExample>
      <CatalogExample
        label="Authoring note"
        note="This explanatory row is deliberately excluded from inspection."
        rootAttributes={{ "data-catalog-geometry-overlay-skip": "" }}
      >
        <p>The application owns product copy and actions.</p>
      </CatalogExample>
    </CatalogExampleStack>
  ),
  "profile-form": () => (
    <CatalogExampleStack
      label="Profile form composition"
      rootAttributes={{ "data-demo": "profile-form" }}
    >
      <CatalogExample label="Complete composition">
        <ProfileForm />
      </CatalogExample>
    </CatalogExampleStack>
  ),
};

// 3. App-owned state (domain: which entry; transient: collapsed; global: theme).
const initial =
  new URLSearchParams(location.search).get("c") ?? sections[0].entries[0].id;
const active = signal(initial);
const collapsed = signal(false);
const theme = signal<"light" | "dark">("light");
const activeEntry = () => entries.find(({ id }) => id === active.value) ?? entries[0];

const app = document.getElementById("app")!;
mount(app, () => (
  <Catalog
    brand={{ title: "Acme UI", subtitle: "Design system" }}
    sections={sections}
    active={active.value}
    content={renderers[active.value]?.() ?? <></>}
    collapsed={collapsed.value}
    theme={theme.value}
    geometryOverlay={activeEntry().kind === "component"}
  />
));

wireCatalog(app, {
  onSelect: (id) => {
    active.value = id;
  },
  onToggleSidebar: () => {
    collapsed.value = !collapsed.value;
  },
  onToggleTheme: () => {
    theme.value = theme.value === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme.value; // apply your theme however you like
  },
  urlParam: "c", // mirror the active id into ?c=<id>
  revealSelection: true, // reveal long desktop sidebars without moving focus
});
wireCatalogGeometryOverlay(app);

// Optional for an initial deep link whose row may start outside the viewport.
revealCatalogEntry(app, initial, { block: "center" });
```

## Ownership boundary

`Catalog` renders the shell; the app owns everything stateful:

- **`active`** is domain state (which entry is shown) — the app's signal, updated in
  `onSelect`, read to compute `content`.
- **`collapsed`** is transient UI — the app's signal, flipped in `onToggleSidebar`.
- **`theme`** is a global preference — the app's signal; `wireCatalog` only reports
  the toggle, the app applies the theme (the shell reads `theme` to show the toggle's
  opposite-state label). Omit `theme` to hide the toggle entirely.

## Custom action names

The shell emits `data-action="catalog-select"` (sidebar items),
`catalog-toggle-sidebar`, and `catalog-toggle-theme`. Override them with
`selectAction` / `toggleSidebarAction` / `toggleThemeAction` on `Catalog` (and the
matching options on `wireCatalog`) if they collide with your own action table.

## CSS

`Catalog` composes public primitives (`Toolbar`, `ListHeader`, `ListItem`, `Select`,
…). Import `@kerfjs/ui/styles.css` for the whole layer, or `@kerfjs/ui/catalog.css`
plus each composed primitive's CSS. The shell is theme-aware and responsive: it
stacks the sidebar above the detail below ~832px and hides it when collapsed.
