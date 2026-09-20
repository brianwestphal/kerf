# Catalog — a reusable component-gallery shell

`@kerfjs/ui/catalog` is an opt-in, whole-screen shell for building a **component
catalog** — the collapsible category sidebar + titled preview stage + resources
footer that the kerf UI catalog itself uses. Point it at your own components and
you get the same shell without rebuilding it. Like the app layouts, it is a
subpath-only, tree-shakeable module that adds nothing to the main barrel.

```bash
npm install @kerfjs/ui   # kerfjs is a peer; @kerfjs/ui/select/register is needed only if entries use `related`
```

- `Catalog(props)` returns the shell as `SafeHtml` (a `<main class="kui-catalog">`).
  It is **controlled and stateless**: your app owns the `active`, `collapsed`, and
  `theme` signals and computes the preview `content` from `active` in its own
  `mount()` render.
- `wireCatalog(root, options)` wires the interactions (sidebar selection, the
  related-entry popup menu, and the collapse/theme toggles) with one delegated
  listener set and returns a disposer; it can also mirror the active id into the
  URL.

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

## Preview examples

Compose each entry's `content` from `CatalogExample` (and `CatalogExampleStack`)
instead of hand-rolled example markup, so labels, notes, and left-edge alignment
stay consistent:

```tsx
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';

const buttonPreview = (
  <CatalogExampleStack label="Button variants">
    <CatalogExample label="Icon" note="A bare glyph." align="glyph">
      <LucideIcon icon={Plus} name="plus" />
    </CatalogExample>
    <CatalogExample label="Control" align="inline-control">
      <SegmentedControl id="view" label="View" value="list" choices={choices} />
    </CatalogExample>
    <CatalogExample label="In composition">
      <ValueTable label="Metadata">{rows}</ValueTable>
    </CatalogExample>
  </CatalogExampleStack>
);
```

`label` is optional — omit it for a bare specimen with no `ListHeader`. `align`
lines a specimen's visible left edge up with its label text: `'glyph'`
(16px) for a bare glyph/text specimen, `'inline-control'` (8px) for a control that
already carries ~8px of its own inline padding, and `'none'` (the default) for a
content-item/composition that already owns its geometry. The inset is published as
the `--kui-catalog-example-align` custom property so a debug overlay can exclude it
from a specimen's measured margin.

## Complete example

```tsx
import { mount, signal } from 'kerfjs';
import { Catalog, type CatalogSection } from '@kerfjs/ui/catalog';
import { wireCatalog } from '@kerfjs/ui/wire-catalog';
import '@kerfjs/ui/styles.css'; // or import each primitive's CSS + @kerfjs/ui/catalog.css

// 1. Describe your components once.
const sections: CatalogSection[] = [
  {
    category: 'Controls',
    entries: [
      { id: 'button', name: 'Button', description: 'A pressable control.',
        resources: [{ label: 'Source', href: '/src/button.tsx', detail: 'src/button.tsx' }] },
      { id: 'field', name: 'Field', description: 'A labeled input.', tags: ['Discouraged'],
        related: [{ id: 'button', name: 'Button', group: 'Used with' }] },
    ],
  },
  { category: 'Feedback', entries: [{ id: 'toast', name: 'Toast', description: 'A transient message.' }] },
];

// 2. One preview render per entry id.
const renderers: Record<string, () => ReturnType<typeof Button>> = {
  button: () => <Button label="Save" />,
  field: () => <Field label="Name" />,
  toast: () => <Toast>Saved</Toast>,
};

// 3. App-owned state (domain: which entry; transient: collapsed; global: theme).
const initial = new URLSearchParams(location.search).get('c') ?? sections[0].entries[0].id;
const active = signal(initial);
const collapsed = signal(false);
const theme = signal<'light' | 'dark'>('light');

const app = document.getElementById('app')!;
mount(app, () => (
  <Catalog
    brand={{ title: 'Acme UI', subtitle: 'Design system' }}
    sections={sections}
    active={active.value}
    content={renderers[active.value]?.() ?? <></>}
    collapsed={collapsed.value}
    theme={theme.value}
  />
));

wireCatalog(app, {
  onSelect: (id) => { active.value = id; },
  onToggleSidebar: () => { collapsed.value = !collapsed.value; },
  onToggleTheme: () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme.value; // apply your theme however you like
  },
  urlParam: 'c', // mirror the active id into ?c=<id>
});
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
