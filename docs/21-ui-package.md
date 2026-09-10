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
make the same components adaptable to another product language.

Components stay deliberately small. They return `SafeHtml`, expose stable
classes and `data-*` hooks, accept content slots, and leave application state
and domain policy to the caller. Eventful primitives pair markup with an
explicit `wire*(root)` disposer instead of hiding listeners or lifecycle.

## 21.2 Installation and styles

```bash
npm install kerfjs @kerfjs/ui
```

```ts
import { AppTab, Toolbar } from '@kerfjs/ui';
import '@kerfjs/ui/styles.css';
```

Every component has an ESM/type subpath and every stylesheet has an explicit
CSS subpath. `foundation.css` defines semantic defaults; `styles.css` aggregates
the complete component layer. CSS is the only broad side effect.

`Select` is a Web Awesome adapter. Rendering it is pure; custom-element
registration happens only after `import '@kerfjs/ui/select/register'`. Web
Awesome is an optional peer so apps that never import Select do not install or
bundle it.

## 21.3 Initial component set

| Family | Exports | Responsibility |
| --- | --- | --- |
| Icons | `LucideIcon` | Render Lucide icon-node data; decorative by default, labeled on request |
| Toolbars | `Toolbar`, `ToolbarControlGroup`, `ToolbarText` | Leading/center/trailing structure and grouped controls |
| Menus | `MenuItem`, `MenuHeader` | Navigation/action rows and section headings; no domain commands |
| Tabs | `AppTab` | Tab/close markup with roving-tabindex-ready state; the app owns the tab list |
| Layout | `PageHeader`, `DialogHeader`, `ValueTable` | Page/dialog hierarchy and semantic definition lists |
| Resize | `ResizableRegion`, `wireResizableRegions` | Pointer-captured resize plus arrows, Shift acceleration, Home, and End |
| Forms | `Select` | Grouped Web Awesome choices with optional Lucide icons |
| Feedback | `StateBanner`, `EmptyState`, `LoadingSpinner` | Status/alert, empty/busy, and meaningful/decorative progress states |

## 21.4 Accessibility contract

- All interactive elements retain visible `:focus-visible` treatment and usable
  target sizes. Icons are `aria-hidden` unless they carry a supplied label.
- `StateBanner` defaults to polite `status`; callers opt into assertive `alert`
  only for immediate action.
- `ResizableRegion` renders a focusable ARIA separator with orientation and live
  min/max/current values. Its wiring returns a disposer.
- `AppTab` renders `role="tab"`, `aria-selected`, roving `tabindex`, and keyboard
  shortcut metadata. The containing app owns arrow/Home/End movement and close
  policy because it owns tab order and routing.
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
detail view derives both `Uses` and `Used by` navigation from that graph.
Decorative chrome, Web Awesome controls, and production components share
semantic theme tokens. The catalog includes light and dark themes, contrast,
motion, selection, resize, and feedback states.
Unit coverage uses the root repository thresholds. Bundle tests prove subpath
exports, tree-shaking, peer externalization, and opt-in custom-element
registration. Playwright runs the catalog in Chromium, Firefox, and WebKit and
captures wide and narrow review images.

AI-oriented entry points ship with the package at `ui/ai/skill.md` and
`ui/llms.txt`. They route tools to the component contract, accessibility rules,
and catalog rather than asking an assistant to infer behavior from CSS.

## 21.6 Versioning and releases

`scripts/release.sh` bumps `kerfjs`, `eslint-plugin-kerfjs`,
`create-kerf-component`, and `@kerfjs/ui` together. The dedicated
`release-ui.yml` workflow validates/builds without an OIDC token, transfers only
`ui/dist/` as an artifact, and publishes from a token-holding job that runs no
dependency install or build scripts. Beta versions are applied ephemerally.
