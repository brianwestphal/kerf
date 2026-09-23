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
import { AppTab } from "@kerfjs/ui/app-tab";
import { Toolbar } from "@kerfjs/ui/toolbar";
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
manual delivery. Type-only imports from the root include the named AppTab,
TabBar, ToolbarControlGroup, and Select presentation axes, matching their
explicit component subpaths without adding runtime code. `foundation.css`
defines Web Awesome-compatible semantic
defaults for neutral, brand/info, success, warning, and danger roles. Stateful
components expose scoped custom properties, so an application may override the
complete theme, one semantic tone, or one instance.

The CSS-free `@kerfjs/ui/css-values` subpath and root barrel export branded
primitive-string dimension builders (`px`, `rem`, `em`, `pct`, `space`,
`lengthVar`, `plus`, and `calc`). Complete `CssLength` values are distinct from
non-standalone `CssLengthExpression` arithmetic. `Row.gap` and `List.gap` accept those
complete values or direct finite `UiSpaceName` shorthands, replacing its former
unrestricted CSS string while keeping boolean component-default spacing.
Property grammars remain distinct: `flex()` returns `CssFlex` for `List.flex`;
`Skeleton` sizes accept typed lengths plus finite intrinsic keywords;
`uiColor()` and `colorVar()` return `CssColor` for choice icons. List rows use
classes, public tokens, and props rather than declaration-string `style` slots.
Media-query grammar remains separate and semantic pixel inputs remain numbers.

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
import type {} from "@kerfjs/ui/webawesome";
import "@kerfjs/ui/webawesome.css";
import "@awesome.me/webawesome/dist/components/button/button.js";
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
moving its label. Accordion, Card, Details, Callout, and Include use the shared
8px logical inline margin around their complete surface and 8px inner padding;
Accordion keeps connected item borders by owning the margin at group level.

`Select` is a Web Awesome adapter. Rendering it is pure; custom-element
registration happens only after `import '@kerfjs/ui/select/register'`. Web
Awesome is an optional peer so apps that use neither that registration entry
nor `webawesome.css` do not install or bundle it. Option icon slots carry
stable per-select/per-choice morph keys and preserve the upgraded custom
element's slot state across application rerenders. Custom selected content is
keyed by the controlled value, so it is replaced when the selection changes
instead of retaining stale content. A nonempty `label`, or otherwise `ariaLabel`,
names the actual shadow combobox. The ariaLabel-only label is visually hidden by
the package without adding height, including with `renderSelected`; host ARIA
attributes alone are not sufficient. `hint` supplies persistent supporting text
below the control through Web Awesome's native hint relationship, while
`placeholderText` remains the empty value inside the closed control; loading
placeholders preserve the visible hint. The accessible description belongs to
the shadow `combobox`, not the `wa-select` wrapper; both Web Awesome's hint
attribute and explicit hint slot resolve there without an application patch.
Unit name-projection coverage lives in `ui/tests/unit/components.test.tsx`; the
three-engine accessible-name/description, keyboard, rerender, and geometry regression is
`ui/tests/browser/select-accessibility.spec.ts`.

## 21.3 Initial component set

