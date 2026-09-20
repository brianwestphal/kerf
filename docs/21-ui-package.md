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
subpath backed by compiled `dist/styles/` output. Source styles use the
pixel-first `remify(<px>)` convention described in [§22](./22-ui-css-authoring.md),
while consumers receive ordinary `rem` CSS. A CSS-aware browser bundler resolves
the component subpath's `browser`
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

`DisclosureArrow` has an 18px root-scaled default and exposes
`--kui-disclosure-arrow-size` for a scoped consumer override. Kerf `Select`
uses a separate Web Awesome expand-glyph contract with
`--kui-disclosure-icon-scale: .5`, so its half-scale treatment remains
independent of the shared arrow's box size. Configured directions animate over
the shortest path; a 180-degree closed-to-open tie uses counterclockwise
rotation.
`ListHeader` toggle mode composes that production arrow automatically when no
custom `actionIcon` is supplied; its controlled `expanded` value must correspond
to real revealed content, and ordinary navigation does not borrow the
disclosure affordance. The header fills its available inline width and keeps a
separate 44px action at the logical end with an 18px visible glyph.

`layout.css` is the shared structural composition for navigation rails, main
areas, inspectors, and dialogs. An unpadded `.kui-pane` contains an optional
toolbar, one scrolling `.kui-pane__content`, and an optional footer.
`.kui-content` uses 24px major vertical separation. Each
`.kui-content-item` owns 8px inline margin, a real 1px border, 8px padding, and
12px corners; border/background can remain transparent without changing
geometry, and the pill modifier selects 22px corners.

`ToolbarControlGroup` is the unit of toolbar organization, even for dormant
text. Groups stay 44px outside (`calc(2px + remify(42px))`) with 8px between
groups and inside items. `ListHeader` fills the available inline width and
separates a dormant title and count-or-badge cluster from its optional
logical-end 44px action with an 18px visual. Non-negative safe-integer section
counts use the required localized `count`/`countLabel` pair and the shared
neutral pill; non-count `SafeHtml` remains available through the mutually
exclusive legacy `badge` slot. `ListActionRow` keeps independently interactive
primary and trailing 44px controls as sibling buttons inside a noninteractive
full-width row; `ListItem.trailing` remains dormant. The layer does not specify product reading width
or responsive pane placement; consumers adapt public `--kui-layout-*` tokens
instead of adding wrapper padding, negative margins, or duplicated offsets.

For an app that also uses Web Awesome's free component set, one optional import
provides Web Awesome's base stylesheet plus Kerf's Hot Sheet 2-aligned theme:

```ts
import type {} from '@kerfjs/ui/webawesome';
import '@kerfjs/ui/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
```

The type-only package subpath supplies Kerf JSX declarations for every
catalog-supported Web Awesome element without emitting code or registering an
element. Its tag set is checked against both the catalog and Web Awesome's
installed custom-elements manifest.

