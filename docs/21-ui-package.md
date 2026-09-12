# 21. `@kerfjs/ui` component package

**Status: shipped in the repository; published in lockstep with kerfjs.**

`@kerfjs/ui` is the first-party component layer for kerf applications. It is a
sibling package under `ui/`, not part of the framework runtime and not an npm
workspace. The package shares kerfjs's version and `v*` release tags while
remaining independently installable and tree-shakeable.

## 21.1 Design position

The package follows Apple Human Interface Guidelines as principles, not as a
skin: clear hierarchy, legible controls, restrained decoration, direct
manipulation, visible state, and forgiving target sizes. It does not imitate
private Apple assets or hard-code a platform chrome. Semantic `--kui-*` tokens
make the same components adaptable to another product language. Their defaults
deliberately match Hot Sheet 2's Web Awesome-based typography, geometry, and
system palette so Hot Sheet can later consume the package without a visual
rewrite.

Components stay deliberately small. They return `SafeHtml`, expose stable
classes and `data-*` hooks, accept content slots, and leave application state
and domain policy to the caller. Eventful primitives pair markup with an
explicit `wire*(root)` disposer instead of hiding listeners or lifecycle.

## 21.2 Installation and styles

```bash
npm install kerfjs @kerfjs/ui
```

```ts
import { AppTab } from '@kerfjs/ui/app-tab';
import { Toolbar } from '@kerfjs/ui/toolbar';
```

Every component has an ESM/type subpath and every stylesheet has an explicit CSS
subpath. A CSS-aware browser bundler resolves the component subpath's `browser`
condition to a generated wrapper that imports the foundation, that component's
CSS, and CSS for the UI subcomponents reachable from its source imports. The
package derives this graph during its build, so application roots neither list
transitive styles nor retain stale ones. Unused component CSS stays out of the
bundle.

The root barrel stays JavaScript-only so its re-exports remain tree-shakable
without making every stylesheet a side effect. Pair it with `styles.css` only
when the complete component layer is wanted. Node and SSR use the pure `import`
condition; `@kerfjs/ui/unstyled` is an explicit CSS-free root for custom browser
pipelines. `foundation.css` and every component stylesheet remain exported for
manual delivery. `foundation.css` defines Web Awesome-compatible semantic
defaults for neutral, brand/info, success, warning, and danger roles. Stateful
components expose scoped custom properties, so an application may override the
complete theme, one semantic tone, or one instance.

`sidebar.css` is the package's layout composition for navigation rails. Its
`.kui-sidebar` class establishes one content gutter and one icon/label grid for
`MenuHeader` and `MenuItem`; iconless rows reserve the icon column. A
`.kui-sidebar-surface` border remains flush to the gutter while its internal
content aligns with row labels, and `.kui-sidebar-section` adds grouping without
another inset. Consumers can change the geometry coherently through the shared
`--kui-sidebar-*` tokens instead of wrapper padding, negative margins, or
duplicated numeric offsets.

For an app that also uses Web Awesome's free component set, one optional import
provides Web Awesome's base stylesheet plus Kerf's Hot Sheet 2-aligned theme:

```ts
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
```

The theme uses Web Awesome's public semantic variables for surfaces, text,
brand and status ramps, focus, form geometry, panels, tooltips, radii, and
shadows. It styles every free component that consumes those contracts while
remaining overridable through later or scoped `--wa-*` declarations. The CSS
entry registers no custom elements; importing individual Web Awesome component
modules keeps their JavaScript tree-shakeable.

`Select` is a Web Awesome adapter. Rendering it is pure; custom-element
registration happens only after `import '@kerfjs/ui/select/register'`. Web
Awesome is an optional peer so apps that use neither that registration entry
nor `webawesome.css` do not install or bundle it. Option icon slots carry
stable per-select/per-choice morph keys and preserve the upgraded custom
element's slot state across application rerenders. Custom selected content is
keyed by the controlled value, so it is replaced when the selection changes
instead of retaining stale content.

## 21.3 Initial component set

