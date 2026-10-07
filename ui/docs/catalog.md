# Catalog — a reusable component-gallery shell

`@kerfjs/ui/catalog` is an opt-in, whole-screen shell for building a **component
catalog** — the collapsible category sidebar + titled preview stage + resources
footer that the kerf UI catalog itself uses. Point it at your own components and
you get the same shell without rebuilding it. Like the app layouts, it is a
subpath-only, tree-shakeable module that adds nothing to the main barrel.

The shell is a [`Workbench`](workbench.md) built entirely from `@kerfjs/ui`
components: the sidebar is its left rail and the active entry its work area. So
the sidebar behaves like any Workbench rail — its standard toggle moves into the
entry toolbar while it is collapsed, and on a small screen (a Workbench narrower
than 704px) it overlays the stage, one tap from the entry toolbar, filling the
width less a 44px strip that closes it, instead of squeezing the stage. Pass the
app's `collapsed` signal to `wireCatalog` so that overlay closes on Escape, on a
press outside, and when an entry is chosen from it.

```bash
npm install @kerfjs/ui # kerfjs is a peer; @kerfjs/ui/select/register is needed only if entries use `related`
```

- `Catalog(props)` returns the shell as `SafeHtml` (a `<main class="kui-catalog">`).
  It is **controlled and stateless**: your app owns the `active`, `collapsed`, and
  `theme` signals and computes the preview `content` from `active` in its own
  `mount()` render.
- `wireCatalog(root, options)` wires the interactions (sidebar selection, the
  related-entry popup menu, the built-in sidebar filter, and the collapse/theme
  toggles) with one delegated listener set and returns a disposer; it can also
  mirror the active id into the URL and reveal the active sidebar row after a
  controlled render.

## What you supply

- **`sections`** — category-grouped entries: `{ category, entries: [{ id, name,
description?, tags?, resources?, related? }] }`. Each entry becomes a sidebar
  `ListItem` under a `ListHeader` for its category. Short `tags` render through
  the row's quiet status treatment for decision metadata such as `Discouraged`.
- **`content`** — the rendered preview for the active entry. Keep a map of `id →
() => SafeHtml` in your app and call `renderers[active]()` in your render.
- **`backgroundStyle`** — the preview stage backdrop: `checkerboard` (default,
  8px squares),
  `vertical-stripes` (alternating 8px bands), `surface`, or `sunken`. The two
  patterned choices reveal transparent specimen edges; `surface` paints an
  opaque backdrop. `sunken` leaves the stage
  transparent so the main Pane's semitransparent sunken surface paints only once.
  A controlled app may pass its current choice on each render.
- **`brand`** — `{ title, subtitle?, logoUrl? }` for the sidebar header. The
  optional logo paints through `ToolbarControlGroup.avatarImage`.