The theme uses Web Awesome's public semantic variables for surfaces, text,
brand and status ramps, focus, form geometry, panels, tooltips, radii, and
shadows. It styles every free component that consumes those contracts while
remaining overridable through later or scoped `--wa-*` declarations. The CSS
entry registers no custom elements; importing individual Web Awesome component
modules keeps their JavaScript tree-shakeable. Checkbox Group and Radio Group
option regions use the shared 8px inline outer inset because those groups have
no bordered field shell; the Color Picker trigger uses the same inset for the
same unbordered geometry. Known Date field captions and bordered text-like
field hints align with their values at the shared 9px border-plus-padding
inset. OTP Input's label uses the same uppercase xs/650 treatment as other
field labels, and its label and hint both use that inset. Slider's complete
interactive region uses the shared 8px logical inline outer inset without
moving its label.

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
| Menus | `ListItem`, `ListActionRow`, `ListHeader` | Navigation/action rows, sibling primary/trailing row actions, and section headings with semantic count/countLabel pills, plus narrow typed `data-*` and popover-relationship extension slots but no domain commands |
| Tabs | `AppTab`, `TabBar`, `wireTabBars`, `reorderTabs` | Controlled tab/close markup with runtime-safe domain metadata and an optional decorative close glyph, fixed rails, horizontal overflow, edge autoscroll, pointer/keyboard reorder, and focus restoration; the app owns state and persistence |
| Layout | `PanelHeader`, `ValueTable`, `ValueTableRow` | Panel/dialog/page headings as plain toolbars with an optional bordered icon group, an extra-large title, trailing controls, and an optional subtitle; and typed semantic definition-list rows with optional leading icons |
| Resize | `ResizableRegion`, `wireResizableRegions` | Pointer-captured resize plus arrows, Shift acceleration, Home, End, and an optional decorative handle glyph |
| Choice controls | `SegmentedControl`, `Select` | Controlled exclusive buttons with toolbar/rounded/pill presentation; grouped Web Awesome popup choices with optional Lucide icons |
| Search | `TokenSearchField`, `readTokenSearchField`, `placeTokenSearchCaret`, `wireTokenSearchFields` | DOM-owned free text plus controlled ordered atomic filter chips; optional animated standalone or toolbar-group collapse; DOM reading, Enter submission, and caret-preserving keyboard deletion without application query grammar |
| Feedback | `StateBanner`, `EmptyState`, `LoadingSpinner`, `Skeleton` | Status/alert, empty/busy, meaningful/decorative progress, and a subtle unanimated loading-placeholder block |
| Loading placeholder | a component's `placeholder` prop | Value-bearing components (`Select`, `ListHeader`, `ListItem`, `ValueTableRow`, `PanelHeader`, `SegmentedControl`, `StateBanner`, `AppTab`, `ToolbarText`, `ListActionRow`) render their real chrome with value slots as `Skeleton` blocks and interactivity disabled, so a parent composes a faithful loading view (e.g. an inspector) without hand-rebuilding markup |
| Component catalog shell | `Catalog` + `wireCatalog` (`@kerfjs/ui/catalog`) | An opt-in, subpath-only whole-screen shell — collapsible category sidebar + titled preview stage + resources footer + related-entry selector — for building a component gallery from your own entries; controlled/stateless (the app owns `active`/`collapsed`/`theme` and computes the preview `content`). See `ui/docs/catalog.md` |

## 21.4 Accessibility contract

- All interactive elements retain visible `:focus-visible` treatment and usable
  target sizes. Icons are `aria-hidden` unless they carry a supplied label.
- `StateBanner` defaults to polite `status`; callers opt into assertive `alert`
  only for immediate action.
- `PanelHeader` is a plain top toolbar: an optional bordered icon group and an
  extra-large title in the leading zone, the app's trailing controls in the
  trailing zone, and an optional summary/id below the title. Its title carries
  no heading role, so the app links `titleId`/`summaryId` to the dialog or panel.
- `ResizableRegion` renders a focusable ARIA separator with orientation and live
  min/max/current values. Its wiring returns a disposer. `handleIcon` replaces
  dormant decoration only; it does not replace separator semantics or wiring.
- `SegmentedControl` labels a group of native pressed buttons. Every enabled
  choice stays in sequential Tab order; the app handles its action and owns the
  selected value.
- `TokenSearchField` exposes a named contenteditable searchbox, atomic chips
  with named edit/remove buttons, and a named clear action. The application
  owns parsing, suggestions, result feedback, and state; editable text remains
  DOM-owned between controlled token changes to preserve the caret.
  `wireTokenSearchFields` restores focus and the text-relative caret when
  keyboard chip deletion causes controlled rendering to replace the editor. Its leading
  icon, first text line, clear action, and trailing slot share a fixed vertical
  center and remain pinned there as content wraps. Its optional `collapsible`
  mode owns an animated iconic closed state, works standalone or inside a
  toolbar group, and keeps populated fields expanded. `wireTokenSearchFields`
  manages that transient expand/collapse/focus by default (activate to reveal and
  focus, Escape or empty blur to collapse), holding the `expanded` state in a
  signal exposed on its returned handle; an application binds that signal in
  render, adopts its own via `collapsible.signals`, drives it through
  `open`/`close`, or disables any behavior individually — so the transient UI is
  consistent without every app reimplementing it.
- `AppTab` renders `role="tab"`, `aria-selected`, roving `tabindex`, and keyboard
  shortcut metadata. `rootAttributes` accepts runtime-filtered application
  `data-*` metadata while component- and wiring-owned case variants stay
  protected. `closeIcon` replaces dormant decoration inside the named close
  button. `TabBar` provides the containing list and scroll owner;
  `wireTabBars` provides arrows/Home/End, close activation, pointer reorder,
  proximity-based horizontal edge autoscroll, `Alt+Shift+Arrow` reorder, focus
  restoration, and a disposer. The app applies changes and owns order,
  selection, panels, routing, close policy, and persistence.