| Family | Exports | Responsibility |
| --- | --- | --- |
| Icons | `LucideIcon` | Render Lucide icon-node data; decorative by default, labeled on request |
| Toolbars | `Toolbar`, `ToolbarControlGroup`, `ToolbarText` | Leading/center/trailing structure and grouped controls |
| Menus | `MenuItem`, `MenuHeader` | Navigation/action rows and section headings; no domain commands |
| Tabs | `AppTab`, `TabBar`, `wireTabBars`, `reorderTabs` | Controlled tab/close markup, fixed rails, horizontal overflow, edge autoscroll, pointer/keyboard reorder, and focus restoration; the app owns state and persistence |
| Layout | `PageHeader`, `DialogHeader`, `ValueTable` | Page/dialog hierarchy and semantic definition lists |
| Resize | `ResizableRegion`, `wireResizableRegions` | Pointer-captured resize plus arrows, Shift acceleration, Home, and End |
| Choice controls | `SegmentedControl`, `Select` | Controlled exclusive buttons with toolbar/rounded/pill presentation; grouped Web Awesome popup choices with optional Lucide icons |
| Search | `TokenSearchField`, `readTokenSearchField`, `placeTokenSearchCaret` | DOM-owned free text plus controlled ordered atomic filter chips; DOM reading and caret restoration without application query grammar |
| Feedback | `StateBanner`, `EmptyState`, `LoadingSpinner` | Status/alert, empty/busy, and meaningful/decorative progress states |

## 21.4 Accessibility contract

- All interactive elements retain visible `:focus-visible` treatment and usable
  target sizes. Icons are `aria-hidden` unless they carry a supplied label.
- `StateBanner` defaults to polite `status`; callers opt into assertive `alert`
  only for immediate action.
- `ResizableRegion` renders a focusable ARIA separator with orientation and live
  min/max/current values. Its wiring returns a disposer.
- `SegmentedControl` labels a group of native pressed buttons. Every enabled
  choice stays in sequential Tab order; the app handles its action and owns the
  selected value.
- `TokenSearchField` exposes a named contenteditable searchbox, atomic chips
  with named edit/remove buttons, and a named clear action. The application
  owns parsing, suggestions, result feedback, and state; editable text remains
  DOM-owned between controlled token changes to preserve the caret.
- `AppTab` renders `role="tab"`, `aria-selected`, roving `tabindex`, and keyboard
  shortcut metadata. `TabBar` provides the containing list and scroll owner;
  `wireTabBars` provides arrows/Home/End, close activation, pointer reorder,
  proximity-based horizontal edge autoscroll, `Alt+Shift+Arrow` reorder, focus
  restoration, and a disposer. The app applies changes and owns order,
  selection, panels, routing, close policy, and persistence.
- A `MenuItem` is a native button, not an isolated `role="menuitem"`; callers
  should add a full menu widget only when they also implement its complete
  keyboard model.
- Reduced-motion and forced-color preferences have explicit CSS paths.

## 21.5 Catalog and verification

`ui/ux-demo/` is a production-backed component catalog: it imports public
package paths, groups routes by category in a master/detail shell, exposes each
public visual component through an addressable `?component=` route, retains
focused composition scenarios, and gives the selected entry one centered
inspection stage. Catalog metadata declares direct component dependencies; the
detail view derives one grouped `Uses` / `Used by` selector from that graph and
omits the relationship footer when neither group exists.
Decorative chrome, Web Awesome controls, and production components share
semantic theme tokens. All 70 free Web Awesome 3.12 modules have focused routes
under a distinct collapsible ecosystem section with category subgroups, while a
dedicated gallery spans Web Awesome actions, forms, structure/navigation,
feedback, media, and formatting. The catalog includes every ToolbarControlGroup
variant, toolbar/rounded/pill SegmentedControl variants, editable and disabled
TokenSearchField states, all StateBanner tones
plus a scoped palette override, reorderable overflowing tabs, light and dark
themes, contrast, motion, selection, resize, and feedback states.
Unit coverage uses the root repository thresholds. Consumer bundles prove
component-reachable and transitive CSS, root/SSR isolation, JavaScript
tree-shaking, peer externalization, and opt-in custom-element registration.
Playwright runs the catalog in Chromium, Firefox, and WebKit and captures wide
and narrow review images.

AI-oriented entry points ship with the package at `ui/ai/skill.md` and
`ui/llms.txt`. They route tools to the component contract, accessibility rules,
catalog, and the need-first `ui/docs/component-selection.md` decision matrix
rather than asking an assistant to infer behavior from CSS. The UI package
check verifies that every public runtime value and supported Web Awesome
overlap remains represented, and rejects stale package imports or broken local
recipe links.

## 21.6 Versioning and releases

`scripts/release.sh` bumps `kerfjs`, `eslint-plugin-kerfjs`,
`create-kerf-component`, and `@kerfjs/ui` together. The dedicated
`release-ui.yml` workflow validates/builds without an OIDC token, transfers only
`ui/dist/` as an artifact, and publishes from a token-holding job that runs no
dependency install or build scripts. Beta versions are applied ephemerally.
