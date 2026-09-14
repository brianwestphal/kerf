# @kerfjs/ui

Accessible, composable UI primitives for [kerf](https://github.com/brianwestphal/kerf). The package ships production components, component-reachable CSS, accessibility and keyboard contracts, an AI-readable guide, and a production-backed UX catalog.

Start interface work with the [need-first component selection matrix](./docs/component-selection.md). It distinguishes direct reuse, composition, thin application adapters, and genuinely custom semantics, with imports, required wiring, application ownership, alternatives, and recipes for every public primitive.

For connective application patterns, use the seven [production composition
recipes](./docs/recipes.md). Each has a stable catalog route, runnable state,
public-subpath source, semantic layout ownership, and explicit application
customization boundaries. The composer recipe demonstrates one coherent form
surface with three transparent content sections; only persistent feedback adds
a nested semantic `StateBanner` surface.

When no primitive matches, keep policy application-owned while reusing the
layout vocabulary. The typed
[`command-palette-adapter.tsx`](./docs/examples/command-palette-adapter.tsx)
shows that application boundary explicitly; it is reference source, not a package
runtime export.

```bash
npm install kerfjs @kerfjs/ui
```

```tsx
import { MenuItem } from '@kerfjs/ui/menu-item';
import { MenuHeader } from '@kerfjs/ui/menu-header';
import { MenuActionRow } from '@kerfjs/ui/menu-action-row';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

mount(root, () => <>
  <Toolbar label="Document" leading={<ToolbarControlGroup appearance="borderless" single><ToolbarText text="Notes" /></ToolbarControlGroup>} />
  <section>
    <MenuHeader
      label="Workspace"
      action="show-workspace-actions"
      actionLabel="Workspace actions"
      rootAttributes={{ 'data-section-id': 'workspace' }}
      triggerAttributes={{
        popoverTarget: 'workspace-actions',
        popoverTargetAction: 'toggle',
        'aria-controls': 'workspace-actions',
        'aria-haspopup': 'dialog',
      }}
    />
    <MenuItem
      action="open-notes"
      label="Notes"
      selected
      rootAttributes={{ 'data-command-color': 'blue', 'data-drop-status': 'ready' }}
    />
    <MenuActionRow
      action="open-file"
      itemId="src/main.ts"
      label="src/main.ts"
      trailingAction="open-file-actions"
      trailingActionLabel="Actions for src/main.ts"
      trailingActionIcon={moreIcon}
    />
    <div id="workspace-actions" popover="auto">Application-owned actions</div>
  </section>
</>);
```

Components return Kerf `SafeHtml`. They do not own application state or attach transient listeners. Actions are stable `data-action` hooks; the application wires them once with `delegate()` or `delegateActions()` and retains the disposer.

`MenuItem.rootAttributes`, `MenuHeader.rootAttributes`,
`MenuActionRow.rootAttributes`, and `AppTab.rootAttributes` carry typed
application `data-*` metadata without
teaching the package domain fields. `MenuHeader.triggerAttributes` and
`MenuActionRow.trailingActionAttributes` additionally support native popover
target and relationship attributes. Roles and component-owned action, selection,
disclosure, naming, disabled, and icon semantics remain protected props; an
isolated `role="menuitem"` is not an extension shortcut.
The slots are also filtered at runtime, so structurally widened objects and
JavaScript callers cannot bypass those protections with case-variant names.
`MenuItem.trailing` is dormant metadata. Use `MenuActionRow` when a row needs
sibling primary and trailing native-button actions with independent names,
disabled states, focus, and click ownership. Its `label`, `icon`, and
`trailingActionIcon` slots are dormant content and must not contain controls.
For section quantities, pass a non-negative safe-integer `count` together with
the localized full spoken phrase in `countLabel`, for example
`count={3} countLabel="3 notes"`. This renders the standard neutral count pill
and includes the count in the heading or disclosure button's accessible name.
Do not concatenate a count into `label` or pass a numeric `badge`; the mutually
exclusive legacy `badge` slot remains available for non-count `SafeHtml` such
as a `New` marker.

## Component subpaths

| Component | Browser import (includes reachable CSS) | Manual CSS export |
| --- | --- | --- |
| `LucideIcon` | `@kerfjs/ui/lucide-icon` | `@kerfjs/ui/lucide-icon.css` |
| `DisclosureArrow` | `@kerfjs/ui/disclosure-arrow` | `@kerfjs/ui/disclosure-arrow.css` |
| `Toolbar` | `@kerfjs/ui/toolbar` | `@kerfjs/ui/toolbar.css` |
| `ToolbarControlGroup` | `@kerfjs/ui/toolbar-control-group` | `@kerfjs/ui/toolbar-control-group.css` |
| `ToolbarText` | `@kerfjs/ui/toolbar-text` | `@kerfjs/ui/toolbar-text.css` |
| `MenuActionRow` | `@kerfjs/ui/menu-action-row` | `@kerfjs/ui/menu-action-row.css` |
| `MenuItem` | `@kerfjs/ui/menu-item` | `@kerfjs/ui/menu-item.css` |
| `MenuHeader` | `@kerfjs/ui/menu-header` | `@kerfjs/ui/menu-header.css` |
| Pane, content, and navigation composition | — | `@kerfjs/ui/layout.css` |
| `ResizableRegion` | `@kerfjs/ui/resizable-region` | `@kerfjs/ui/resizable-region.css` |
| `wireResizableRegions` | `@kerfjs/ui/wire-resizable-regions` | — |
| `AppTab` | `@kerfjs/ui/app-tab` | `@kerfjs/ui/app-tab.css` |
| `TabBar` | `@kerfjs/ui/tab-bar` | `@kerfjs/ui/tab-bar.css` |
| `wireTabBars`, `reorderTabs` | `@kerfjs/ui/wire-tab-bars` | — |
| `PageHeader` | `@kerfjs/ui/page-header` | `@kerfjs/ui/page-header.css` |
| `LoadingSpinner` | `@kerfjs/ui/loading-spinner` | `@kerfjs/ui/loading-spinner.css` |
| `Select` | `@kerfjs/ui/select` | `@kerfjs/ui/select.css` |
| `SegmentedControl` | `@kerfjs/ui/segmented-control` | `@kerfjs/ui/segmented-control.css` |
| `TokenSearchField`, `readTokenSearchField`, `placeTokenSearchCaret` | `@kerfjs/ui/token-search-field` | `@kerfjs/ui/token-search-field.css` |
| `wireTokenSearchFields` | `@kerfjs/ui/wire-token-search-fields` | — |
| `StateBanner` | `@kerfjs/ui/state-banner` | `@kerfjs/ui/state-banner.css` |
| `EmptyState` | `@kerfjs/ui/empty-state` | `@kerfjs/ui/empty-state.css` |
| `DialogHeader` | `@kerfjs/ui/dialog-header` | `@kerfjs/ui/dialog-header.css` |
| `ValueTable`, `ValueTableRow` | `@kerfjs/ui/value-table` | `@kerfjs/ui/value-table.css` |

`DisclosureArrow` defaults to an 18px root-scaled decorative visual. Override
`--kui-disclosure-arrow-size` at the narrowest useful scope when a consumer
needs another size; the owning control still supplies interaction, naming, and
expanded state. Kerf `Select` retains its independent Web Awesome expand-glyph
scale of `.5` through `--kui-disclosure-icon-scale`. Author replacement
`DisclosureArrow` icon content facing right before its configured direction
transform is applied.

`MenuHeader` supplies that production `DisclosureArrow` automatically when
`toggle` is true and `actionIcon` is omitted. Keep `expanded` synchronized with
real controlled content and preserve the button's stable label; ordinary
navigation must not display a disclosure arrow. A custom `actionIcon` remains
an escape hatch and replaces the default arrow entirely. The header fills its
available inline width, keeping a separate action at the logical end in a 44px
target. Its visible action glyph defaults to 18px through
`--kui-menu-header-action-icon-size`.

## Machine-readable catalog

AI tools can retrieve the shipped [`ai/component-catalog.json`](./ai/component-catalog.json)
for the exhaustive component and composition inventory. It is the canonical
source for ids, public exports, purpose and selection guidance, relationships,
delivery and side effects, companion wiring, application-owned policy,
variants, accessibility obligations, public CSS hooks, routes, and current
documentation/recipe links. The adjacent
[`component-catalog.schema.json`](./ai/component-catalog.schema.json) describes
the versioned format.

For code generation, pair catalog selection guidance with the checked-in
[`public-api-signatures-v1.md`](./ai/public-api-signatures-v1.md) declaration
snapshot. It is generated from the emitted `@kerfjs/ui` declarations and the
installed `kerfjs/actions` declaration, so callback names, props, return values,
and accepted import paths do not have to be inferred from examples. Direct
Web Awesome JSX has its own generated
[`webawesome-jsx-signatures-v1.md`](./ai/webawesome-jsx-signatures-v1.md)
context so adding the declaration boundary does not mutate a frozen measured
regression suite.

`npm run catalog:sync` deterministically projects the fields used by the UX
catalog into `ux-demo/catalog.generated.ts`, including the existing guidance
path and the first-party source path for each main, recipe, or Web Awesome
specimen. First-party component entries also derive their implementation path
from the canonical browser import. Do not edit that generated file.
`npm run check:catalog` rejects stale generated output, exports and package
paths, Web Awesome manifest/declaration drift, invalid relationships, broken
links, or a missing AI-guidance entry. Prose remains authored where design
nuance matters.

Import components from their explicit JavaScript subpaths. CSS-aware browser
bundlers such as Vite, webpack, and esbuild follow each subpath's `browser`
condition, collect its foundation and component CSS, and retain styles for any
UI subcomponents it uses. Unrelated component CSS is never reached. Application
roots therefore do not need a transitive stylesheet list, and removing the last
component import also removes its reachable CSS. This is component-level CSS
tree shaking; variants within an imported component remain together.

The root `@kerfjs/ui` barrel stays JavaScript-only because making a side-effectful
CSS barrel tree-shakable is not portable across bundlers. If an application uses
that convenience import, also import `@kerfjs/ui/styles.css`, which deliberately
contains the complete layer. Non-browser/SSR tools resolve the pure `import`
condition automatically; `@kerfjs/ui/unstyled` is the explicit CSS-free root
entry for a browser build with a custom styling pipeline. The exported
`foundation.css` and component CSS paths remain available for fully manual
delivery. Load application overrides after package styles, or scope `--kui-*`
variables directly on a component instance.

## Pane and content geometry

Import `@kerfjs/ui/layout.css` and use the same structural vocabulary for a
sidebar, main area, inspector, or dialog. `.kui-pane` is unpadded and contains
an optional toolbar, one scrolling `.kui-pane__content`, and an optional footer.
Add `.kui-content` to make its major children a vertical stack with 24px gaps.

```tsx
<aside class="kui-pane">
  <div class="kui-pane__toolbar"><Toolbar label="Workspace" ... /></div>
  <nav class="kui-pane__content kui-content">
    <section>
      <MenuHeader label="Workspace" count={3} countLabel="3 workspaces" />
      <MenuItem action="open" label="Inbox" icon={inboxIcon} />
      <MenuItem action="open" label="Drafts" />
    </section>
    <div class="kui-content-item">Workspace details</div>
  </nav>
</aside>
```

Ordinary children use `.kui-content-item`: 8px inline margin, a real 1px border
(transparent by default), 8px padding, and 12px rounded corners. The pill
modifier uses a 22px radius. A component can expose a transparent border or
background without changing layout. `MenuHeader` follows the same rule while
keeping its dormant title and count-or-badge cluster separate from its optional
44px action.

## Spacing and application layout

Use 24px only for major vertical separation; use 8px inside content items and
between toolbar groups. Toolbar groups are 44px outside (`2px + 42px`) and keep
that geometry when their border/background are transparent. Wrap text and other
dormant toolbar content in a `ToolbarControlGroup` too. Do not pad the pane
itself, add competing wrapper insets, or give it more than one scroll owner.
Reading width and responsive pane placement remain application decisions. See
the complete [layout contract](./docs/layout.md).

## Web Awesome theme

Apps using Web Awesome's free components can opt into the same visual universe
with one CSS import:

```ts
import type {} from '@kerfjs/ui/webawesome';
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
```

The type-only `@kerfjs/ui/webawesome` import adds Kerf JSX intrinsic-element
declarations for the same 70 elements tracked by the catalog. It emits no
runtime code and registers nothing; keep importing only the individual Web
Awesome modules the application renders.

`webawesome.css` includes Web Awesome's native/base theme and then applies the
Hot Sheet 2 palette, surfaces, status colors, focus treatment, form geometry,
radii, tooltips, and shadows through Web Awesome's public `--wa-*` contract.
Those tokens flow into all free component families. Every free Web Awesome 3.12
component has an individual UX-catalog route under the collapsible ecosystem
section, but the theme entry does not import or register component JavaScript,
so each component module remains independently tree-shakeable in consuming apps.
Tooltip and Popover surfaces omit pointer arrows by default. Override
`--wa-tooltip-arrow-size` and `--kui-wa-popover-arrow-size`, or a single
popover's public `--arrow-size`, when an arrow communicates useful context.

Load application CSS afterward to override semantic values globally, or scope
them to a subtree. Use Web Awesome's `.wa-light`, `.wa-dark`, and `.wa-invert`
classes for explicit appearance boundaries:

```css
:root {
  --wa-color-brand-fill-loud: #7540a8;
  --wa-form-control-border-radius: .5rem;
}
```

`foundation.css` follows Hot Sheet 2's Web Awesome-compatible semantic palette.
Brand, neutral, success, warning, and danger each expose fill, border, and
foreground roles through `--kui-color-*`; stateful components also expose
component variables such as `--kui-state-banner-background`. Override the
foundation for an application theme, a tone variable for one semantic state, or
a component variable on one instance without replacing component selectors.
Prefer an equivalent prop or token. When composition-specific layout still
needs a selector, the component catalog's `publicClasses` arrays define the
exact stable anatomy: public-class-to-public-class selectors are supported;
descendant tag, id, attribute-only, and unlisted-class selectors are not.

`StateBanner` has opinionated `neutral`, `info`, `success`, `warning`, and
`danger` palettes. Override an individual banner with
`--kui-state-banner-background`, `--kui-state-banner-border`,
`--kui-state-banner-foreground`, `--kui-state-banner-detail`,
`--kui-state-banner-action-background`, and
`--kui-state-banner-action-hover-background`. To retheme one tone everywhere,
override `--kui-state-banner-{tone}-{background|border|foreground}`. Other
stateful components follow the same public-variable pattern, including
`--kui-toolbar-control-*`, `--kui-segmented-*`, `--kui-app-tab-*`, and
`--kui-tab-bar-*`.

`SegmentedControl` is a controlled exclusive-choice component. Use
`appearance="toolbar"` when it sits inside a `ToolbarControlGroup`, or choose a
standalone `filled`/`outlined` appearance with `shape="rounded"` or
`shape="pill"`. The app owns `value` and handles the supplied action:

```tsx
<SegmentedControl
  id="view-mode"
  label="View mode"
  value={viewMode.value}
  action="select-view-mode"
  appearance="toolbar"
  shape="pill"
  choices={[
    { value: 'list', label: 'List' },
    { value: 'columns', label: 'Columns' },
  ]}
/>
```

Each choice remains a native button in sequential Tab order and exposes its
value through `data-segment-value`. Override an instance through
`--kui-segmented-{background|border|foreground|hover-background}` and
`--kui-segmented-selected-{background|foreground|border|shadow}`.

`TokenSearchField` is a token-controlled contenteditable searchbox that keeps
free text and ordered filter chips in one field. Its editable text stays
DOM-owned between token changes so typing does not replace the caret. Tokens
expose stable edit/remove actions and remain atomic during editing; the app owns
parsing, suggestions, query execution, and state. Use `readTokenSearchField()`
after browser input to recover text plus token offsets, and
`placeTokenSearchCaret()` when restoring focus after a controlled update.
Call `wireTokenSearchFields()` once at a stable root to make Enter submit through
`onSubmit` without inserting a contenteditable line break and to preserve focus
plus the text-relative caret when keyboard deletion of a chip causes controlled
rendering to replace the editor. Text still wraps visually when it reaches the
field edge.
Clear actions should empty the editor's `textContent` before clearing app state.
The leading icon, first text line, clear action, and trailing slot share one
fixed alignment row; when text wraps, those controls stay pinned to that first
row instead of recentering against the taller editor.
Set `collapsible` for the first-class compact presentation: an empty closed
field renders as one iconic search action, `expanded` reveals the complete
field, and text or tokens keep it expanded. Width changes animate by default
and respect reduced-motion preferences. The field works standalone or inside a
`ToolbarControlGroup`; the application owns the transient focused/open signal,
focus transfer, and focusout policy. The catalog's Toolbar route demonstrates
that composition at wide and narrow sizes.
Override its surface through `--kui-token-search-{background|border}` and its
chips through `--kui-token-search-token-{background|foreground}`. Override
`--kui-token-search-line-size` only when the complete first-line geometry must
change together.

`TabBar` is controlled: pass ordered `AppTab` children, then wire its keyboard
and same-bar drag behavior with `wireTabBars(root, { onReorder })`. During a
drag, the scroll strip automatically moves toward either edge with speed based
on pointer proximity, exposing earlier or later drop targets. Apply the reported
change with `reorderTabs()` or application-specific state logic. The application
still owns selection, closing, routing, and persistence.
Use `AppTab.rootAttributes` for domain `data-*` metadata and `closeIcon` for a
decorative replacement glyph. The runtime rejects roles and case variants of
the component- or wiring-owned action, tab identity, selection, drag, drop, and
component markers. Keep the icon free of interactive descendants; the named
close button retains all close interaction.

`Select` uses Web Awesome but does not register anything by itself. Install the optional peer, import the shared theme if desired, and explicitly import the registration entry in the application:

```ts
import '@kerfjs/ui/webawesome.css';
import '@kerfjs/ui/select/register';
```

That boundary keeps Web Awesome and its custom-element side effects out of bundles that use unrelated components. Automated consumer-bundle tests enforce it.
`Select` also owns the Kerf/Web Awesome reconciliation boundary: option icons
keep stable slotted elements across rerenders, and `renderSelected` content is
replaced when the controlled value changes. Consumers do not need to add
`data-key` or `data-morph-skip` workarounds around choice icons.

For application choices and panes, prefer Kerf's purpose-built primitives:
`Select` over direct Web Awesome selection/dropdown composition,
`SegmentedControl` over Button Group, `TabBar` or `SegmentedControl` over Web
Awesome Tabs, `LucideIcon` over Web Awesome Icon, and `ResizableRegion` over
Split Panel. `ResizableRegion` includes Hot Sheet 2's 1px separator and
hover/focus grip. Its optional `handleIcon` replaces only the decorative glyph;
the component and `wireResizableRegions()` retain separator semantics and
pointer/keyboard behavior. Consider Web Awesome Popup when its anchored-positioning
engine removes custom placement code; treat Tree, Animated Image, Comparison,
Zoomable Frame, and the displaced alternatives above as exceptional rather
than default patterns. The detailed rationale lives in the theme contract.

## Design and tool guidance

- [Component selection and composition](./docs/component-selection.md)
- [Design philosophy](./docs/design-philosophy.md)
- [Apple HIG translation](./docs/apple-hig.md)
- [Accessibility and keyboard contracts](./docs/accessibility.md)
- [Component and integration contract](./docs/component-contract.md)
- [Spacing and application layout](./docs/layout.md)
- [Web Awesome theme contract](./docs/webawesome-theme.md)
- [UX catalog contract](./docs/ux-demo.md)
- [AI guide](./ai/skill.md)

Run `npm run dev` from this directory for the category-grouped master/detail catalog. Every public visual component has a focused route; all 70 free Web Awesome 3.12 components have focused routes under the collapsible ecosystem section. Every detail visibly links its first-party demo source and existing guidance while showing the repository-relative paths; first-party components also link their implementation source, and Web Awesome entries label local guidance as Kerf integration guidance. One grouped `Related components` selector contains derived `Uses` / `Used by` navigation across both sets. Run `npm run check` for static/unit/bundle gates and `npm run test:e2e` for the real-browser suite.

Run `npm run format:css` after editing styles. The normal `npm run check` gate
uses Prettier to reject unformatted CSS in `src/` and `ux-demo/`.

For dimensions that should scale with the root font size, author pixels with
`remify()`: `gap: remify(17px)` builds to `gap: 1.0625rem` using a fixed 16px
baseline. Keep intentional 1px borders in pixels and contextual `em` values
explicit. `npm run build` emits standard CSS to `dist/styles`; `npm run dev`
applies the same transform directly to source styles and hot-reloads edits.