| Family                  | Exports                                                                                      | Responsibility                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Icons                   | `LucideIcon`                                                                                 | Render Lucide icon-node data; decorative by default, labeled on request                                                                                                                                                                                                                                                                                                        |
| Toolbars                | `Toolbar`, `ToolbarControlGroup`, `ToolbarText`                                              | Leading/center/trailing structure plus typed compact/tight, icon/text/mixed/avatar, selected-chrome/tone, nested-dropdown, and profile-scrim control groups                                                                                                                                                                                                                    |
| Lists and menus         | `List`, `ListItem`, `ListActionRow`, `ListHeader`                                            | Stretch-aligned vertical layout with optional gap/flex/scroll/divider ownership; navigation/action rows, sibling primary/trailing row actions, and section headings with semantic count/countLabel pills, plus narrow typed `data-*` and popover-relationship extension slots but no domain commands                                                                           |
| Horizontal layout       | `Row`                                                                                        | Horizontal flex composition with physical horizontal and vertical alignment, typed spacing, and opt-in wrapping; defaults to left/full alignment, the `xs` gap, and no wrapping.                                                                                                                                                                                               |
| Tabs                    | `AppTab`, `TabBar`, `wireTabBars`, `reorderTabs`                                             | Controlled tab/close markup with typed rail/segmented/inspector presentation, intrinsic/fill allocation, compact and icon-only tabs, label truncation, trailing-action adjacency, fixed rails, horizontal overflow, edge autoscroll, pointer/keyboard reorder, and focus restoration; the app owns state, persistence, and outer placement                                     |
| Layout                  | `Toolbar`, `ToolbarText`, `ToolbarControlGroup`, `ValueTable`, `ValueTableRow`               | Panel/dialog/page headings composed as plain toolbars with an optional icon group, an extra-large title, grouped trailing controls, and app-owned supporting copy; and typed semantic definition-list rows with optional leading icons                                                                                                                                         |
| Overlay surfaces        | `DialogSurface`, `PopupSurface`                                                              | Typed Web Awesome dialog sizes/presentations, independent body/footer geometry, and standard/compact/zero-inset dropdown menus while the app retains state, focus, dismissal, content, and outer placement                                                                                                                                                                     |
| Resize                  | `ResizableRegion`, `wireResizableRegions`                                                    | Pointer-captured resize plus arrows, Shift acceleration, Home, End, an optional decorative handle glyph, and typed separator/collapse/overflow/responsive/restore policies                                                                                                                                                                                                     |
| Choice controls         | `SegmentedControl`, `Select`                                                                 | Controlled exclusive buttons with toolbar/rounded/pill presentation; grouped Web Awesome popup choices with form, borderless-toolbar, intrinsic-navigation, compact, icon-only-selected, truncating, and group-owned-focus presentations                                                                                                                                       |
| Search                  | `TokenSearchField`, `readTokenSearchField`, `placeTokenSearchCaret`, `wireTokenSearchFields` | DOM-owned free text plus controlled ordered atomic filter chips; optional animated standalone or toolbar-group collapse; DOM reading, Enter submission, and caret-preserving keyboard deletion without application query grammar                                                                                                                                               |
| Feedback                | `StateBanner`, `EmptyState`, `LoadingSpinner`, `Skeleton`                                    | Status/alert with an optional terse tone-tinted badge, empty/busy, meaningful/decorative progress, and a subtle unanimated loading-placeholder block                                                                                                                                                                                                                           |
| Loading placeholder     | a component's `placeholder` prop                                                             | Value-bearing components (`Select`, `ListHeader`, `ListItem`, `ValueTableRow`, `SegmentedControl`, `StateBanner`, `AppTab`, `ToolbarText`, `ListActionRow`) render their real chrome with value slots as `Skeleton` blocks and interactivity disabled, so a parent composes a faithful loading view (e.g. an inspector) without hand-rebuilding markup                         |
| Component catalog shell | `Catalog`, `CatalogExample`, `CatalogExampleStack` + `wireCatalog` (`@kerfjs/ui/catalog`)    | An opt-in, subpath-only whole-screen shell — collapsible category sidebar + titled preview stage + resources footer + related-entry selector — with public preview-layout helpers whose safe `rootAttributes` carry authoring `data-*` metadata; controlled/stateless (the app owns `active`/`collapsed`/`theme` and computes the preview `content`). See `ui/docs/catalog.md` |