- A `ListItem` is a native button, not an isolated `role="menuitem"`; callers
  should add a full menu widget only when they also implement its complete
  keyboard model. Menu row/header `rootAttributes` accept only domain `data-*`
  metadata. `ListHeader.triggerAttributes` additionally accepts native popover
  target/action and `aria-controls`/`aria-haspopup`; action, selection,
  disclosure, accessible-name, disabled, and icon semantics remain component
  owned.
- Reduced-motion and forced-color preferences have explicit CSS paths.

## 21.5 Catalog and verification

`ui/ux-demo/` is a production-backed component catalog: it imports public
package paths, groups routes by category in a master/detail shell, exposes each
public visual component through an addressable `?component=` route, retains
focused composition scenarios, and gives the selected entry one centered
inspection stage. Catalog metadata declares direct component dependencies; the
detail view derives one grouped `Uses` / `Used by` selector from that graph and
omits the relationship footer when neither group exists. Each detail also shows
the repository-relative first-party demo source and existing guidance path as
deploy-safe absolute GitHub links. First-party component details also link the
implementation file derived from the canonical browser import; Web Awesome
entries name the local documentation as Kerf integration guidance. The typed
projection derives these paths without adding a public runtime export.
Decorative chrome, Web Awesome controls, and production components share
semantic theme tokens. All 70 free Web Awesome 3.12 modules have focused routes
under a distinct collapsible ecosystem section with category subgroups, while a
dedicated gallery spans Web Awesome actions, forms, structure/navigation,
feedback, media, and formatting. The catalog includes every ToolbarControlGroup
variant, a responsive toolbar find composition, toolbar/rounded/pill
SegmentedControl variants, editable, disabled, single-line, and multiline
TokenSearchField states, all StateBanner tones
plus a scoped palette override, reorderable overflowing tabs, light and dark
themes, contrast, motion, selection, resize, and feedback states.
The tone labels above the StateBanner examples are catalog-only specimen chrome;
they derive the shared 8px margin + 1px border + 8px padding inset so their text
aligns with each banner's leading icon without adding a component API.
The catalog sidebar header uses the Kerf logo with a vertically centered title
and a separately aligned subtitle row. Its visible pane owns the collapse
control; once hidden, the pane disappears completely and its restore control
moves to the main toolbar's leading edge. The same shell rule places an
inline-end inspector's restore control at the main toolbar's trailing edge.
The focused resize specimen stacks its committed-width status below the
controlled region when narrow, remains readable at 200% root scaling, and does
not change the component's minimum, maximum, or application-owned size; locally
scrolling the resize specimen keeps an oversized pane's handle reachable.
Unit coverage uses the root repository thresholds. Consumer bundles prove
component-reachable and transitive CSS, root/SSR isolation, JavaScript
tree-shaking, peer externalization, and opt-in custom-element registration.
Playwright runs the catalog in Chromium, Firefox, and WebKit and captures wide,
intermediate, narrow, and 200%-zoom review images. Geometry assertions verify
that the shell's page, preview surface, pane, and dialog each have one semantic
spacing owner, that source and guidance links wrap without overflow, and that
the sidebar remains the sole pane scroll owner.

AI-oriented entry points ship with the package at `ui/ai/skill.md` and
`ui/llms.txt`. They route tools to the component contract, accessibility rules,
catalog, and the need-first `ui/docs/component-selection.md` decision matrix
rather than asking an assistant to infer behavior from CSS. The UI package
check verifies that every public runtime value and supported Web Awesome
overlap remains represented, and rejects stale package imports or broken local
recipe links.

`ui/ai/public-api-signatures-v1.md` is generated from the emitted declarations
for the corpus-facing UI subpaths and `kerfjs/actions`. It gives code-generating
tools exact prop, callback, return, and import contracts alongside the
selection-oriented catalog; the package gate rejects a stale snapshot.