- **`secondarySections`** — an optional secondary "ecosystem" group shown below the
  primary sections with a quieter treatment: `{ label, sections, collapsible?,
expanded? }`. When `collapsible`, the label is a disclosure toggle controlling
  `expanded` (the app owns it; wire it with `wireCatalog`'s `onToggleSecondary`).
- Optional slots: `headerActions` (extra header controls), `sidebarFooter` (extra
  sidebar content), and `status` (a footer status line).

The sidebar includes a `TokenSearchField` in its fixed header for every Catalog
consumer, so the filter remains visible while the entries scroll. `wireCatalog`
filters entry names and section headings as text is typed,
ignoring case. A heading match shows all its entries; a matching secondary
group heading searches its sections too, even while that group is collapsed.
Empty sections disappear and an empty-result message appears when nothing
matches. The query survives controlled Catalog rerenders and clears through the
field's clear action. Filtering does not change the selected
entry or its preview.

Per-entry `resources` render as "open in new tab" links in the footer, and
`related` renders a "Related entries" `PopupMenu` in a `single`
`ToolbarControlGroup` (grouped by each entry's `group`), so register its elements
with `@kerfjs/ui/popup-menu/register` when you use it.

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

| Entry kind      | Preview purpose                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **Component**   | Show one public component, its meaningful variants, and adverse states.                                 |
| **Composition** | Show components commonly used together in one focused container or surface.                             |
| **Recipe**      | Teach the recommended production approach to a specific task, including ownership and application glue. |

These three kinds are exhaustive. Theme/foundation showcases use a functional
category, third-party specimens use source metadata, and state galleries retain
the kind of the thing they demonstrate; none needs another demo kind.

Organize the catalog by functional group, with groups in descending product
importance. Within every group, list all component demos before all composition
demos. Order each kind by descending importance where a meaningful distinction
exists, then alphabetically by display name to break ties. Put recipes after all
component/composition groups, ordered by the same importance-then-alphabetical
rule. Treat source order as the authored importance order when no explicit rank
field exists. Show a `Composition` tag rather than repeating the word in a
composition's display name; the generic `Catalog` accepts that through the
entry's `tags` array.

### Required structure

- `Catalog` is the one shell. The app owns active-entry state and passes one
  active preview through `content`.
- `CatalogExampleStack` is the group for one preview's rows. Put route/test
  metadata such as `data-demo` on its rendered root through `rootAttributes`.
  Pass `label` when the stack needs an accessible name: the rendered `section`
  is then exposed as a named region. An unlabeled stack remains an ordinary
  grouping rather than adding an unnecessary landmark.
- `CatalogExample` is one row: optional generated `ListHeader` label, optional
  generated note, then one specimen or one intentionally coupled specimen
  cluster. Use one row per variant/state; do not hand-author the helper's private
  classes.
- Focused demos do not import local stylesheets, use inline `style`, or invent
  styling-only `demo-*` classes. Prefer a public Kerf component, then a Web
  Awesome surface when Kerf has no equivalent, then ordinary semantic HTML.
  Use `CatalogExample.viewport` for bounded specimen width, height, frame,
  surface, overflow, responsive visibility, and public custom-property values;
  keep those constraints catalog-owned instead of recreating a demo stylesheet.
  Component heights run `short` (220px) through `tall` (360px); frame an app
  shell, whole-screen layout, or other application-sized recipe with
  `height: "app"` (592px), and give its root `fill` rather than a frame `Pane`.
  An app frame stands in for the screen: it is the containing block for
  screen-fixed chrome, so a compact `CollapsiblePanel` overlay, its backdrop,
  and restore controls dock to the frame's edges rather than the page's.
- The specimen is an immediate child of `CatalogExample`. A focused component
  row should place the component root there, without a decorative card or
  spacing wrapper. A composition row may place the composition root there.

Use `align="glyph"` for a bare glyph/text specimen, `align="inline-control"`
for a control whose own inline padding contributes about 8px, and
`align="text-trigger"` for a Web Awesome dropdown's text trigger whose visible
label needs an 8px inset (such as a plain `PopupMenu` trigger). The dropdown host
has no layout box, so this inset applies to its button child. Use
`align="none"` (the default) for a content item or composition that owns its
geometry.

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
    <CatalogExample label="Authoring note" note="Explain the specimen below.">
      <p>Use the public helper contract.</p>
    </CatalogExample>
  </CatalogExampleStack>
);
```

### Metadata ownership

Use `rootAttributes` on either helper for authoring metadata such as `data-demo`;
the metadata lands on that helper's
rendered root. The slot accepts only `data-*` strings. Structural
`data-catalog-example`, `data-catalog-example-stack`, and `data-align` semantics
remain helper-owned and are rejected case-insensitively at runtime, including
from structurally widened or JavaScript objects. Do not copy the helpers'
private `kui-catalog-*` classes into preview markup.

The app owns entry ids, `kind`, routing, sources, relationships, and test hooks.
`Catalog.stageRootAttributes` places app-owned `data-*` state on the
catalog-owned preview stage without an extra wrapper; `data-catalog-stage`
remains protected.
The stage is the main Pane's direct scrolling content, owns an 8px inset, and
grows with tall specimens. The main Pane keeps its sunken appearance without a
deep inset.
The helpers own their structural markers, label/note anatomy, alignment marker,
and private classes. Component metadata such as margin/border/padding ownership
lives in `component-catalog.json`.

### Component metadata

Machine-readable geometry ownership metadata identifies whether the component,
its parent, or its children are responsible for margin, border, and padding.
Keep that metadata in `component-catalog.json` and use the rendered specimen to
review the actual appearance.

Catalogs for downstream components should conform to the
[`component-catalog-extension.schema.json`](../ai/component-catalog-extension.schema.json)
contract and can start from the checked
[`component-catalog-extension.json`](./examples/component-catalog-extension.json)
example; provide those entries beside Kerf's shipped catalog to AI tools.
An extension entry may declare `uses` with direct Kerf or extension entry ids,
plus repository-relative `source` and `demoSource` paths. Keep the ids unique
and resolvable across both catalogs; paths use `/` separators and cannot
traverse outside the repository. These fields let consumer demos derive source
links and composition relationships from the catalog.

For a consumer UX demo, `@kerfjs/ui/catalog-projection` exports
`projectConsumerCatalog(extension, kerfCatalog, options)` and
`projectCatalogEntries(entries, options)`. The projection maps `purpose` to
`description`, `uses` to related-entry ids, `source` to `componentSource`, and
`demoSource` to the demo source link. It defaults the source identity to
`consumer` and category to `Application`. Explicit paths in an extension entry
take precedence over templates. Template placeholders are `{id}`, `{name}`,
`{kind}`, and `{package}`. Design templates are omitted unless configured.

The package also ships `kerf-catalog-demo` for a committed TypeScript module:

```sh
kerf-catalog-demo --extension ai/component-catalog-extension.json \
  --out ux-demo/catalog.generated.ts \
  --repo-base https://github.com/acme/app/blob/main/ \
  --source-template 'src/{id}.tsx' \
  --demo-template 'ux-demo/demos/{id}.tsx' --write
kerf-catalog-demo --extension ai/component-catalog-extension.json \
  --out ux-demo/catalog.generated.ts \
  --repo-base https://github.com/acme/app/blob/main/ \
  --source-template 'src/{id}.tsx' \
  --demo-template 'ux-demo/demos/{id}.tsx' --check
```

The command uses the Kerf catalog shipped with the package to resolve `uses`;
`--kerf-catalog` selects another catalog file. `--category`,
`--documentation-template`, and `--design-template` configure optional row
fields. `--check` fails if the generated file is missing or stale. The output
exports `generatedConsumerCatalog` and `catalogRepositoryBlobUrl`; the latter
is normalized to a trailing slash for source and documentation links.

### Automated conformance and reviewed exceptions

Run `npm run check:demo-conformance` after changing a first-party demo, its
catalog kind, or the shell's overlay logic. The TypeScript-AST gate verifies
facts that source can prove without guessing at rendered intent:

- focused component routes import and use `CatalogExampleStack` and
  `CatalogExample` from the public package;
- focused route metadata uses the helpers' `rootAttributes` slot and example rows
  are not empty;
- every `@kerfjs/ui` import is a published package export and relative imports
  do not reach into `ui/src`;
- focused demos have no relative stylesheet imports, inline style attributes,
  or styling-only `demo-*`, `wa-demo-*`, and token-search class names;
- demo JSX does not copy private `kui-catalog-*` structural classes;
- recipe sources (checked by `npm run check:recipes` with the same shared
  analyzer) import no stylesheet other than public `@kerfjs/ui` CSS, set no
  inline style, and name only published layout and Web Awesome classes; each
  recipe declares its catalog frame through an exported `presentation`; and
- the shell derives the documented demo mode from the active entry's kind.

The gate deliberately does not infer component ownership from arbitrary class
names, margins, borders, or nested descendants. Runtime appearance remains the
browser suite's job.

A focused route may bypass the two public layout helpers only when the route's
stage geometry is itself the reviewed specimen. Add the narrow waiver to
[`catalog-conformance-exceptions.json`](../ux-demo/catalog-conformance-exceptions.json)
with the exact route, source file, stable diagnostic ids, a substantive reason,
and the reviewing `KF-*` ticket. Only helper/metadata rules are waivable;
private imports, local styling, private markup, empty examples, and shell-mode
drift always fail. The gate rejects duplicate, malformed, unused,
and stale exceptions, so delete a waiver when its route adopts the standard
helpers.

## Selection reveal

Set `revealSelection: true` on `wireCatalog` for a long desktop sidebar. After
`onSelect` updates controlled state, the helper waits one animation frame, finds
the exact matching `data-item-id`, and scrolls it into view without changing
focus. A newer selection or disposal cancels the pending reveal. The default
media guard follows the Workbench's inline sidebar (`min-width: 44.01rem`), so a
closed phone overlay is never scrolled behind the user's back.

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
} from "@kerfjs/ui/wire-catalog";
// A CSS-aware (browser-condition) bundler loads the Catalog's CSS with its import.

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
    entries: entries.map(({ kind, ...entry }) => ({
      ...entry,
      tags: kind === "composition" ? ["Composition"] : undefined,
    })),
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
      <CatalogExample label="Authoring note" note="Explain the specimen below.">
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

const app = document.getElementById("app")!;
mount(app, () => (
  <Catalog
    brand={{ title: "Acme UI", subtitle: "Design system" }}
    sections={sections}
    active={active.value}
    content={renderers[active.value]?.() ?? <></>}
    collapsed={collapsed.value}
    theme={theme.value}
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

// Optional for an initial deep link whose row may start outside the viewport.
revealCatalogEntry(app, initial, { block: "center" });
```

## Ownership boundary

`Catalog` renders the shell; the app owns everything stateful:

- **`active`** is domain state (which entry is shown) — the app's signal, updated in
  `onSelect`, read to compute `content`.
- **`collapsed`** is transient UI — the app's signal, flipped in `onToggleSidebar`.
  Pass the same signal as `wireCatalog`'s `collapsed` option so the sidebar is
  wired as a Workbench rail (transient on small screens, focus handed to the
  relocated toggle).
- **`headerPlacement` / `footerPlacement`** choose whether the entry toolbar and
  description, and the status + resource footer, stay pinned (`fixed`), scroll with
  the preview (`scroll`), or stay pinned while the entry pane is tall enough and
  scroll with the preview when it is short (`auto`, the default) — so a short
  window or large text never squeezes the preview out.
  The resource footer uses `ToolbarControlGroup overflow="wrap"`: whole links
  move to another row when they do not fit, keeping Guidance and source labels
  readable without horizontal scrolling.
- **`sidebar`** configures the sidebar rail — it forwards to the Workbench's left
  rail: `size` (default 288px), `resizable` (`true` or `{ min, max }`),
  `separator`, `collapseMotion`, `presentation`, `responsiveOverlayAt` (default
  `narrow`), `compactOverlay` (default `inset`), and `toolbar` (the sidebar
  header's `ToolbarConfig`). A resizable sidebar's width is app state like
  `collapsed`: render your size signal as `sidebar.size` and pass the same signal
  as `wireCatalog`'s `sidebarSize` (plus `sidebarStorageKey` to remember it).
- **`mainToolbar` / `footerToolbar`** take the entry toolbar's and the resource
  footer toolbar's `ToolbarConfig` (`dividerSides`, `centerAlign`, `responsive`,
  `responsiveAt`, `safeAreaEdges`). The defaults are a wrapping entry toolbar
  and a footer toolbar that stacks at `narrow`, all without dividers of their
  own: `wireCatalog` wires `wireScrollDividers`, so the shell's panes draw
  their chrome dividers only while scrolled; an omitted or
  `undefined` field keeps them. Configure these instead of styling the shell.
- **`theme`** is a global preference — the app's signal; `wireCatalog` only reports
  the toggle, the app applies the theme (the shell reads `theme` to show the toggle's
  opposite-state label). Omit `theme` to hide the toggle entirely.

## Custom action names

The shell emits `data-action="catalog-select"` (sidebar items),
`catalog-toggle-sidebar`, and `catalog-toggle-theme`. Override them with
`selectAction` / `toggleSidebarAction` / `toggleThemeAction` on `Catalog` (and the
matching options on `wireCatalog`) if they collide with your own action table.

## CSS

`Catalog` composes public components (`Workbench`, `Pane`, `Toolbar`, `List`,
`ListHeader`, `ListItem`, `ListInsetText`, `Text`, …) and owns only the preview stage
(the checkerboard and left-aligned canvas), the example viewport
options, and the brand mark's size. A bundler that honors the `browser` export
condition loads the Catalog's stylesheets and those of every component it renders
internally with the `@kerfjs/ui/catalog` import alone — no dependence on which other
subpaths the app happens to import. Without that condition, import
`@kerfjs/ui/styles.css` for the whole layer, or `@kerfjs/ui/catalog.css` plus
`@kerfjs/ui/workbench.css` and each composed primitive's CSS. Like any Workbench it needs a definite containing height — the
`@kerfjs/ui/document.css` baseline's `.kui-app-root`.