Catalog demos follow the single
[`ui/docs/catalog.md` authoring contract](../ui/docs/catalog.md#catalog-demo-authoring-contract).
The published `ui/ai/catalog-authoring.json` companion artifact lets AI tools
discover that contract, its exact API signatures, imports, helpers, and metadata
slot without mixing authoring rules into the per-entry component catalog.

## 21.4 Accessibility contract

- All interactive elements retain visible `:focus-visible` treatment and usable
  target sizes. Icons are `aria-hidden` unless they carry a supplied label.
- `StateBanner` defaults to polite `status`; callers opt into assertive `alert`
  only for immediate action. Keep an optional badge terse; its text is announced
  as part of the banner, and its tone must not be the only conveyed meaning.
- Panel, dialog, and page headings use a plain top `Toolbar`: an optional icon
  group and a direct extra-large `ToolbarText` in the leading zone, grouped
  controls in the trailing zone, and optional app-owned supporting copy below.
  The app links title/supporting-copy ids to a dialog or panel and sets
  `headingLevel` when a page or section title needs a heading landmark.
- `ResizableRegion` renders a focusable ARIA separator with orientation and live
  min/max/current values. Its wiring returns a disposer. `handleIcon` replaces
  dormant decoration only; it does not replace separator semantics or wiring.
- `SegmentedControl` labels a group of native pressed buttons. Every enabled
  choice stays in sequential Tab order; the app handles its action and owns the
  selected value.
- Managed Select All deletion keeps the controlled replacement editor open and
  focused before the next keystroke. Applications persist both query and remaining
  tokens from the DOM read; outside blur and empty Escape retain normal collapse.
- `TokenSearchField` exposes a named contenteditable searchbox, atomic chips
  with named edit/remove buttons, and a named clear action. The application
  owns parsing, suggestions, result feedback, and state; editable text remains
  DOM-owned between controlled token changes to preserve the caret.
  `wireTokenSearchFields` restores focus and the text-relative caret when
  keyboard chip deletion causes controlled rendering to replace the editor. Managed
  clear also keeps an adopted field open and restores the replacement editor for
  continued typing before the next input task, without a frame-delayed gap that could
  route a shortcut letter to the page, while respecting disposal and focus moved elsewhere. Its leading
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
  restoration after reorder or automatic activation replaces the strip, and a
  disposer. The app applies changes and owns order,
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

The [public component integration workflow](../ui/docs/component-integration.md)
uses the canonical v1 catalog as the manifest for first-party components. Its
dry-run/check pair reports package exports, tsup entries, root-barrel exports,
CSS delivery, demo registry/routes, and AI signature drift in one pass instead
of allowing those surfaces to fail sequentially.

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
under a distinct collapsible ecosystem section with category subgroups. The
canonical recommendation metadata projects visible `Discouraged` sidebar tags
onto the 15 superseded or exceptional choices while leaving Popup available as
a conditional low-level primitive. Catalog entries expose reusable short tags
for the same kind of decision metadata, while a
dedicated gallery spans Web Awesome actions, forms, structure/navigation,
feedback, media, and formatting. The catalog includes every ToolbarControlGroup
variant, a responsive toolbar find composition, toolbar/rounded/pill
SegmentedControl variants, editable, disabled, single-line, and multiline
TokenSearchField states, all StateBanner tones with optional title badges
plus a scoped palette override, reorderable overflowing tabs, light and dark
themes, contrast, motion, selection, resize, and feedback states.
The tone labels above the StateBanner examples are catalog-only specimen chrome;
they derive the shared 8px margin + 1px border + 8px padding inset so their text
aligns with each banner's leading icon without adding a component API.
The numbered pills beside the banner titles exercise the production `badge`
option and inherit each banner tone.
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

`ui/ai/component-catalog-v2.json` is a deterministic composition projection
over the v1 inventory. It gives every entry a package-qualified identity and
formal parent/context, zone/cardinality, child, state, wiring, responsive,
layout, accessibility, styling-boundary, diagnostic, and provenance sections.
Permissive defaults avoid invented restrictions; documented objective rules
live in a small override registry. The v2 schema and consumer types ship beside
the artifact, while the matching consumer extension schema/example preserves
application package identity. The catalog gate checks v1/v2 completeness and
drift plus adversarial invalid contracts.

`ui/ai/compile-time-contracts-v1.json` is the declaration-facing companion:
stable `KUI-T###` ids map provable invalid states to public imports, emitted
symbols, and catalog identities. Its positive/negative consumer fixture is
compiled once through source path mappings and again through declarations
extracted from the actual packed tarball. This covers conditional prop modes,
accessible naming, literal controlled identity, protected attribute slots, and
required controlled callbacks. Public multi-content zones share the recursive
`KerfUiContent` contract, which accepts `SafeHtml`, runtime-empty values, and
readonly nested arrays while rejecting arbitrary strings, numbers, and signals;
the typed CSS-value contract similarly distinguishes finite `List.gap`
shorthands, complete branded `CssLength` values, and non-standalone arithmetic
expressions across both source and packed declarations;
TypeScript still cannot inspect semantics hidden inside an already-produced
`SafeHtml`, live DOM relationships, disposer invocation, or dynamic datasets.
Migration guidance lives in `ui/docs/type-contracts.md`.

`ui/ai/application-ui-profile.defaults.json` and its schema/types/API define
the project-policy layer above the catalogs. A checked-in
`.kerf-ui-profile.json` locates Kerf and consumer catalogs, chooses preferred
components/recipes for recurring concepts, constrains theme and density,
records public semantic-token overrides and layout/responsive conventions, and
allows only narrow path-scoped rule exceptions with rationale. Discovery merges
package defaults, workspace policy, and parent-to-child directory policy with
source provenance. The profile gate rejects stale catalogs, unknown
components/tokens/rules, preference conflicts, and broad exemptions at every
layer before later overrides are applied. ESLint consumes the shipped
synchronous projection of the same contract and maps load or validation
failures to `KUI-L090`.

`kerf-ui-analyze` is the package's static integration evaluator. It joins the
resolved profile with Kerf and consumer catalog boundaries, parses CSS and
TSX/JSX without executing application code, and emits stable `KUI-L###`
diagnostics for private selectors, unknown tokens, competing geometry owners,
repeated insets, forced component dimensions, off-scale literal spacing,
nested scroll owners, and dynamic class expressions needing human review.
Catalog `cssValueProps` also drive exact diagnostics for raw or unknown
shorthands, wrong-dimension helpers, uncomposed expressions, forbidden
declaration lists, and exceptional spacing in JavaScript/TypeScript calls and
JSX. First- and third-party catalogs use the same contract.
Each source resolves its own parent-to-child directory profile and only receives
facts from its reachable relative CSS import graph, so sibling monorepo apps do
not leak policy or same-named class behavior into one another. Shared stylesheet
diagnostics are evaluated under every importing source policy and deduplicated;
an exception cannot hide a violation from a sibling consumer that has not made
the same narrow policy decision.
Text, versioned JSON, and SARIF outputs use repository-relative locations and
exact path-scoped profile exceptions. Errors fail by default; CI can opt into
`--fail-on-review`. The analyzer is deliberately conservative: it reports only
mechanically established problems and routes ambiguous composition to review.
Recursive discovery excludes nested `.claude/worktrees` checkouts so generated
or tool-owned repositories cannot leak duplicate source and policy into the
containing application.
See `ui/docs/ui-analyzer.md` for the CLI and rule contract.

`kerf-ui-evaluate` is the browser-backed downstream evaluator. Given a running
application and the resolved project profile, it uses Playwright to cover wide,
intermediate, narrow, 200%-zoom-equivalent, light, dark, and reduced-motion
contexts across Chromium, Firefox, and WebKit. Stable `KUI-B###` diagnostics
cover rendered overflow/clipping/reachability, focus and representative keyboard
operation, accessible names, contrast, 44px targets, scroll ownership, declared
alignment edges, and cataloged runtime geometry. Its versioned JSON report
contains focused DOM/computed-style evidence and SHA-256-addressed screenshots
under an explicit retention policy. The suite-v3 hierarchy, rhythm, density,
alignment, aesthetic-fit, and perceived scroll-quality rubric remains a
separate named-reviewer record; the evaluator never manufactures those ratings.
See `ui/docs/ui-evaluator.md` for CI and AI-agent usage.

`kerf-ui-doctor` is the unified application repair-loop command above those
focused tools. It merges profile/catalog and local generated-metadata checks,
TypeScript, the installed Kerf UI ESLint preset, static analysis, and an
explicitly enabled browser evaluation into one versioned, repository-relative
report. Full and changed modes, workspace-package selection, exact reasoned
suppressions, a dependency-aware cache, path redaction, and deterministic
clean/findings/configuration/cancelled exits prevent partial or empty runs from
appearing clean. Full traversal applies the same generated-directory boundary
(`dist`, `coverage`, dependency/cache/evidence directories, and nested
`.claude/worktrees`) to TypeScript, ESLint, analyzer, and cache inputs. Static
stages do not import application modules; only the
explicit browser stage executes a running app. See `ui/docs/ui-doctor.md`.

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
The composer reference keeps one visible form surface with toolbar title and
supporting-copy hierarchy, fields and actions on the shared 8px control gutter,
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