`ui/ai/component-catalog.json` is the canonical versioned machine-readable
inventory, with an adjacent JSON Schema. It covers every public visual/helper
export, the layout and sidebar compositions, and all supported Web Awesome
entries. `ui/scripts/sync-component-catalog.mjs` deterministically emits the
checked-in typed UX-catalog projection; the catalog gate verifies exports,
browser/CSS/registration paths, relationships, Web Awesome's installed custom
elements manifest, AI coverage, renderer routes, public CSS hooks, and links.
The package's JavaScript and side-effect boundaries do not change.

Each catalog entry's `publicClasses` array is the exact stable CSS-anatomy
boundary. Applications should prefer an equivalent component prop or semantic
token; composition-specific selectors may join cataloged public classes, but
must not depend on descendant tags, ids, attribute-only targets, or unlisted
implementation classes.

## 21.6 Production composition recipes

Seven task-oriented recipes bridge primitives and product adapters: a resizable
application shell, navigation sidebar, workspace header, list-detail dialog,
composer form, list-state lifecycle, and compact mixed-control toolbar. They
are lazy catalog modules rather than new runtime exports. Each uses public
component subpaths plus `layout.css`, declares what the recipe
owns versus application policy, and has a stable `?component=recipe-*` route.
The composer reference keeps one visible form surface with `PanelHeader`
title/summary hierarchy, fields and actions on the shared 8px control gutter,
and 24px major rhythm; only its conditional `StateBanner` adds another semantic
surface. Its controlled Reset synchronizes
the upgraded Web Awesome fields' live value properties with their rendered
empty attributes and announces the reset through the catalog live region.
`ui/docs/recipes.md` is the copyable guide; canonical recipe facts live beside
component facts in `ui/ai/component-catalog.json` and project into the typed
catalog. A dedicated drift gate checks sources, imports, loaders, routes, and AI
links. Browser coverage exercises keyboard flows, deterministic transitions,
light/dark/contrast/reduced-motion, wide/intermediate/narrow layout, and 200%
zoom.

The shipped reference source includes a catalog-independent mount adapter that
connects a recipe controller to one stable root with `delegateActions`, form
and dialog delegates, `wireResizableRegions({ onCommit })`, and one idempotent
aggregate disposer. A typed application-local command-palette example shows the
missing-runtime-export boundary: it reuses
`layout.css`, content items, and a related-control cluster without claiming a
nonexistent UI component, while the application retains ranking, history,
shortcuts, focus policy, actions, and copy.

## 21.7 Local AI regression foundation

`ui/ai-regressions/` is an internal authoring harness, not a shipped component
surface or public comparison. Seven neutral, task-shaped prompts cover the
application shell, compact exclusive choice, navigation composition, workspace
states, list-detail dialog, tokenized search, and a recurring concept the
package does not provide. Their private oracles check actual AST-proven imports
and invocations, required wiring capture, semantic layout classes and owners,
the catalog's exact public-class CSS boundary, accessibility, and honest
upstream escalation.

The deterministic package gate validates the corpus and condition schemas,
freezes the pre-recipe baseline and the exact suite-v1 revised context, and
replays pinned passing and adversarial responses. Historical measured manifests
use their recorded stricter descendant rule so their hashes, scores, and
findings remain unchanged; the current oracle accepts public-class-to-public-
class composition selectors while rejecting private anatomy.
Suite-v2 overrides separately accept equivalent supported resize and delegated
action import paths. ListHeader count scoring covers canonical JSX and equivalent
direct object-literal calls, including statically invalid numeric counts. An
opt-in, non-executing TypeScript probe records separate
schema-described compile evidence against fixed compiler options and hashed
emitted declarations; it never treats a structural score as a successful
compile. Live or paid runs, browser probes, and bounded visual review remain
explicit opt-in evidence; canned fixtures are inference and cannot be reported
as measured improvement.

The provider-neutral prepare, score, record, and audit commands select suite v2
explicitly with `--suite 2`; v1 remains the default for backward-compatible
replay. V2 manifests hash their suite descriptor, frozen guidance condition,
public signature context, overrides, and scorer independently; recorded v2
contexts resolve through their own checked-in snapshot.

## 21.8 Versioning and releases

`scripts/release.sh` bumps `kerfjs`, `eslint-plugin-kerfjs`,
`create-kerf-component`, and `@kerfjs/ui` together. The dedicated
`release-ui.yml` workflow validates/builds without an OIDC token, transfers only
`ui/dist/` as an artifact, and publishes from a token-holding job that runs no
dependency install or build scripts. Beta versions are applied ephemerally.
