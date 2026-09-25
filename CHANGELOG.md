# Changelog

- Added `wa-dialog.hide-actions` support to `@kerfjs/ui/webawesome.css`, hiding
  Web Awesome's directly exported `header-actions` shadow part for dialogs that
  provide their own dismissal affordance.

All notable changes to **kerf** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Replaced the UX catalog's four-gradient checkerboard with one repeated SVG
  tile so the preview pattern continues through below-fold content.
- Added explicit native `slot` support to every stable single-root
  `@kerfjs/ui` visual component, including alternate render branches, while
  keeping multi-root `ResizableRegion` and `CollapsiblePanel` excluded.
- Fixed the UX catalog's desktop grid sizing so both the sidebar and component
  detail can scroll all the way to their final content while narrow layouts
  retain normal document scrolling.
- Fixed single-line `ToolbarText` clipping glyph descenders while retaining its
  horizontal ellipsis behavior.
- Formalized UX catalog demos as components, compositions, or recipes; catalogs
  now group and order those kinds consistently and label compositions with a
  visible tag instead of title suffixes.
- Removed stale Web Awesome guidance that still advertised the deleted
  aggregate theme route; focused component routes remain the supported catalog
  surface.
- Aligned Web Awesome Accordion and Details disclosure geometry: plain Details
  keep a flush body, plain Accordion items use the 8px surface inset throughout,
  framed Details use 16px on the trigger and 8px on the body, and framed
  Accordion items use 16px throughout.
- Added a first-class `@kerfjs/ui/grid` layout primitive for any positive
  equal-width column count, with typed gap and flex values and zero-minimum
  fractional tracks that stay equal when child content has different intrinsic
  widths.
- Made accent and filled-outlined Web Awesome badge variants meet WCAG AA at
  their compact text size while preserving loud accent fills and outlined
  borders.
- Added independent typed `tone`, `size`, and `font` presentation roles to
  `@kerfjs/ui/text`, covering quiet/danger copy, compact metadata, and monospace
  identifiers without global utility classes or appearance-only heading levels.
- Made filled Web Awesome badges use a quiet semantic fill with normal text by
  default, preserving variant tint while meeting WCAG AA for their compact text.
- Fixed nested Rows and Lists inheriting inset values for sides that were not
  selected on the inner layout component.
- Fixed migrated `Text` instances in Catalog and passive `ListHeader` labels
  retaining nested padding or border geometry that offset their visible content.
- Added `Row.vAlign="baseline"` for native flex cross-axis baseline alignment;
  `List.vAlign` remains limited to values supported by vertical main-axis
  distribution.
- Added a first-class `@kerfjs/ui/text` component for native `h1`–`h6` and
  paragraph semantics with standard transparent-border and content-padding
  geometry and margin-neutral defaults; it renders `p` when `variant` is omitted,
  and Kerf UI's headings and prose now use it.
- Added the shared physical `Sides` contract to `List` and `Row` text/control
  insets and to `ListInsetText` / `ListInsetControl`; inset wrappers now default
  to all four sides, while `ListInsetText.horizontalOnly` remains a deprecated
  compatibility alias for `sides="rl"`.
- Added `ListHeader.inline` for shrink-wrapped section labels that remove the
  component root's outer margin, border, and padding while preserving title,
  count, action, and disclosure behavior.
- Added a catalog-driven public-component integration validator for
  `@kerfjs/ui`, including an all-at-once dry-run report across package, build,
  barrel, CSS, demo, route, signature, and compatibility surfaces.
- Added one change-local `@kerfjs/ui` verification command that synchronizes
  generated projections, runs component/bundle/type coverage, builds the demo,
  reports exact gzip deltas, and records reviewed budget updates with reasons.
- Made every `@kerfjs/ui` Playwright invocation build current catalog source
  after fast preflights, with a served source digest that rejects stale preview
  output during focused browser runs.
- Added durable Hot Sheet phase timing for active work, local verification,
  push hooks, CI, and publication, including safe failure aggregation and
  per-ticket summaries.
- Added typed flex participation to `Row`, matching `List`'s boolean, finite
  keyword, and branded `CssFlex` contract.
- Added a first-class horizontal `Row` with typed spacing, physical-axis
  alignment, and opt-in wrapping; `List` now supports the same alignment
  vocabulary while retaining its existing defaults.
- Refined compact mixed `ToolbarControlGroup` selections to retain standard
  horizontal padding, remove the internal separator, and raise the selected
  surface over the outer border; avatar group hover now preserves image fitting.
- Moved the comprehensive local `npm run check` gate from pre-commit to
  pre-push so coherent commit batches pay its cost once; pre-commit now performs
  only Git's staged whitespace check, and multi-source AI guidance files are
  excluded from repository-wide Prettier enforcement.
- Fixed `create-kerf-component` releases carrying a stale composition-catalog
  schema by generating the bundled copy from `@kerfjs/ui`'s canonical schema
  and gating both the root check and interactive release flow against drift.
- Added catalog-driven CSS value diagnostics across `eslint-plugin-kerfjs`,
  `kerf-ui-analyze`, and `kerf-ui-doctor`. Stable `KUI-L013`–`KUI-L017`
  findings now identify raw or unknown values, wrong-dimension helpers,
  incomplete expressions, declaration-list escapes, and review-worthy
  off-scale spacing from first- or third-party component catalogs.
- Extended the property-specific `@kerfjs/ui/css-values` contracts: `List.flex`
  now uses finite keywords or `flex()`, `Skeleton` dimensions use `CssSize` and
  `CssLength`, and `SelectChoice.color` uses `uiColor()` or `colorVar()`.
  Removed the unrestricted `style` escape hatches from `ListItem` and
  `ListActionRow` before the 5.0 stable release; use `className`, public tokens,
  and cataloged props instead.
- Added typed, CSS-free `@kerfjs/ui/css-values` builders and branded complete
  versus expression length types. `List.gap` now accepts direct spacing-token
  shorthands or complete `CssLength` values and rejects unrestricted CSS strings.
- Added the public recursive `JSXChildren` type from both `kerfjs` and
  `kerfjs/jsx-runtime`, giving third-party function components a canonical
  declaration for nullable, signal-backed, and arbitrarily nested readonly
  child content that matches the runtime.
- Added the public recursive `KerfUiContent` type across semantic UI content
  zones, so nullable conditionals and mutable or readonly nested component
  arrays compose directly without a `Fragment` while raw strings, numbers, and
  signals remain rejected outside explicit text positions.
- Fixed bottom `Workbench` drawers overshooting and snapping during collapse
  transitions by anchoring fixed-height content to the shell's stable bottom
  edge.
- Fixed bottom `CollapsiblePanel` drawers overshooting their open position and
  snapping back by anchoring fixed-height content to the panel's stable bottom
  edge throughout the transform transition.
- Formalized named `SafeHtml` prop slots as explicit `zone.jsx.prop` bindings
  in the UI composition catalog and generalized `ui-composition` linting beyond
  Toolbar, including statically visible `children`, cardinality, aliases,
  namespaces, arrays, fragments, and branches.
- Added `ToolbarControlGroup.avatarImage`, painting contained avatar imagery on
  a lone group or on the pressed highlight when the group has multiple buttons.
- Split the AppTab and TabBar catalog routes into focused component specimens,
  and moved their controlled selection, tabpanel, overflow, add/close, and
  reorder lifecycle into a separate application-tabs composition demo.
- Fixed `wireNavStack` focus ownership across controlled navigation: pushes
  focus the new top view, pops restore its remembered descendant, and removed
  targets fall back through `data-nav-focus`, the first enabled control, and
  the view container.
- Fixed compact mixed-content `ToolbarControlGroup` dropdown triggers being
  forced into an icon-only width, which painted the label across its separator
  and the Web Awesome caret outside the group.
- Made `ListItem` clip label, status, and dormant trailing painting to its
  rounded row boundary so compact and constrained rows cannot visibly overflow;
  described rows now grow enough to keep their owned two-line label readable.
- Fixed compact toolbar `Select` focus to follow its owning group's pill or
  rounded geometry and restored consistent spacing between popup icons and labels.
- Fixed the compact-toolbar recipe's independent overflow action to use the
  same full-height pill geometry as its adjacent toolbar controls.
- Fixed the catalog footer's `Components` relationship selector to fit its icon
  and plural label and give popup headings/items consistent border clearance.
- Fixed a collapsible `TokenSearchField` inside a rounded
  `ToolbarControlGroup` retaining its independent pill radius instead of using
  the group's shared concentric highlight radius.
- Updated the header-composition catalog demo's supporting copy to use the
  horizontal `ListInsetText` geometry, aligning it with the value-table content
  edge across responsive, RTL, and zoomed layouts.
- Updated the `Pane` catalog demo's secondary header copy to use
  `ListInsetText`, aligning it with the standard pane content gutter at wide and
  narrow sizes instead of maintaining demo-only padding.
- Completed `NavStack` navigation transitions by cross-fading top and bottom
  chrome alongside content slides, added per-view bottom toolbars with a
  persistent fallback, and replaced the static focused demo with a working
  push/pop flow.
- Replaced the static compact `SplitView` detail specimen with a controlled,
  interactive list-to-detail drill-down whose Back action restores the list;
  the roomy example now demonstrates controlled selection as well.
- Documented and demonstrated list-first dialog bodies: use `List` with
  `bodyInset="none"`, and wrap bare dialog copy in `ListInsetText` so content
  shares the standard list gutter without double-insetting.
- Fixed `@kerfjs/ui`'s collapsible `TokenSearchField` keep-open ownership in
  WebKit: when `focusout.relatedTarget` is missing during pointer activation of
  an external `data-token-search-keep-open` surface, the helper now uses the
  actual pointer target instead of collapsing and removing the target before
  its click handler runs.
- Added a first-class vibrant `pop` semantic color for attractive non-status
  emphasis, with complete light/dark/increased-contrast token roles and typed
  StateBanner, ListHeader indicator, and ToolbarControlGroup selected tones.
- Fixed canonical `Select` popup animation reversals so an earlier close cannot
  hide a reopened menu after resizing. Canceled transitions retain the accepted
  state, and removed controls cannot receive stale completion or deferred focus.
- Fixed managed `TokenSearchField` Clear focus before the next input task, so
  immediate typing stays in the replacement editor instead of triggering page
  shortcuts; genuine later focus handoffs and selections remain untouched.
- Fixed `@kerfjs/ui/tab-scaffold` bottom-tab labels being vertically clipped by
  flex shrinkage while retaining horizontal ellipsis for long labels.
- Made inset selection and hover highlights follow their owning control's pill
  or rounded shape, with concentric inner radii derived from the full inset.
- Fixed animated `ResizableRegion` overlays so remembered desktop dimensions
  cannot make their content overflow the responsive panel cap on narrow screens.
- Added configuration-first application-panel policies across `ResizableRegion`,
  `Workbench`, and `CollapsiblePanel`: separator visibility, instant-track
  collapse with optional composited content motion, popup-safe overflow,
  inline/overlay/hidden responsive presentations, and safe-area restore-control
  placement. `wireResizableRegions` now suppresses motion during pointer drags
  and ignores unavailable regions; `wireSidebar` supports hidden compact
  replacements and exclusive overlays.
- Added typed `TabBar` allocation/presentation/action-placement and `AppTab`
  presentation/size/label-width variants for segmented inspector strips,
  compact drawer tabs, icon-only accessible tabs, and truncating labels.
- Added typed `ToolbarControlGroup` size, density, content anatomy, selected
  chrome/tone, nested-dropdown, and avatar scrim variants.
- Added typed `Select` form, borderless-toolbar, intrinsic-navigation, compact,
  icon-only-selected, truncation, and composed focus-ring variants.
- Added `DialogSurface` and `PopupSurface` composition APIs for standard dialog
  sizes/presentations, independent body/footer insets, and list-compatible popup
  menu insets without consumer `::part()` overrides.
- **Breaking (`@kerfjs/ui`):** removed `PanelHeader` and its subpath/CSS export.
  Compose page, panel, and dialog headings directly with `Toolbar`, a direct
  extra-large `ToolbarText`, and optional `ToolbarControlGroup` icon/action zones;
  keep supporting copy as app-owned content below the toolbar.
- Fixed controlled TokenSearchField Select All + Backspace/Delete collapsing the
  editor: managed deletion keeps the adopted open signal and restores replacement
  focus before another keystroke, without a stale animation-frame caret reset.
  The adoption demo now persists both edited text and remaining tokens.
- Fixed `Select` controls using only `ariaLabel` being unnamed to assistive
  technology. Ordinary and custom selected content retain their geometry while
  the actual shadow combobox receives its accessible name.
- Added first-class `Select` hint text below interactive and loading-placeholder
  controls while keeping empty-value `placeholderText` semantically distinct.

- Changed the Web Awesome Dialog theme to use 8px body padding and 16px footer
  padding, independently of the component's shared `--spacing` value.

- Fixed `kerf-ui-doctor` so its isolated Kerf ESLint pass preserves applicable
  consumer core rules and suppression reporting options. Playwright's required
  `no-empty-pattern` fixture suppression no longer becomes a false unused
  directive while consumer plugin rules remain outside the doctor boundary.

- Cataloged `SplitView` and its documented
  `--kui-split-view-list-width` override so `kerf-ui-doctor --full` accepts the
  public token in downstream application stylesheets.

- Added the first-class `List` vertical-layout component with gap, flex, scroll,
  and multi-edge divider options; `Toolbar` now uses the same typed
  `dividerSides` contract instead of a boolean divider.

- Added an optional tone-tinted pill badge beside `StateBanner` titles, including
  loading skeleton behavior and per-instance badge color overrides.

- Fixed pending `wireTabBars` and `wireTokenSearchFields` controlled-render
  callbacks moving focus after their owning wiring had been disposed.

- Changed the default `ListItem` leading icon visual from 24px to a root-scaled
  18px while retaining the row's 44px minimum target and first-line alignment.

- Fixed managed `TokenSearchField` clear losing focus or collapsing when an
  application replaces its controlled editor; continued typing now works without
  an application reopen callback.

- Fixed `@kerfjs/ui` automatic TabBar keyboard activation losing focus when a
  controlled selection replaces the strip; navigation restores the same logical tab.

- Updated the published setup runtime to patched `minimatch` 9.0.9 and `yaml`
  2.9.1 releases, resolving the known regular-expression denial-of-service and
  deeply nested YAML denial-of-service advisories without narrowing Kerf's
  supported Node.js range.
- Fixed `kerf-ui-doctor --full` so its isolated ESLint stage shares the same
  generated-directory exclusions as TypeScript, static analysis, and cache
  hashing; populated `dist`, `coverage`, dependency, cache, evidence, and nested
  worktree directories no longer produce application diagnostics.
- Changed `@kerfjs/ui` component-library design templates to compose their
  individual variant SVGs through HTML and `domotion capture
--flatten-nested-svg`, eliminating the hand-built nested-SVG compositor and
  making top-level template sheets reliable in Sketch.
- Added a typed `shape` option to `SunkenPanel`: `rounded` remains the default,
  while `square` produces a lowered surface with `border-radius: 0` for flush or
  edge-to-edge application areas. Both shapes now appear in the UX catalog.
- Made the Catalog geometry overlay derive both margin bands and border
  edges/radii from each live specimen's computed CSS. Public example helpers now
  mark their generated labels and notes for automatic exclusion, and stylesheet,
  theme, DOM, and resize changes refresh the overlay without duplicated demo
  measurements.
- Updated the `@kerfjs/ui` SVG design-template generator to `domotion-svg`
  0.30.1 and enabled `--flatten-nested-svg`, so inline component icons are
  emitted as Sketch-compatible groups without changing their browser rendering.
  The offline template gate now rejects variant captures that reintroduce nested
  `<svg>` elements.
- Fixed `kerf-ui-doctor` and `kerf-ui-analyze` recursive discovery so nested
  `.claude/worktrees` checkouts are excluded from source diagnostics, doctor
  cache inputs, TypeScript, and ESLint.
- Added `npx kerfjs setup` and the `kerfjs/setup` automation API for safe,
  AI-first initialization and migration of core and UI projects. The command
  provides bounded dry-run diffs, explicit per-conflict keep/Kerf choices,
  package-scoped hash-backed upgrades, monorepo selection, transactional
  rollback, shipped guidance, strict TypeScript/ESLint, and UI catalog/profile
  and doctor discovery. Empty application component metadata now emits a valid
  empty v2 catalog. Existing JSONC TypeScript configuration is structurally
  merged without discarding comments, trailing commas, authored fields, or line
  endings; malformed roots and compiler-option containers require an explicit
  keep/Kerf decision. Workspace selection now evaluates ordered globstar,
  brace, exclusion, and re-inclusion patterns deterministically across npm,
  Yarn, and pnpm declarations, rejects path/symlink/name ambiguity, and uses
  manager-correct offline commands with explicit Yarn Classic/Berry detection
  and network-disabled Berry installs.
- Added `@kerfjs/ui/doctor` and the `kerf-ui-doctor` command: a versioned, redacted repair-loop report that merges catalog/profile validation, TypeScript, Kerf UI ESLint, static analysis, and opt-in browser evaluation with changed/full modes, monorepo selection, reasoned suppressions, caching, and deterministic exits.
- Added the public Playwright-backed `kerf-ui-evaluate` CLI and `@kerfjs/ui/evaluator` Node API. It resolves application profiles and composition catalogs, exercises wide/intermediate/narrow/200%-zoom, light/dark, and reduced-motion contexts across Chromium, Firefox, and WebKit, and emits versioned repair-oriented `KUI-B###` diagnostics plus focused DOM/style evidence and hashed screenshots. Subjective visual quality remains an explicitly separate unrecorded reviewer rubric.
- Added `kerf-ui-analyze`, a profile- and catalog-aware static evaluator for Kerf UI integrations. It resolves directory policy per source, follows project-local CSS import graphs without cross-package class leakage, and evaluates shared stylesheets against every consuming source policy before deduplicating findings. Stable portable text, JSON, or SARIF diagnostics cover private selectors, unknown tokens, competing geometry/scroll owners, repeated insets, forced dimensions, off-scale spacing, and dynamic-class review, with exact scoped profile exceptions, a public report schema, and configurable CI review failure.
- Added catalog/profile-aware `recommended-ui` and `strict-ui` flat presets to `eslint-plugin-kerfjs`. Toolbar zone acceptance/cardinality and valid wiring imports come from the shipped catalogs; intrinsic or unknown zone children, root/subpath/namespace wiring, and the non-colliding `KUI-L090` load diagnostic are covered by real packed downstream installs on every supported ESLint major.
- **Breaking (`@kerfjs/ui` TypeScript declarations):** strengthened invalid-integration contracts for ListHeader modes, Select naming and literal choice identity, SegmentedControl/TabScaffold literal identity, collapsible TokenSearchField props, protected editor metadata, PanelHeader summary ids, ToolbarText line caps, and token-removal callbacks. Added named public unions for previously anonymous finite variants plus source and packed-tarball positive/negative compilation gates. See `ui/docs/type-contracts.md` for the compatibility review and dynamic-data widening syntax.
- `create-kerf-component` now scaffolds explicit `kerf.components.json` AI metadata and a deterministic `kerf-component-catalog` generator/checker. Generated v2 entries carry package identity, purpose, verified named exports, composition and geometry ownership, tokens, accessibility, and source links; publishing rejects missing author decisions, schema-invalid source/output fields, deleted sources, renamed exports, duplicate ids, or output drift, including multi-package workspaces. Syntax-aware TypeScript/TSX export discovery prevents JSX text, nested scopes, comments, and literals from impersonating public exports.
- Added a versioned application UI profile for AI tools and static evaluators. Shipped package defaults, schema, TypeScript types, Node discovery/merge/validation APIs, and a workspace example now make catalog locations, preferred components/recipes, theme/density policy, semantic token overrides, responsive/layout conventions, and narrow source-located exceptions explicit. Composition-only generated consumer catalogs load without a fabricated v1 selection artifact, while Kerf retains its required v1 selection catalog. Deterministic package → workspace → parent-to-child directory precedence validates every raw layer before merge, attributes resolved diagnostics through field provenance, and rejects stale catalogs, unknown components/tokens/rules, conflicts, malformed value shapes, and broad exemptions.
- Fixed `CatalogExampleStack` accessible labels: the helper now renders a semantic `section`, so a supplied `label` exposes the documented named region to assistive technology while an unlabeled stack remains an ordinary grouping.
- Added first-class `Pane` and `SunkenPanel` primitives to `@kerfjs/ui`. `Pane` standardizes semantic header/content/footer columns, explicit logical-edge separators, and one content scroll owner; `SunkenPanel` supplies one lowered surface with an 8px inset and vertical rhythm. The Catalog shell now dogfoods `Pane`, and both components ship focused demos, catalog metadata, documentation, and three-engine browser coverage.
- Added the package-qualified component catalog v2 alongside the compatible v1 artifact. Its schema and generated metadata formalize child zones, cardinality, exclusivity, wiring, state, responsive behavior, layout and accessibility boundaries, stable validation diagnostics, provenance, and consumer extension catalogs, so AI tools can join Kerf and application components without guessing composition contracts.
- Added an AST-based Catalog demo conformance gate. It checks every first-party demo for public helper usage, package imports, focused specimen structure, geometry-overlay metadata, and reviewed schema-checked exceptions, with adversarial fixtures and authoring guidance that makes the same contract available to downstream AI tools.
- Made `ui/docs/catalog.md` the authoritative Catalog demo authoring contract, covering focused versus composition previews, public row/group nesting, exact specimen selection, conditional geometry overlays, skip-marker behavior, metadata ownership, and an explicit overlay legend. A shipped `ai/catalog-authoring.json` discovery artifact now routes AI tools to that contract and exact signatures, with schema, link-integrity, and browser-consumer fixture coverage.
- Extended `CatalogExample` and `CatalogExampleStack` with typed, runtime-filtered `rootAttributes` for catalog-authoring `data-*` metadata such as `data-demo` and `data-catalog-geometry-overlay-skip`, while preserving helper-owned structural and alignment markers. The UX catalog now composes its example stacks through these public helpers instead of copying private `kui-catalog-*` markup.
- Added `revealCatalogEntry` and opt-in `wireCatalog({ revealSelection })` support to the exported Catalog tool. Sidebar or related-entry selection can now reveal the matching row after the controlled render settles, using a desktop-safe media guard, exact id matching, configurable scroll alignment/behavior, focus-preserving scrolling, and cancellation of stale rapid selections; the Kerf UX demo now uses the public behavior.
- Added a reusable consumer component-catalog extension schema and checked app-component example. Downstream packages can now publish the same selection facts and margin/border/padding ownership vocabulary as Kerf, and the README, component contract, Catalog guide, `llms.txt`, and AI skill explain how to combine package-qualified app entries with Kerf's shipped catalog for alignment decisions.
- Added an opt-in geometry inspector to the exported `@kerfjs/ui/catalog` tool. `geometryOverlay` plus `wireCatalogGeometryOverlay` now marks transparent component bounds with a dashed outline and positive intrinsic margins with devtools-style bands, excludes example labels/alignment scaffolding, stays synchronized across preview changes, and replaces the Kerf UX demo's private implementation.
- Added machine-readable margin, border, and padding ownership to every visual entry in the `@kerfjs/ui` component catalog. The additive schema distinguishes self-, parent-, child-, conditional-, and unowned geometry, and enforces complete metadata plus explanatory notes for conditional cases.
- Refreshed the standalone reactivity demo lockfile to Vite 6.4.3, PostCSS 8.5.28, and nanoid 3.3.19, clearing its development-toolchain audit advisories.
- Overrode the development toolchain's transitive esbuild dependency to 0.28.2, resolving GHSA-g7r4-m6w7-qqqr while current tsup still constrains its declared range to 0.27.x.
- Added repository-wide Prettier formatting for TypeScript, JavaScript, Astro, shell, CSS, HTML, Markdown, YAML, and JSON source and structured-content files. Root and `@kerfjs/ui` lint gates now reject formatting drift, while generated, binary, and parser-incompatible fixtures remain explicitly excluded.
- Added reusable sidebar tags to `@kerfjs/ui` Catalog entries and marked the 15 Web Awesome components superseded by preferred Kerf patterns or reserved for exceptional cases as `Discouraged` in the UX catalog. The tag is deterministically projected from the canonical recommendation metadata; Popup remains an available conditional positioning primitive.
- Aligned Web Awesome Accordion, Card, Details, Callout, and Include surfaces with Kerf content-item geometry: each complete surface now has an overridable 8px logical inline margin and 8px inner padding, Accordion keeps connected items under one group margin, and Card's header/body/footer share the full inset. Tab Panel intentionally retains the roomier 16px container inset.
- Fixed `@kerfjs/ui` Web Awesome Slider geometry: its complete interactive region now receives the shared 8px logical inline outer inset without shifting the already-aligned label.
- Styled `@kerfjs/ui` Web Awesome OTP Input like a bordered text field: its label now uses the shared uppercase xs/650 field-label treatment, and both label and hint align at the 9px border-plus-padding inset.
- Aligned `@kerfjs/ui` Web Awesome Known Date's Month/Day/Year captions and bordered text-like field hints with their values using the shared 9px border-plus-padding inline inset.
- Fixed `@kerfjs/ui` Web Awesome Color Picker geometry: its unbordered trigger now receives the shared 8px inline outer inset, aligning it with Kerf content-item spacing.
- Fixed `@kerfjs/ui` Web Awesome Checkbox Group and Radio Group option geometry: each group's unbordered option region now receives the shared 8px inline outer inset, aligning it with Kerf content-item spacing without padding the individual controls.
- Aligned the remaining bordered/padded Web Awesome chrome in `@kerfjs/ui/webawesome.css` to explicit Kerf spacing tiers: `--kui-wa-control-inset` (8px) drives tabs, inset tree selection, tags, and dropdown items; `--kui-wa-surface-margin` / `--kui-wa-surface-inset` drive bordered surface geometry; and `--kui-wa-container-inset` (16px) retains roomier Tab Panel content. Buttons already inherit the 8px form-control inset; compact badges, unframed Breadcrumb, and slotted Scroller item chrome deliberately retain their native geometry. The tiers are overridable by scope and pinned by three-engine computed-style coverage plus light/dark wide and narrow visual QA.
- Tightened the `@kerfjs/ui` Web Awesome theme's form fields to the Kerf content-item inset — a 1px border with 8px inside it (`--wa-form-control-border-width` / `--wa-form-control-padding-block` / `--wa-form-control-padding-inline` now follow `--kui-layout-item-border-width` / `--kui-layout-item-padding`), replacing Web Awesome's larger default pad, so fields land at the standard ~40px height and 9px value inset. Each field's top label is now inset by that same border + padding (9px) so it aligns with the value inside the field, and is styled exactly like a `ListHeader` label — uppercase, xs, weight 650, quiet foreground (`::part(form-control-label)` across Input/Number Input/Textarea/Select/Checkbox Group/Radio Group/Color Picker/Known Date/Time Input, plus the Slider's `::part(label)`). Inline Checkbox/Switch labels keep their sentence case.
- Added overflow controls to `@kerfjs/ui`'s `ToolbarText`: `wrap` (flow onto multiple lines instead of a single line), `ellipsis` (show the trailing … at the truncation, or hard-clip when false), and `maxLines` (cap wrapped text to N lines, ellipsizing past it). The default is unchanged — one line, ellipsized when it does not fit. `maxLines` takes effect only with `wrap`. Driven by `data-wrap` / `data-ellipsis` / `data-max-lines` attributes plus a `--kui-toolbar-text-max-lines` var; no new public classes. The UX catalog gains ellipsis/wrap/capped examples.
- Fixed a `@kerfjs/ui` `TokenSearchField` bug where selecting all content and pressing Delete (or Backspace) left a stray newline in the field. A `contenteditable` host inserts a bogus `<br>` when emptied that way in every engine — it renders as a newline and `readTokenSearchField` read it back as a space. `wireTokenSearchFields` now strips that line break after any delete input and, when the field is otherwise empty, restores the canonical empty text span and places the caret in it so typing resumes cleanly. Also clears any leftover chips in the select-all case. Regression-tested in unit (happy-dom) and across all three browser engines.
- Hardened that full `TokenSearchField` deletion for platform-specific selection
  ranges whose endpoints sit inside the first and last text spans instead of at
  the editor boundary—or whose cloned Linux range omits an atomic chip entirely.
  Full logical text-and-token selection is recognized from its value, while an
  explicit Ctrl/Cmd+A intent survives only until the next delete and is
  consumed by that delete even when the browser omits `beforeinput`, and is
  retained across a controlled editor replacement before or after
  `beforeinput`. It is captured before propagation can be stopped and
  invalidated by selection-moving keys, pointer input, blur, or another edit.
  The explicit shortcut-to-delete transition is handled deterministically:
  the helper prevents the unreliable mixed-contenteditable native mutation,
  canonicalizes the empty editor, and emits the corresponding bubbling input
  event so controlled application state clears before it can restore a chip.
  A browser can no longer preserve a controlled chip merely because its range
  shape or native deletion timing differs.
- Added a `horizontalOnly` prop to `@kerfjs/ui`'s `ListInsetText`. When true it keeps the horizontal geometry (8px inline margin, 1px left/right border, 8px left/right padding — so the text edge still lands at the 17px inset) but drops the vertical margin, border, and padding, for tight text layout that still aligns with bordered items. It applies a `kui-list-inset-text--horizontal` modifier class; the default (vertical box space intact) is unchanged. The UX catalog gains a horizontal-only example.
- Fixed a WCAG AA color-contrast failure on `@kerfjs/ui`'s selected list rows. The selected `ListItem` and `ListActionRow` used the brand accent (`brand-on-quiet`, `#1e6ef4`) for their text, which resolved to only **3.77:1** over the selected `brand-fill-normal` background (`#d6ecff`) — below the 4.5:1 minimum for normal text (flagged by axe downstream). Both now use the normal neutral foreground over the brand-tinted fill, so selection is carried by the fill and border while the text stays readable in light and dark themes. Computed-ratio browser tests pin both selected rows at ≥4.5:1 in both themes across all three engines.
- Fixed the same brand-accent contrast failure on `@kerfjs/ui`'s info `StateBanner` tone and `Select`'s current option, where the blue is a semantic (not a selection cue), so the text stays blue rather than going neutral: a new darker `--kui-color-brand-on-fill` token (`#1a5dcf` light; the compliant `#8acbff` in dark) replaces `brand-on-quiet` for brand text placed directly on a brand fill. The info banner (was 4.15:1) now clears ~5.4:1 and the current Select option (was 3.77:1) ~4.9:1. Computed-ratio browser assertions guard both.
- Completed the `@kerfjs/ui` `StateBanner` contrast pass: the `success` (was 4.05:1) and `warning` (was 4.39:1) tones failed WCAG AA the same way via their own `*-on-quiet` tokens over the tinted banner fills. New darker `--kui-color-success-on-fill` (`#00792c`) and `--kui-color-warning-on-fill` (`#8f5e00`) tokens (each keeping its semantic hue, dark values unchanged and already compliant) now back the success/warning banner text, clearing ~5.0:1 and ~5.3:1. Every `StateBanner` tone now clears 4.5:1 in both themes, guarded by an all-tone computed-ratio browser assertion.
- Added two structure primitives to `@kerfjs/ui` for aligning bare content inside a `.kui-content` list: `ListInsetControl` (`@kerfjs/ui/list-inset-control` + `.css`) wraps a control that owns its own border and padding but no outer margin (a search input, a `SegmentedControl`) with the standard 8px inline margin plus a stretch flex row and an 8px gap, so it lines up with the bordered items around it without double-insetting; `ListInsetText` (`@kerfjs/ui/list-inset-text` + `.css`) gives a bare string or inline content the content-item geometry (8px inline margin, 1px transparent border, 8px padding) so its text edge lands at the same 17px inset as bordered rows. Both are additive, take an optional `className`, and appear in the UX catalog and the component-selection guidance.
- `@kerfjs/ui`'s `wireTokenSearchFields` `onEdit` callback now also receives the originating `InputEvent` (`onEdit({ id, editor, event })`), so a consumer can gate token-commit behavior on `event.inputType` / `event.data` (e.g. commit a chip only on whitespace-terminated input) and drop its own `input` listener entirely — completing the goal `onEdit` was added for. Additive; existing `{ id, editor }` destructuring is unaffected.
- Added a CI-only visual-drift gate for the `@kerfjs/ui` SVG design templates (`check:design-templates:drift`): it re-renders every template in a browser and fails if any regenerated SVG differs from the committed one (normalizing run-to-run noise — XML comments and auto-minted ids/font names). It closes the gap the offline `check:design-templates` cannot cover and runs in CI's browser-capable job, not the offline pre-commit `check`.
- Added `FloatingToolbar` to `@kerfjs/ui` (`@kerfjs/ui/floating-toolbar` + `.css`): a transparent, forced-dark toolbar that floats over the content of its nearest positioned ancestor — a drawer-restore / floating-controls pattern — without covering dialogs or overlays (it is not top-layer). It exposes `role="toolbar"` with a required `label`, floats to a customizable `position` (`bottom-end` default, plus the other corners/edges), and is inset by `--kui-floating-toolbar-inset` (default 8px past a top toolbar's own inset). The app owns the controls and their visibility. Includes a UX-catalog demo with a show/hide toggle that auto-hides on leaving the demo.
- Added a `shape` prop to `@kerfjs/ui`'s `ToolbarControlGroup`: `'pill'` (default, unchanged) or `'rounded'` for a softer rounded-rectangle corner on the group and its items (using the design system's rounded radius). The UX catalog's ToolbarControlGroup section gains a Pill/Rounded toggle that switches every example.
- Added a **Design template** link to the UX catalog's detail-footer resources (beside demo source / component source / guidance) for every component that has a committed SVG design template, pointing at its per-component library under `docs/design/templates/`. The link is generated from the design-template manifest during `catalog:sync`, so it appears only where a template exists and stays in step as the template set grows.
- Gave the `@kerfjs/ui` `Catalog` detail footer's related-entries popup trigger a visible **"Component"** text label beside its glyph (it was icon-only), so the affordance reads as a labeled control rather than a bare icon. The trigger grows to fit the label instead of the single-group's fixed icon-button width, and the glyph stays beside the label.
- Fixed the `@kerfjs/ui` `Catalog` component's `secondarySections` ("ecosystem" group) indentation: the subsection heading sat further left than everything else while its list items sat further right, so the group read as awkwardly stair-stepped. The subsection heading now takes the same 8px content inset the list items and the group's `ListHeader` self-apply, so the group heading, its subsection headings, and their items all share one left edge — matching the primary sidebar.
- Extended the `@kerfjs/ui` SVG **design templates** (`ui/docs/design/templates/`) from the initial two components to fourteen — adding `Toolbar`, `ToolbarText`, `ListItem`, `ListHeader`, `ListActionRow`, `ValueTable`, `StateBanner`, `EmptyState`, `Skeleton`, `SegmentedControl`, `TabBar`/`AppTab`, and `TokenSearchField`, each captured (light + dark, system-font text, self-contained inlined libraries) in its common presentation combinations with realistic sample data. Added an offline sync-check gate (`check:design-templates`, part of `npm run check`) that verifies every manifest component/variant has its committed output and flags stray files. `Select` (Web Awesome runtime), the decorative icon primitives, `ResizableRegion`, the whole-screen layouts, and the `Catalog` shell are deliberately not templated (see `ui/docs/design/templates.md`).
- Extended `@kerfjs/ui`'s `wireTokenSearchFields` with three opt-in knobs for dropping a real app's hand-rolled token-search plumbing: a **focusout keep-open exception** (`collapsible.keepOpenOn(target)` or a `data-token-search-keep-open` region) so focus moving to a sibling suggestions/date/help surface no longer collapses an empty collapsible field; **opt-in atomic-chip keyboard** (`keyboard`) where, from a collapsed caret with no selection, Backspace/Delete remove the adjacent chip (reported via `onRemoveToken` for the app to apply to its controlled state) and ArrowRight moves the caret past a trailing chip; and an **`onEdit({ id, editor })`** callback fired on every editor `input` so callers can drop their own `input` listener. All are additive and off/unchanged by default (the keyboard block is opt-in; the full `collapsible: false` opt-out and per-behavior opt-outs are unchanged).
- Fixed a collapsible `@kerfjs/ui` `TokenSearchField` stretching to its full expanded width **in height** when placed directly in a flex column: the expanded size was carried on the flex `basis`, which a column reads as the cross-axis height (a ~480px-tall field). The field and its enclosing toolbar group now size their inline axis through `width` alone (`flex: 0 1 auto`), so the field stays a single line tall in any container while a toolbar row still shrinks it as before.
- Added SVG **design templates** for `@kerfjs/ui` components (`ui/docs/design/templates/`): each component captured from its real rendered HTML/CSS in its common presentation combinations via `domotion-svg`, with a per-component library file that references the individual variant SVGs. A `design-templates:build` script + `ui/docs/design/templates.md` cover regeneration, maintenance, and templating your own app-level components. Initial coverage: PanelHeader and ToolbarControlGroup.
- Fixed two `@kerfjs/ui/catalog` presentation bugs: header-action buttons that carry a text label (the built-in theme toggle) now render icon-beside-label instead of the toolbar group's icon-over-label grid, and the detail footer's related-entry selector is a single-bordered popup (a borderless `single` group around a label-less `fitMenu` select) rather than a bordered select nested inside a bordered group.
- Dogfooded the UX demo's own shell onto `@kerfjs/ui/catalog` (`Catalog` + `wireCatalog`), which surfaced and fixed three `Catalog` bugs: an active entry inside a `secondarySections` group is now found for the detail header/footer; the brand subtitle's alignment override outranks the toolbar group's default gap (it lost specificity before, dropping the logo→title gap); and the detail footer's resource links stack above the related selector at narrow widths.
- Extended `@kerfjs/ui/catalog`: `Catalog` gained a `secondarySections` prop — an optional, quieter "ecosystem" group of sections below the primary sidebar categories, with an optional disclosure toggle (`wireCatalog` gains `onToggleSecondary`) — and the subpath now also exports `CatalogExample` / `CatalogExampleStack`, labeled-example primitives that carry a first-class `align` prop (`'glyph'` = 16px, `'inline-control'` = 8px, `'none'`) to line a specimen's left edge up with its label, publishing the inset as `--kui-catalog-example-align` so a debug overlay can exclude it. This lets a gallery compose its previews from the shipped shell instead of hand-rolled example markup and CSS.
- Reworked the `@kerfjs/ui` list-detail dialog recipe so its `PanelHeader` sits at the top of the detail column rather than spanning both columns; the master list and detail pane now each run full height top-to-bottom within the dialog.
- **Breaking (`@kerfjs/ui`):** renamed the three menu primitives to their list names — `MenuHeader` → `ListHeader`, `MenuItem` → `ListItem`, `MenuActionRow` → `ListActionRow` — across every surface: the exported components, their subpaths (`@kerfjs/ui/list-header`, `/list-item`, `/list-action-row` and the matching `.css` subpaths), their `kui-menu-*` CSS classes (now `kui-list-*`), their `data-component` values, and the catalog. The sidebar navigation composition demo is likewise renamed from `menu` to `list`. There are no deprecated aliases; update imports, class references, and any `?component=menu` links. The names better reflect that these primitives compose any list or navigation surface, not only menus.
- Added a reusable component-catalog shell to `@kerfjs/ui`: an opt-in, subpath-only `Catalog` component (`@kerfjs/ui/catalog`) plus a `wireCatalog` helper (`@kerfjs/ui/wire-catalog`) that render the collapsible category sidebar + titled preview stage + resources/related footer the kerf UI catalog uses, driven by your own `sections`, per-entry preview `content`, and `brand`. Controlled and stateless like the app layouts (the app owns `active`/`collapsed`/`theme`); `wireCatalog` wires selection, the related-entry selector, and the collapse/theme toggles, and can mirror the active id into the URL. See `ui/docs/catalog.md`.
- Gave `@kerfjs/ui`'s `PanelHeader` (and `ToolbarText`) an optional `headingLevel` prop: when set, the title exposes `role="heading"` with a matching `aria-level`, so a page or view heading is a real heading landmark for screen-reader navigation. The default is unchanged — a plain span referenced via `aria-labelledby` for dialog titles — so existing usage is backward-compatible. Restores the page-heading semantics lost when `PageHeader` was consolidated into `PanelHeader`.
- Added a first-class loading-placeholder mode to `@kerfjs/ui`: a new unanimated `Skeleton` block (`@kerfjs/ui/skeleton`) plus a `placeholder` boolean on every value-bearing component (`Select`, `ListHeader`, `ListItem`, `ListActionRow`, `ValueTableRow`, `PanelHeader`, `SegmentedControl`, `StateBanner`, `AppTab`, `ToolbarText`). In placeholder mode a component renders its real chrome with value slots as subtle skeleton blocks and its own controls disabled (`aria-busy`, dropped `data-action`), keeping sizes and shapes identical to the populated component, so a parent composes a faithful loading inspector/detail view without hand-rebuilding markup. Built on a Kerf-owned skeleton (not `wa-skeleton`) so the pure-Kerf primitives stay Web-Awesome-free. `Select`'s existing empty-hint string prop is renamed `placeholderText` to free `placeholder` for the loading boolean.
- Made `@kerfjs/ui`'s `wireTokenSearchFields` manage the collapsible `TokenSearchField`'s transient expand/collapse/focus by default (activate to reveal and focus, Escape or empty blur to collapse), holding that state in a signal exposed on the returned handle so an app can bind it in render, adopt its own via `collapsible.signals`, drive it through `open`/`close`, or opt any behavior out individually — removing the per-app boilerplate that had caused inconsistent transient-UI variation. `onSubmit` is now optional and the helper returns a `TokenSearchFieldsHandle` (a disposer that also exposes `expanded(id)`/`open`/`close`).
- Made the UX catalog's theme action follow the operating system's initial light/dark appearance, label itself with the appearance it will switch to, and explicitly override either direction when activated.
- Corrected the UX catalog's project-details dialog gutters so its header uses less side inset, its selected title uses the full content gutter, its value table fills the available detail width between the usual margins, and its record actions avoid a doubled left inset.
- Fixed the UI catalog's Kerf logo in the Vite development server and kept emitted assets working when the demo is hosted below a preview or proxy path.
- Aligned the composer-form recipe's labels, hints, character count, and textarea value to a consistent 8px field gutter at wide and narrow widths.
- Prevented UX catalog resource links from overlapping the related-component selector at phone widths.
- Replaced the UX catalog's generic K badge with the Kerf logo and DialogHeader-like title/subtitle alignment; collapsing the catalog now removes its empty rail and moves the restore action to the main toolbar's leading edge, with first-class guidance for corresponding inline-start and inline-end pane controls.
- Corrected the composer-form recipe hierarchy and layout: `DialogHeader` now supplies the form's referenced title and summary, while fields and actions align to the shared 8px control gutter instead of a doubled content-item inset.
- Aligned the UX catalog's StateBanner tone labels with each banner's leading icon by deriving the shared 8px margin, 1px border, and 8px content inset in demo-only specimen chrome.
- Let the UX catalog's resizable-panel specimen fill its available preview height and moved its committed-width readout into the shared status footer.
- Reworked the UI catalog into collapsible pane chrome with toolbar headers, a full-stage checkerboard preview, compact resource footer, hidden-by-default floating recipe notes, and edge-aligned `PageHeader` actions.
- Aligned multiline `ListItem` and `ListActionRow` leading icons with the first text line instead of centering them against the full wrapped label.
- Fixed packages generated by `create-kerf-component` failing declaration builds under TypeScript 6 when tsup injects its deprecated `baseUrl` option.
- Fixed the complete kanban example's mobile layout by stacking its columns and header controls without horizontal overflow while preserving the wider board layout.
- Fixed the complete dashboard example's mobile layout so its status header, chart, and table fit the viewport without horizontal overflow.
- Decomposed `bindList` into focused keyed-row and virtualization controllers while keeping `list.ts` as the public orchestration entry; snapshot and granular updates now share one item-replacement contract.
- Corrected the canonical, published, and AI-facing dev-warning documentation to reflect the hook-only production boundary: kerf never gates diagnostics on `NODE_ENV`; omitting `kerfjs/dev` makes them unreachable, while installed opt-in warnings check only their own switch.
- Added the missing always-on row-key warning to the published diagnostics guide and made the documentation gate require every canonical diagnostic section on the public site.
- Restored the site-wide Playwright visual QA command with dynamic discovery of every built HTML surface (including `404.html`), desktop/tablet/mobile full-page captures, root- and URL-aware route filtering, collision-safe evidence names, and automated page-health checks for overflow, settled images, and collapsed content.
- Kept `observeRemovals()` scopes alive when their nodes move between parents or reorder within the observed root; automatic disposal now waits for permanent removal from that root.
- Made `remountOn()` disposal idempotent and ownership-safe: the first call tears down its mounted subtree and stops the key watcher, while repeated calls leave any later external content in the parent untouched.
- Made `throttle().cancel()` effective from inside both leading and trailing callbacks: the callback can now reset the active rate window immediately instead of having a new cooldown installed after it returns.
- Removed the overlay barrel/helper cycle by extracting the lifecycle core and splitting `confirm`, `prompt`, `form`, and `choice` into focused internal modules, without changing the public `kerfjs/overlay` API.
- Fixed `attach()` for nodes prepared before insertion: setup still runs immediately, teardown waits through the initially-disconnected phase, then fires once after the node has connected and is later removed (including direct insertion into an already-connected shadow root, ancestor removal, same-batch light-DOM insertion/removal, and removal through a shadow host).
- Made `bindList` reject duplicate keys before changing the DOM, with errors that name the key and both indices; rejected `arraySignal` batches are drained and the next valid state snapshot-recovers before granular updates resume.
- Made `bindList` recover after a granular row render throws: the failing call still reports the error, while the next source update reconciles the authoritative snapshot before granular patches resume, including when an earlier patch in the same batch already changed the DOM.
- Fixed stores created before `kerfjs/dev` installation never emitting the opt-in narrow-set warning. Store actions now resolve the warning hook at `set()` call time and allocate per-store dedup state only when diagnostics are present.
- Added a deterministic `bindList` transition matrix covering empty/refill recovery, granular-to-snapshot-to-granular sequences, and mixed batched structural changes with node-identity assertions.
- Made concurrent fallback overlays arbitrate dismissal from the top down, so one Escape, backdrop, or outside click closes only the active modal or non-modal surface.
- Made `prompt()` and `form()` reject malformed bring-your-own dialog markup immediately: missing required input markers now close the incomplete overlay and throw an error naming the exact marker (and form field) instead of failing later on interaction.
- Covered `each()` count-drift recovery through the public API: after a granular insert drains its patches and row rendering fails, a subsequent update now has a regression test proving the snapshot path repairs the DOM.
- Fixed tooltips hiding when just one of their pointer/focus triggers left; pointer and focus presence are now tracked independently, so either interaction keeps the tooltip open until both end.
- Strengthened the `bindList` feature index with exact existing guards for same-key rebuilds, granular patch sequences, and teardown semantics.
- Extracted pure granular-list index-shift and cache-key-drift stages from the `each()` transition coordinator for direct testing.
- Normalized internal helper module filenames to the repository's kebab-case or primary-export convention and updated all live imports and documentation paths.
- Made list-binding rationale comments self-contained and named the bounded template/URL diagnostic excerpt limits.
- Split `mount()`'s render effect into named synchronous static-render and list-reconcile/commit phases without changing lifecycle order.
- Replaced terse router and overlay-position internals with descriptive route-segment, event, rectangle, and viewport names.
- Preserved edited stale AI-assistant configs as forks by validating their versioned canonical section against shipped historical hashes before offering an autofix.
- Required every complete example app to have its own feature-coverage row mapped to a smoke test inside that app's Playwright suite.
- Made router parameter decoding fail closed to no-match on malformed percent escapes instead of throwing `URIError`, including named and wildcard captures.
- Pointed `@kerfjs/ui` package metadata at the existing published component-packages documentation route and added a source-backed metadata regression test.
- Fixed the complete router example's broken documentation links and taught the docs-example gate to validate published routes and heading fragments.
- Added full-pipeline coverage for missing-row-key diagnostics across initial, snapshot, granular, and in-place list reconciliation, including per-binding deduplication and production silence.
- Extended the feature-completeness gate to inventory router-subpath exports and deduplicate values re-exported across public surfaces.
- Kept `kerfjs/ai-assistant-configs` filesystem checks read-only during plain ESLint runs while retaining explicit `eslint --fix` installation and stale-file updates.
- Required history-router bases to match an exact path or path-segment boundary, so `/app` no longer strips or intercepts `/apple`.
- Added the missing MIT `LICENSE` to generated `create-kerf-component` packages, including package-name token replacement and publish-contents coverage.
- Made dangerous-URL attribute-name matching ASCII-case-insensitive so mixed-case spellings cannot bypass static or bound screening.
- Normalized synchronous `resource().run()` fetcher throws into the same stale-guarded failed state and resolving promise used for asynchronous rejections.
- Escaped plain-string `toast()` content as text while preserving trusted `SafeHtml` and render-function markup, closing a stored-markup injection path.
- Rejected non-finite and fractional indices in every indexed `arraySignal` mutator before changing source state or emitting a patch; even equal `move()` indices are now validated before the no-op path.
- Made `DisclosureArrow` animate configurable directions over the shortest rotation path, including the left-to-up demo's natural 90-degree clockwise turn; closed-to-open 180-degree ties use counterclockwise rotation.
- Reworked `DialogHeader` as a true top toolbar: its 24px icon in a 34px circle and first title line align with automatically grouped actions, while an optional subtitle remains below; added localized action-group labels and compatibility for existing pre-grouped actions.
- Gave every `ValueTableRow` 8px of root-scaled top and bottom padding while preserving its semantic inline inset and icon-aware separator alignment.
- Fixed the composer-form recipe's Reset action so upgraded Web Awesome input and textarea controls clear their live displayed values together with the controlled Kerf state, while retaining the `Draft reset` announcement.
- Removed the unsolicited command-palette catalog demo and production recipe while retaining the earlier, independent application-local adapter example for missing-concept guidance.
- Kept the `ResizableRegion` UX specimen readable by moving committed-width status below the controlled pane at narrow widths, preserving its 200% root-scaled split, and retaining local scroll access to the handle at its maximum size.
- Reworked the composer-form recipe into one coherent visible form surface with exactly three transparent 8/1/8 content sections, 24px major rhythm, and a conditional `StateBanner` as its only nested semantic surface.
- Made `ListHeader` fill its available inline width, align separate actions at the logical end in both LTR and RTL, and use an overridable 18px visible action glyph without shrinking the 44px target.
- Added first-class `ListHeader` count semantics with a required localized `countLabel`, zero-safe neutral pill presentation, accessible heading/disclosure naming, legacy non-count badge exclusivity, and runtime filtering for invalid counts and protected presence flags.
- Made `ListHeader` toggle mode supply the production 18px `DisclosureArrow` by default while retaining custom `actionIcon` replacement, removed competing raw SVG sizing/rotation, and made the menu-composition Tools disclosure control real content instead of showing a false Projects chevron.
- Repaired the `DisclosureArrow` UX specimen by replacing its ambiguous sorting glyph with a right-facing arrow, putting both examples in independently controlled native buttons with stable names and `aria-expanded`, and demonstrating custom directions through delegated pointer and keyboard activation across narrow and 200%-zoom layouts.
- Set `DisclosureArrow` to an 18px root-scaled default, removed the catalog-only 24px enlargement, retained `--kui-disclosure-arrow-size` for scoped consumer overrides, and kept Kerf `Select` on its independent `.5` Web Awesome expand-glyph scale.
- Added a site-scoped CI dependency audit that includes the complete static-site build tree and fails on high or critical advisories while keeping low/moderate development-tool findings informational.
- Aligned the UX catalog's header-composition dialog with the shared 8px inline layout gutter while preserving its 16px vertical separation.
- Added visible `View demo source` and `Read guidance` affordances to every UI catalog detail, plus `View component source` for first-party components, backed by deterministic repository-relative paths for the main renderer, individual recipe files, Web Awesome specimens, and canonical browser-import implementations. Web Awesome entries explicitly label local documentation as Kerf integration guidance; all links use deploy-safe GitHub URLs and a responsive accessible layout.
- Added runtime-safe `AppTab.rootAttributes` for domain `data-*` metadata plus decorative `AppTab.closeIcon` and `ResizableRegion.handleIcon` slots, preserving existing tab and resize wiring ownership while blocking case-folded component/action/drag/drop collisions.
- Added `ListActionRow`, a full-width navigation row with sibling primary and trailing native-button actions, independent names and disabled states, controlled selection semantics, safe metadata/popover extension slots, and responsive 44px targets. `ListItem.trailing` is now explicitly documented as dormant content.
- Added safe typed ListItem/ListHeader extension slots for application `data-*` metadata and native popover trigger relationships while protecting component-owned action, selection, disclosure, accessible-name, disabled, icon, and native-button semantics.
- Fixed keyboard deletion of a controlled `TokenSearchField` chip so `wireTokenSearchFields` restores focus and the text-relative caret after the application rerenders the editor.
- Aligned `@kerfjs/ui` CSS guidance and AI regression scoring with the catalog's exact public anatomy: documented public-class composition selectors are supported, private tag/id/attribute/unlisted-class descendants remain rejected, and historical measured runs replay under their recorded stricter oracle.
- Added typed `ValueTableRow` composition with a first-class optional icon hook. Value-table separators now align 8px from both edges for iconless rows and 40px from the left plus 8px from the right for rows with a 24px leading icon.
- Added first-class collapsible `TokenSearchField` support: an empty closed field becomes one iconic search action, controlled activation animates to the complete searchbox, and text or tokens keep it expanded after blur. It works standalone or when composed inside `ToolbarControlGroup`; the UX demo demonstrates that common toolbar composition at wide and narrow sizes.
- Restored the public documentation site to its Astro + Starlight implementation while the Kerf UI redesign is reconsidered, and removed the in-progress `@kerfjs/ui` page and promotional links from public navigation.
- Fixed `TokenSearchField` first-line alignment so the leading icon, editable text, clear action, and trailing content share the field's vertical center while remaining pinned when text wraps.
- Replaced sidebar-specific and wrapper-inset UI geometry with one shared pane/content model across sidebars, main areas, inspectors, and dialogs. Unpadded panes now compose optional toolbars, one scrolling content stack, and optional footers; content children own consistent 8px margin, 1px transparent-or-visible border, 8px padding, 12px or 22px radii, and 24px major separation. Toolbar groups retain 44px geometry even with transparent chrome, and `ListHeader` now supports a badge while separating dormant title content from its action.
- Added pixel-first `remify(<px>)` authoring for `@kerfjs/ui` styles. The build converts values exactly against a 16px baseline into ordinary `rem`, package CSS exports now deliver compiled `dist/styles/` files, and the UX catalog applies the same transform during Vite development so CSS edits remain hot-reloaded.
- Added a side-effect-free `@kerfjs/ui/webawesome` TypeScript declaration subpath for all 70 catalog-supported Web Awesome elements, synchronized against the installed custom-elements manifest and covered by a downstream package-export compile fixture.
- Added a deterministic internal `@kerfjs/ui` AI-regression foundation with seven task-shaped prompts, frozen versioned context conditions, AST-aware structural scoring, generated public declaration signatures, equivalent supported import scoring in suite v2, and an opt-in non-executing TypeScript compile-evidence sidecar with exact response/config/package/declaration hashes. Adversarial fixtures catch component substitution, duplicated primitives, and spacing/layout ownership regressions without invoking a live model in CI.
- Added seven lazy, production-backed `@kerfjs/ui` composition recipes for application shells, sidebars, workspace headers, list-detail dialogs, composer forms, list-state lifecycles, and mixed-control toolbars, with stable catalog routes, canonical AI metadata, drift gates, responsive/keyboard/state coverage, and a copyable stable-root adapter that wires delegated actions, form/dialog events, resize commits, and idempotent disposal outside the catalog.
- Added a shipped, schema-described `@kerfjs/ui` machine-readable component catalog with deterministic typed UX projection and drift gates for public exports, package/CSS/registration paths, relationships, Web Awesome manifest coverage, AI guidance, routes, CSS hooks, and documentation links.
- Added a canonical `@kerfjs/ui/layout.css` vocabulary for responsive page, pane, section, control, metadata, surface, dialog, and scroll ownership, with semantic variables, compact/narrow behavior, consumer and AI guidance, normalized catalog compositions, and wide/intermediate/narrow/200%-zoom geometry coverage.
- Added a need-first `@kerfjs/ui` component-selection matrix and automated drift gate so AI tools choose among reuse, composition, thin application adapters, custom semantics, and overlapping Web Awesome components without inferring contracts from implementation CSS. A typed application-local command-palette example now shows how a missing package concept still uses canonical layout, one inset owner, and related-control grouping while keeping semantics honest and proposing recurring behavior upstream.
- Fixed `@kerfjs/ui` `Select` option icons disappearing after a Kerf rerender. Icon slots now have stable per-select/per-choice keys and preserve Web Awesome-owned slot state, while custom selected content is keyed by the controlled value so it updates cleanly.
- Added a shared `@kerfjs/ui` sidebar spacing composition with distinct 10px interaction and 20px content rails, 24px icon slots plus 10px gaps, and 44px row/header/toolbar targets. Menu headers, icon-bearing and iconless rows, bordered surfaces, and `.kui-sidebar-toolbar` now share public geometry tokens, consumer/AI guidance, responsive and RTL specimens, and browser assertions.
- Added a reusable controlled `TokenSearchField` to `@kerfjs/ui`, extracting Hot Sheet 2's free-text plus ordered atomic filter-chip field with accessible edit/remove/clear actions, DOM read and caret helpers, tree-shakeable styles, and full catalog coverage.
- Reorganized the largest catch-all unit suites into behavior-focused files while preserving all 1,554 existing tests, assertion counts, transition matrices, coverage, and feature-index mappings.
- Expanded the `@kerfjs/ui` pull-request browser gate from Chromium-only coverage to the full Chromium, Firefox, and WebKit suite, with Playwright binary caching keyed to the UI lockfile.
- Added a strict npm install-script policy for the site: only the reviewed `esbuild` and `sharp` binary installers run, the linked root package's Husky-only `prepare` is denied, and a preinstall checker detects lockfile installer drift.
- Updated the root and UI browser-test harnesses for Node 26: Playwright 1.63 removes the deprecated ESM loader registration, and normalized color variables keep web-server and worker output free of `NO_COLOR`/`FORCE_COLOR` conflict warnings.
- Cleaned generated root and `@kerfjs/ui` ESM shims so downstream bundlers no longer report ignored bare chunk imports, and deduplicated source-map directives without weakening package tree shaking.
- Added explicit Web Awesome component-selection guidance and aligned UX descriptions: prefer Kerf Select, SegmentedControl, TabBar, LucideIcon, and ResizableRegion for common app patterns; consider Popup for custom anchoring; reserve specialized ecosystem alternatives for concrete requirements. ResizableRegion now includes Hot Sheet 2's overridable 1px separator plus hover/focus grip.
- Made Web Awesome Tooltip and Popover arrowless by default in the optional Kerf theme, with public per-theme, scoped, and per-instance overrides plus focused UX and browser coverage.
- Documented Web Awesome Markdown's trusted-input-only security boundary, client-only rendering, and shared mutable Marked configuration, with an explicitly labeled UX specimen and a regression assertion for the warning.
- Clarified that Web Awesome Badge and Tag are the tree-shakeable generic primitives: status badges use the pill treatment, tags remain rounded rectangles, and domain adapters stay application-owned when they add mappings or mutation behavior.
- Unified Accordion, Details, Breadcrumb, and Kerf Select chevron scale through an overridable shared disclosure-icon token.
- Matched Web Awesome Carousel navigation to Kerf's compact disclosure geometry, using overridable 16px arrows and 7px visible page dots with accessible macOS-sized hit targets.
- Expanded the Web Awesome Animation UX specimen into an interactive settings panel with preset, easing, timing, playback, transport, lifecycle, and reduced-motion behavior.
- Fixed the Web Awesome Toast UX specimen to use the component's programmatic stack API, with visible browser coverage and an explicit note about Hot Sheet 2's current custom toast implementation.
- Made the Web Awesome intersection, mutation, and resize observer UX specimens interactive, with deliberate triggers, visible live-event results, and browser coverage.
- Updated the UI package's Vitest toolchain to 4.1.11 and resolved the remaining development-only npm audit advisories without changing its runtime dependency surface.
- Added a first-class controlled `SegmentedControl` to `@kerfjs/ui`, with Hot Sheet 2-aligned toolbar, rounded-rectangle, pill, equal-width, small, and disabled presentations; native pressed-button semantics; scoped palette overrides; tree-shakeable component CSS; and a complete UX-catalog route.
- Aligned `@kerfjs/ui` defaults with Hot Sheet 2, added overridable semantic state palettes, completed ToolbarControlGroup and StateBanner catalog variants, simplified related-component navigation, corrected ListHeader action alignment, and added a controlled horizontally scrolling TabBar with pointer and keyboard reordering plus proximity-based edge autoscroll.
- Updated `@kerfjs/ui` to develop and test against Lucide 1.43.0 and Web Awesome 3.12.0, with matching peer baselines.
- Added an opt-in `@kerfjs/ui/webawesome.css` theme for Web Awesome's free components. It carries the Hot Sheet 2-aligned semantic palette, form and panel geometry, focus, tooltip, radius, and shadow choices without registering component JavaScript; the UX catalog now lists all 70 free Web Awesome 3.12 components under a collapsible ecosystem section, gives each a focused themed route and dependency links, and retains the aggregate light, dark, narrow, and scoped-override gallery.
- Fixed trapped overlays losing sequential focus in WebKit after the second control. Implicitly focusable descendants now receive `tabindex="0"` inside the trap, while authored tabindex values (including `-1`) remain intact.
- Fixed Firefox contenteditable carets jumping to the list container during keyed `moveBefore()` reorders. `each()` and `bindList` now restore exact contenteditable Selection boundary nodes and offsets after every move pass, even when the browser keeps `activeElement` unchanged.
- Repaired lockstep version metadata for the ESLint plugin and component scaffold, and added a release-time sync plus repository gate so package manifests, locks, plugin metadata, and published examples cannot drift again.
- Added the lockstep `@kerfjs/ui` package: accessible toolbar, menu, tab, header, resize, select, and feedback primitives; semantic CSS tokens and browser component subpaths that automatically include only reachable component styles; CSS-free root/SSR entries and an optional complete stylesheet; opt-in Web Awesome registration; AI-oriented docs; a production-backed UX catalog; bundle/unit/three-engine browser gates; and a least-privilege release workflow.
- The virtual-list demo animation opens on the full app again (header, the "N in the DOM" badge, and the list) before the scroll; the list now scrolls inside its own box while the header stays put (previously the whole frame was a full-bleed list strip), holds at row 0 before gliding instead of starting a few rows down, and the loop stays in phase on every pass. Captured with domotion-svg 0.28.2.

## [4.4.1] - 2026-08-26

- Overhauled the README landing page: new one-line tagline, npm/size/license/TypeScript-types badges, a hoisted "Quick start" (install + `tsconfig`) right under the hook, and a jump nav (Quick start · Why kerf · Quick tour · Docs). The counter example now shows `delegate()` wiring the click handler.
- Reworked the homepage hero to lead with the value proposition ("Reactive UI that touches only the bytes that changed"), with "Introducing Kerf" demoted to an eyebrow, a right-sized logo, tighter vertical spacing, and "Get started" as the single filled primary action ("View examples" now a secondary/outline button).
- Redesigned the complete-apps index as a card grid — each app appears once with an animated preview, a one-line summary, and "Run live" / "Source" buttons.
- Every complete-app page now shows "Run live" and "View source" as buttons above the demo instead of small inline text links.
- Rewrote the site's docs pages as hand-authored consumer content (cleaner headings, no internal section numbers) rather than verbatim copies of the internal design docs.
- Renamed the migration guides' "Side-by-side code" heading to "Section by section" (the sections stack code blocks rather than showing true columns), across all framework pages.

- The getting-started and Markdown-editor demo animations now open on a non-blank frame — real code and a rendered heading are visible immediately instead of an empty pane.
- Added a horizontal-scroll shadow affordance to wide tables so off-screen columns are discoverable on narrow viewports.
- Shortened the longest demo alt text on the router and virtual-list pages for more concise screen-reader output.
- Moved framework version labels out of the performance table's framework column onto a methodology line below, keeping the column a clean label.

## [4.4.0] - 2026-08-23

- Reworked the router example app to run inside a fake browser window — traffic-light chrome, working Back/Forward buttons wired to `router.back()`/`forward()` via one delegated listener, and a live address bar bound to `router.route` that updates as you navigate — making the URL-driven, no-reload story clearer.

- **New `kerfjs/router` subpath — a client-side router (the "postcard router").** `createRouter({ routes, mode?, base?, interceptLinks? })` returns a handle over three things kerf already has: a reactive `route` signal (`{ path, params, query, hash }`), `delegate()`-based `<a href>` link interception, and a keyed **outlet** — `router.outlet()` renders the matched route in a `data-key`ed wrapper, so kerf's keyed morph **replaces the page wholesale on a route change** (fresh DOM) and **reconciles in place on a same-route param change** (preserving scroll / focus). Route patterns are static, `:param`, a trailing `*rest` wildcard, and `*` catch-all; the handle also gives `navigate(path, { replace?, state? })`, `back()`/`forward()`, `match(pattern)` / `activeClass(pattern, className)` reactive active-link helpers, hash **or** history mode, an optional base path, and `dispose()`. Link interception is automatic (same-origin, left-click, no modifier/`target`/`download`, opt out per-link with `data-router-ignore` / `rel="external"` or globally with `interceptLinks: false`). **Deliberately scoped** — no nested layouts, data loaders, lazy routes, guards, or SSR matching; compose those with kerf primitives (`resource` for loading, an `effect` on `route` for guards). The kerf **core stays router-free** — this is opt-in and tree-shakeable, adding nothing to the main barrel until imported, and docs/1's "Not a router" is about the runtime. See [`docs/20-router.md`](docs/20-router.md).

## [4.3.0] - 2026-08-22

- KF-529: refresh README for the 4.3 cycle (prep-major-release) (`909c82a`)
- KF-530: extract promise-dialog helpers into overlay-dialogs.ts (`5d4ac38`)
- KF-528: sync llms.txt with docs/19 + 4.3 features (`1d9c004`)

- **`kerfjs/overlay` gains opt-in native top-layer backing (`native: true`).** Every overlay surface (`overlay`, `confirm`, `prompt`, `form`, `choice`, `popover`, `tooltip`) now takes `native?: boolean` (default `false`). When `true` and the engine supports it, a **modal** surface (`trap: true`) is hosted in a `<dialog>` opened with `.showModal()` — real document inerting (pointer + focus + AT) and guaranteed stacking above any `z-index` — and a **non-modal** surface (`trap: false`) uses the **Popover API** (`[popover]` + `showPopover()`). Feature-detected (`HTMLDialogElement.prototype.showModal`, `HTMLElement.prototype.showPopover`), falling back to today's plain `<div>` where unsupported, so `native: true` is always safe to pass. The `render` slot + promise API are unchanged — kerf just hosts your markup in a `<dialog>` / `[popover]`. **Opt-in on purpose:** the native elements carry UA default styles (a `::backdrop`, centering, border, padding) that kerf does **not** reset (a reset would violate the zero-CSS contract) — style the element and its `::backdrop` via `className` (`.kerf-overlay::backdrop { … }`, the stable contract); and `container` becomes a visual no-op in native mode (the top layer ignores DOM position). See [`docs/19-native-overlay-backing.md`](docs/19-native-overlay-backing.md).
- **`bindList` virtualization gains a `content-visibility` mode.** `virtualize: { rowHeight, mode: 'content-visibility' }` is a second virtualization strategy alongside the default `mode: 'window'` (today's JS windowing). It keeps **every** row in the DOM and sets `content-visibility: auto` + `contain-intrinsic-size: 0 <rowHeight>px` on each row, so a supporting engine (Chromium, Safari 18) skips the _layout/paint_ of off-screen rows while **all rows stay findable** — find-in-page (Cmd/Ctrl+F), the accessibility tree, and anchor links / `scrollIntoView` all work on any row (the exact guarantee `mode: 'window'` can't give, since it removes off-window rows from the DOM). The `mode` choice is the app's and it's about list size: pick `'content-visibility'` for medium lists where findability beats the node ceiling, keep `'window'` for very large (100k-row) lists. In this mode `rowHeight` is only the `contain-intrinsic-size` placeholder (no windowing math), `setHeight` / `observeRowHeights` are no-ops (the browser owns measurement), `minRows` is ignored (all rows already render), and no scroll listener / `ResizeObserver` is installed — while `handle.container` / `containerClass` / `containerId` still work. There is deliberately **no feature detection**: on an engine without `content-visibility` the CSS is inert, so all rows still render (correct, still findable) — only the off-screen-skip optimization is absent. See [`docs/17-list-virtualization.md`](docs/17-list-virtualization.md) §17.11.
- **Docs: `bindList` virtualization findability/a11y tradeoff is now a first-class caveat.** Off-window rows are removed from the DOM (not just hidden), so with `virtualize` set, find-in-page (Cmd/Ctrl+F), screen readers / the accessibility tree, and anchor links / `scrollIntoView` reach only the visible window. New `docs/17-list-virtualization.md` §17.10 spells out the consequences and the guidance (don't virtualize, or use `minRows` above the list length, when full findability matters more than the DOM node ceiling), and the `bindList` JSDoc + `docs/8-api-reference.md` §8.11 carry the same note. Behavior unchanged — documentation only.
- **State-preserving row moves via `moveBefore()` (transparent optimization).** When a keyed list reorders — `each()` (snapshot and granular paths), `bindList`, and `morph()`'s keyed / positional / list-marker moves — kerf now relocates an already-connected row with `Node.prototype.moveBefore()` where the engine supports it (Chromium 133+, spreading to other engines), falling back to `insertBefore()` everywhere else. `moveBefore()` is an atomic move: the node is never disconnected, so a moved row keeps its focus, text selection, `<iframe>` document state, playing media, running CSS transitions/animations, and open `popover`/`dialog` state across the reorder — richer state than the existing focus snapshot in the reconciler could ever restore, and it needs no snapshot at all where it runs. No API change and no behavior change on engines without `moveBefore()`; the focus-preservation snapshot stays in place for them. Fresh (not-yet-connected) rows still use `insertBefore()` — only genuine moves of connected rows take the new path. See [`docs/18-state-preserving-moves.md`](docs/18-state-preserving-moves.md).

## [4.2.0] - 2026-08-20

- Added a **Virtual list** example app — a 10,000-row virtualized list showcasing the companion subpaths together: `kerfjs/list` viewport virtualization (only a screenful in the DOM), `kerfjs/timing` debounced search, and `kerfjs/overlay` confirm-to-delete with a toast. Includes a live "in the DOM" counter that stays flat as you scroll all 10,000 rows.
- Expanded the README with a companion-subpaths spotlight covering `list`, `overlay`, `async`, `scope`, `timing`, `remount`, `attach`, and `actions`, with `bindList` fixed and measured-height virtualization examples.
- Corrected the complete-apps index to accurately describe the eight standalone showcase apps and note that the cart and counter-store apps live in the migration guides.

- Fixed (beta): `bindList` measured-height virtualization (`virtualize: { rowHeight: { estimate } }`) never pruned reported heights, so a list with key churn (a feed prepending new ids over a long session) grew its internal height map without bound. Reported heights are now pruned to the live key set on each rebuild — no leak, and a key that leaves and later returns is re-measured (uses the estimate again) rather than reusing a stale height. A key that only scrolls out of the window keeps its measurement (it's still in the source).
- Fixed (beta regression): `popover()` / `tooltip()` (and `positionAnchored` / `autoReposition`) mispositioned horizontally — the anchored element was measured while still `display:block`, so its width read as the full body-content width and the viewport clamp slid it to the body's left edge instead of aligning it to the anchor. `positionAnchored` now sets `position: fixed` before measuring, so it uses the element's real (shrink-to-fit) size.
- **`renderDocument(node, options?)`** (main barrel) — a tiny SSR helper that prepends the doctype to a rendered document, so server routes stop reinventing `"<!DOCTYPE html>" + page.toString()`. Takes a `SafeHtml` or string; optional `{ doctype }` (default `'html'`). Pure string work, no DOM dependency.
- **New `kerfjs/list` subpath** — `bindList(parent, source, options)`, a keyed list distinct from `each()`: each row is individually `mount()`ed, so a signal a row reads updates just that row (fine-grained, no full-list pass), and it can **virtualize** the viewport (`virtualize: { rowHeight }` renders only the visible rows, padding keeps `scrollHeight` honest). `rowHeight` is a fixed `number`, a `(item, index) => number` for **app-declared variable** row heights (kerf builds a prefix sum — rebuilt when the source changes, not per scroll frame — and binary-searches it for the window), **or** `{ estimate }` for **measured** heights: kerf sizes an unmeasured row by `estimate` and the app reports real heights via the returned handle's **`setHeight(key, px)`** (keyed by the list key, so reports survive reorders) or the new **`observeRowHeights(handle)`** helper (one `ResizeObserver` over the visible rows → `setHeight`); kerf anchor-corrects `scrollTop` when an above-viewport row is remeasured so on-screen content doesn't jump. `bindList` now returns a `BindListHandle` (`(() => void) & { setHeight }`) — still callable as the disposer. `render(item)` returns a `MountResult` (**content mode** — kerf creates the row element and mounts your content inside it) **or** an `HTMLElement` / `{ el, update?, dispose? }` (**element mode** — the element you return IS the row, so you own its tag / class / `data-*` / listeners; kerf **keys / moves / reuses** it — the SAME element survives an append, a remove elsewhere, a reorder, or a fresh item object at the same key, preserving focus / scroll / listeners — and runs your `dispose` only on genuine removal; return an `update(item)` to refresh a reused element's content). A list may mix the two. `source` is a `signal<readonly T[]>` or an `arraySignal<T>` — a non-virtualized `arraySignal` source applies its structural patches **granularly** (O(patches)), everything else uses a keyed diff (transparent optimization). A **`before`** option (a `Node` or `() => Node | null`) keeps the rows as a contiguous block ending just before a fixed trailing sibling, so a list can share its `parent` with an "add" button or an indicator instead of assuming exclusive ownership. Three virtualization ergonomics from real adoption: **`virtualize.minRows`** renders every row (no windowing) while the list is shorter than it — one DOM structure whether short or long, so the call site never branches, and a short list stays visible to find-in-page / screen readers / DOM-count tests; **`virtualize.containerClass` / `containerId`** (and **`handle.container`**) name and expose the inner sizer kerf creates, replacing `parent.lastElementChild` guesswork; and kerf now re-windows on a **`ResizeObserver`** over `parent` (where available), so a list mounted before layout (`clientHeight` 0) fills in once sized and a resized container re-windows. Reach for it for surgical per-row updates, app-owned row elements, or long/windowed lists; `each()` stays the default for item-owned-state lists rendered to HTML strings. Optional and tree-shakeable.
- **New `kerfjs/async` subpath** — `resource<T, I = void>()` models async state (`{ status, data, error, progress, input }`) with the stale-response guard built in. You write the fetch (Node `fetch` for SSR, browser `fetch` client-side); `.run(fetcher)` drives `idle` → `running` → `completed`/`failed` and drops out-of-order responses (only the latest run resolves the state). It never rejects — a failure lands in `value.error` — keeps previous data across a re-run (stale-while-revalidate), and supports opt-in progress via a callback the fetcher receives. The `.run(input, fetcher)` form threads the run's `input` to `value.input` for `running`/`completed`/`failed` (latest-wins under the stale guard), so a failure handler can recover **which request failed** (e.g. an inline error keyed by `value.input.fileId`) without reintroducing module-scope bookkeeping. Pass `resource({ cacheKey, equals })` for a real SWR section: **`cacheKey(input)`** keeps the last value **per key** (revisiting a loaded key paints its cached slice instantly while it revalidates; `reset()` clears the cache), and **`value.revision`** bumps only when `data` actually changes (by `equals`, default `Object.is`) so a consumer can skip a redundant paint (a poll returning identical data leaves it untouched). The cache is readable and evictable without running a key: **`cached(key)`** / **`cachedKeys()`** view it, and **`clearCache(key?)`** evicts one key (or all) without touching `value`. `value` is a tracking read. Signals only (no render core); tiny.
- **New `kerfjs/attach` subpath** — `attach(node, setup)`, which binds a non-kerf widget's lifecycle to a single **existing** DOM node, purpose-built for the `data-morph-skip` escape hatch. `setup(node)` runs immediately (the node already exists — this is **not** React's `useEffect`: no dependency array, no re-run, no render-phase/hook-order scoping; it's closer to a Web Component's `connectedCallback`/`disconnectedCallback` pair, Svelte's `onMount(() => () => cleanup)`, or Solid's `onCleanup`) and may return a teardown; the teardown runs once when the node leaves the document (detected by a `MutationObserver`, so a morph swap, a `remountOn` replacement, or any removal triggers it) or when the returned idempotent disposer is called. Turns the "library owns this subtree" convention into a supported seam with real lifecycle guarantees. Re-creation is handled by pairing with `kerfjs/remount`. DOM only (no signals, no render core) — the smallest subpath. Optional and tree-shakeable.
- **New `kerfjs/remount` subpath** — `remountOn(parent, key, render)`, the opposite of kerf's morph-by-default: **replace** a subtree wholesale when `key` changes instead of morphing it. Names the hand-rolled `data-key={`gen-${n}`}` + `data-morph-skip` counter trick, for library-owned subtrees (a highlighted diff, a chart, an editor) that must tear down and re-initialize on fresh DOM. `key` is a signal or a thunk `() => K`; an unchanged key (including a thunk whose inputs moved but whose value stayed equal) leaves the subtree alone, so per-row reactivity inside `render` still updates in place. An optional `onMount(root)` callback runs after each (re)mount with the live subtree — the place to bind an imperative widget (`kerfjs/attach`) to the fresh DOM; returning `attach`'s disposer from it makes teardown synchronous. `remountOn` owns `parent`'s children and returns a disposer. Optional and tree-shakeable.
- **New `kerfjs/timing` subpath** — the `let timer; clearTimeout(timer); timer = setTimeout(…)` pattern every app hand-rolls, blessed with disposer-shaped ergonomics. `debounce(fn, ms)` is trailing-edge (runs once `ms` after calls stop, latest args); `throttle(fn, ms)` is leading-plus-trailing (fires immediately, then at most once per `ms`, collapsing a burst to one trailing call). Both return a callable with `cancel()` / `flush()`. `debouncedSignal(source, ms)` is a read-only signal that trails `source` by `ms` so it composes inside the reactive graph (`computed`/`effect`/`mount`) instead of beside it. `debounce`/`throttle` are dependency-free; `debouncedSignal` pulls in signals only (no render core). Optional and tree-shakeable; tiny.
- **New `kerfjs/scope` subpath** — tie disposers to a DOM element's lifetime, so append-heavy UIs stop leaking detached-but-subscribed effects/listeners. `disposeScope(el)` returns a WeakMap-keyed, accumulating scope whose `add(disposer)` (plus convenience `mount` / `effect` / `delegate` wrappers that register their own disposer) collects teardown; `dispose()` runs it all best-effort and idempotently. `disposeSubtree(root)` sweeps a subtree before removal; `observeRemovals(root)` installs one `MutationObserver` that auto-disposes on removal. No module-level mutable state. Optional and tree-shakeable.
- **New `kerfjs/overlay` subpath** — the blessed modal/overlay + dismiss manager that every real kerf app hand-rolls. `overlay(content, options?)` appends a wrapper, `mount()`s content inside it (owning the disposal), wires dismissals (Escape / backdrop / outside-click, with `outsideIgnore`), a focus trap (`role="dialog"` / `aria-modal`, Tab wrap-around, restore-focus-on-close), and returns `{ el, close(result?), result }`. `confirm(message, options?)` is a promise-based `window.confirm` replacement, and `prompt(message, options?)` → `Promise<string | null>` its `window.prompt` counterpart (both globals are no-ops in Tauri webviews); `form(fields, options?)` → `Promise<Record<string, string> | null>` collects a two-or-three-field dialog. `choice<R>(message, actions, options?)` → `Promise<R | null>` is the **N-way** sibling of `confirm` — one button per action resolves that action's `value` (or `null` on dismissal), and `options.defaultValue` makes **Enter** (anywhere in the dialog) resolve a default action (the "global Enter-to-confirm" model) without holding the overlay handle. `prompt`/`form` submit on Enter and take an inline `validate`; all auto-escape their content. `confirm` / `prompt` / `form` also accept a **`render` slot option** for design-system teams — return your own markup and spread the provided `ok`/`cancel` (+ `input`/`error`) wiring onto it; kerf keeps owning the promise, `validate`, Enter-submit, dismiss, focus-trap, and focus-restore, so you adopt the batteries-included dialogs without a CSS rewrite. `popover(anchor, content, options?)` → `OverlayHandle` is a non-modal **anchored** overlay: it positions the content relative to `anchor` (below by default, flipping above on viewport overflow, clamped horizontally), defaults to dismiss-on-outside with the anchor exempt, and repositions on scroll / resize. `popover`'s placement core is also exported standalone: **`positionAnchored(el, anchor, options?)`** (one-shot) and **`autoReposition(el, anchor, options?)`** (keeps an element positioned on scroll/resize, returns a disposer) position _your own_ element with no overlay lifecycle. **`tooltip(anchor, content, options?)`** is a hover/focus-triggered, non-modal, auto-hiding tooltip built on them. `toast(content, options?)` now returns a **`ToastHandle` (`{ el, dismiss }`)** instead of a bare dismiss function, so callers can inspect the node, wire an action button, or run entrance/exit transitions; new options: `mode: 'replace'` (collapse a rapid sequence to the latest) with `collapse: 'fade'` (default — run the prior toast's exit transition, good for a stacking region) or `'instant'` (remove it synchronously, what a single centered slot wants so messages never cross-fade in place), `variant` (`'info'`/`'success'`/`'warning'` → a `${className}--${variant}` accent class), `enterClass` (added on the next animation frame for a CSS entrance) and `exitClass` + `exitDuration` (CSS owns the exit — on dismiss the `enterClass` is **removed** so `exitClass` needn't out-specify it, and a symmetric single-class fade works with just `enterClass` + `exitDuration`; the node is removed after the delay). `dismiss({ instant: true })` removes the toast **synchronously** (skipping the exit transition), and `mode: 'replace'` `collapse: 'instant'` also force-removes a toast that is already mid-fade — so an action button that dismisses itself and shows a replacement in a single centered slot doesn't cross-fade the two. **Breaking (beta):** `toast()`'s return type changed from `() => void` to `{ el, dismiss }` — call `toast(...).dismiss()` or destructure `{ dismiss }`. Structural only — kerf ships no CSS. Optional and tree-shakeable; shares the core with the main barrel via code-splitting.
- **New `kerfjs/actions` subpath** — the blessed delegated action-table helper. `action(value)` returns a `data-action` `AttrSpec` (a thin specialization of `attr()`); `delegateActions(root, eventType, table, options?)` wires a whole table of `data-action` handlers with one delegated listener (built on `delegate()`) and returns a disposer. Formalizes the most-reinvented idiom in real kerf apps — one `attr('data-action', …)` table as the single source of truth for both the JSX attribute and the delegate dispatch. Optional and tree-shakeable; adds nothing to the main barrel.

## [4.1.1] - 2026-08-14

- Added a CDN / importmap quickstart (`docs/6-jsx-runtime.md` §6.11.1) covering three no-install ways to load kerf from an ESM CDN: a direct `esm.sh` import, and jsDelivr / unpkg behind an importmap that also maps `@preact/signals-core`. Explains why a raw `dist/*.js` path fails (its unrewritten bare `@preact/signals-core` import won't resolve in the browser) and recommends pinning to a major version.
- Updated the README no-build example to use version-pinned CDN URLs (`kerfjs@4`) and noted that jsDelivr / unpkg need an importmap while esm.sh works with a direct import.

## [4.1.0] - 2026-07-31

- ESLint 10 is now supported: `eslint-plugin-kerfjs` declares `peerDependencies.eslint` as `^9.0.0 || ^10.0.0`, and every named major is exercised by the rule suite in CI.
- The plugin now runs its rule suite against each supported ESLint major via `npm run test:eslint-matrix`, which also fails if the declared peer range, the tested set, and the CI matrix disagree — or if the range is left open-ended.

- **ESLint 8 is no longer supported by `eslint-plugin-kerfjs`.** The package is ESM-only and ESLint 8 resolves `.eslintrc` plugins with `require()`, so `extends: ["plugin:kerfjs/…"]` could never load it.
- **Legacy `.eslintrc` configuration is documented as unsupported.** Use flat config (`eslint.config.js`); the `legacy-recommended` export remains in the package but is unreachable through any config system and should be treated as deprecated.

- Generated Hot Sheet skill and rule files no longer hardcode a machine's local API port or shared secret. The curl fallbacks read `$HOTSHEET_PORT` / `$HOTSHEET_SECRET` from `.hotsheet/settings.local.json` and `.hotsheet/secret.json` instead, with `.hotsheet/settings.json` as the fallback for older projects.
- A new `npm run check:audit` gate runs `npm audit --omit=dev --audit-level=high` against the published dependency tree and is wired into the pre-push `check:full` gate.

- Test tooling moved to vitest 4 and ESLint 10; coverage thresholds were recalibrated to 98.5% branches / 99.5% statements (lines and functions stay at 100%) after vitest 4's sharper AST-based coverage mapping resolved seventeen previously-miscredited defensive branches.
- Removed the `hs-m` marketing-ticket skill and Cursor rule.

## [4.0.0] - 2026-07-28

- `draggable`, `spellCheck`, and `contentEditable` no longer accept booleans — they are enumerated HTML attributes, so write the keyword string (`draggable="true"`, `spellCheck="false"`). The boolean forms rendered markup that meant the opposite of what was written; real boolean attributes like `hidden`/`checked`/`disabled` are unchanged.
- `<select value>` / `<textarea value>` (and their `defaultValue` forms) no longer typecheck — neither element has a `value` content attribute, so kerf was emitting markup no browser reads. Use `<option selected>` and `<textarea>{draft}</textarea>`.
- Lowercase `autofocus` no longer accepts `"true"` / `"false"` — it is a real boolean attribute, so `autofocus="false"` turned autofocus _on_. Use `autofocus={false}` or omit it.

- `href="javascript:void(0)"` and its five sibling spellings are no longer dropped by the URL screen. Dropping the `href` unmade the anchor — it lost `:link` styling, keyboard focus, and its pointer cursor. Matching is against the whole normalized value, so nothing can ride along after an inert body.
- `defaultSelected` rendered as `defaultselected`, an attribute no browser reads, so the option it named was never pre-selected. It now correctly emits `selected`.

- Typed JSX gained a wide set of modern attributes: globals `inert`, `popover`, `nonce`, `part`/`exportparts`, `enterKeyHint`, `translate`, `autocorrect`, and the full microdata family; per-element `<button popoverTarget/popoverTargetAction/command>`, `<input popoverTarget/popoverTargetAction>`, `<form rel>`, `<source width/height>`, and `writingsuggestions`.
- `<button command>` is now typed to the spec keywords (`show-modal`, `close`, `request-close`, `toggle-popover`, `show-popover`, `hide-popover`) plus any `--custom` command, catching a custom command written without its required `--` prefix.
- `<a download>` and `<area download>` accept the bare boolean form as well as a string filename, so `<a href="/report.pdf" download>` compiles.

- The advertised bundle size is corrected everywhere: ~12 KB min+gzip for a realistic import, ~13 KB with `arraySignal` (previously stated as ~11/~12 KB, and ~6.1 KB in the Cursor rules). Every migration page's delta row was recomputed against the new figure.
- The JSX runtime doc gained a section on enumerated vs. boolean attributes, and the API reference now records where the JSX types come from (WHATWG HTML Living Standard + SVG 2, not another framework's property table).
- The dev-warning sections in the dev-warnings doc were renumbered by family so the `11.2.N` headings run in document order; cross-references elsewhere in the docs were updated to match.

- The bundle-size check now gates the _prose_ as well as the build: every place the docs advertise a size is matched against the measured figure, and a reworded claim that stops matching fails rather than going silently unchecked.
- New repo checks wired into `npm run check`: `check:docs:dev-warns` (the dev-warning doc and `ENV_NAME` must name the same set, with monotonic section numbers), `check:design-rule-5` (every top-level `let` in `src/` must be accounted for by the documented rule), and `check:skills` (a skill file restating a threshold its owner disagrees with fails).

## [3.0.0] - 2026-07-27

- **kerf no longer infers development mode — add one line to your entry to keep the dev diagnostics.**

  ```js
  if (import.meta.env.DEV) await import("kerfjs/dev"); // Vite
  if (process.env.NODE_ENV !== "production") await import("kerfjs/dev"); // webpack / Node
  ```

  Without it you get production shape: no dev warnings, no read-only `defineStore` `get()`
  snapshot, and a screened dangerous URL warns-and-drops instead of throwing. Nothing else
  changes, and if you never used the dev warnings you get a smaller bundle for free.

  **Why it changed.** kerf inferred its own dev/prod mode by reading `globalThis.process?.env?.NODE_ENV`. Bundlers substitute the _bare_ `process.env.NODE_ENV` token and never create a `globalThis.process` object for browser targets, so that read was `undefined`, `undefined !== 'production'` was `true`, and every production browser build silently took the development path. Consequences that were shipping: every `defineStore` `get()` returned a deep read-only `Proxy` (an allocation on every store read), a screened `javascript:`/`data:` URL **threw** instead of the documented warn-and-drop, and the always-on list-key warnings printed to production consoles. Server/Node builds, where `process` exists, were unaffected.

  Removing the inference also shrinks production bundles by **~4.7 KB min+gzip (27%)** — a realistic import (`signal`/`computed`/`effect`/`batch`/`mount`/`each`/`delegate`) goes from 16.91 KB to **12.24 KB**. Previously the dev-warning modules were imported unconditionally by `mount()`/`each()` and gated at runtime, so they shipped to production regardless of build mode and no amount of tree-shaking could reclaim them. With the dev entry absent they are unreachable, and the `import()` statement itself is eliminated — the chunk is never emitted, let alone fetched.

  `globalThis.KERF_DEV` is no longer consulted — not importing the dev entry is now the (compile-time) way to opt out. One ordering note: `signal()` picks its constructor at creation time, so put the import first if you rely on the untracked-signal warning.

- The `KERF_DEV_WARN_*` diagnostics no longer consult `NODE_ENV` or `globalThis.KERF_DEV` at all. Whether they run is decided in exactly one place: whether you imported `kerfjs/dev`. The previous release stopped kerf's core from inferring dev mode but left a second, inherited gate inside each warner, so a Node/SSR consumer who _deliberately_ installed the diagnostics under `NODE_ENV=production` got silence — and `globalThis.KERF_DEV = false` still silenced warnings the consumer had explicitly opted into. Both are gone; each warning is now gated only by its own env var. If you were using `globalThis.KERF_DEV` to turn diagnostics off, remove the dev import instead (which is also what sheds the ~4.7 KB from your bundle).

- **New:** `each()` accepts an options object — `each(items, render, { cacheKey, key })` — and `key` gives a list a **stable identity**. Without one a list is identified by its position among the `each()` calls in a render, so adding or removing a conditional list above it made kerf rebuild it from scratch: rows lost their DOM nodes, and with them focus, scroll position and in-progress IME composition. Keying a list removes that dependency; because a keyed list doesn't occupy a positional slot, keying just the _conditional_ list usually stabilizes its siblings too. The existing three-argument `each(items, render, cacheKey)` form is unchanged. In development kerf now warns once per list when it detects such a shift and names the fix.

- **`kerfjs/dev` now exports `enableWarnings()`** — and it fixes a defect: until now, none of the
  `KERF_DEV_WARN_*` diagnostics could be switched on in a browser at all. Every one of them read `globalThis.process.env`, which does not exist in a browser realm — and a bundler `define` cannot reach it either, because the read goes through `globalThis.process` into a local binding rather than the substitutable `process.env.X` token. So in a Vite/webpack dev server, the environment where these warnings are most wanted, the entire opt-in family was permanently and silently off. Only Node/SSR (and kerf's own vitest suite, which is why nothing caught it) could turn any of them on.

  The new export switches diagnostics on from code — where you already are at the moment you opt in:

  ```js
  if (import.meta.env.DEV) {
    const dev = await import("kerfjs/dev");
    dev.enableWarnings({
      staleBinding: true,
      narrowSet: true,
      invariants: "throw",
    });
  }
  ```

  Keys are the same warnings under camelCase names (`rebuiltListeners`, `untrackedSignals`, `narrowSet`, `delegateInEffect`, `eachInMorphSkip`, `duplicateEachKeys`, `staleBinding`, `valueOnlyRerender`, `listRebind`, `staleIndex`, `parserRepair`, plus `invariants: true | 'throw'`), and they autocomplete, which an env-var name never did. The `KERF_DEV_WARN_*` variables keep working for Node, SSR, and CI; an explicit call wins over the environment in both directions, so `{ narrowSet: false }` silences an ambient variable.

- New opt-in development check `KERF_DEV_INVARIANTS=1` (or `=throw`): after every render kerf audits its list bookkeeping against the live DOM — markers still in the tree and still carrying their own list's id, rows attached under the list's own parent in order after its marker, no row claimed by two lists, no two lists' rows interleaved in one parent, and each list holding as many rows as the data it rendered from (so a list that reconciled to the wrong number of rows is caught at the render that did it, not several interactions later). Unlike the rest of the `KERF_DEV_*` family it doesn't describe a pattern to change in your app; it reports a bug in kerf, at the render that caused it rather than as a wrong picture several interactions later. Off by default with no cost when unset; kerf's own test suites run it in `throw` mode.

- New opt-in dev warning `KERF_DEV_WARN_STALE_INDEX=1`: fires when an `each()` list reuses a memoized row at a different index than it rendered at, while the row's render function takes an `index` argument. `each()` memoizes rows by object identity, not position — the `index` argument is not part of the memo key — so a reorder or a non-tail insert/remove/move serves a moved row the HTML it rendered at its old index, and a numbered list, zebra striping, or an "N of M" label silently shows the wrong value on just those rows. The warning names the fix (`each(items, render, { cacheKey: (_, i) => i })`, which folds the index into the memo key so displaced rows re-render). Off by default with zero production cost, like the rest of the `KERF_DEV_WARN_*` family; also newly documented in `docs/4-render.md`.

- New opt-in dev warning `KERF_DEV_WARN_PARSER_REPAIR=1`: fires (once per tag pair) when your markup puts a block-level element inside a `<p>`. The HTML parser closes a `<p>` before block content, so the `<p>` ends up empty and its children become its siblings — kerf reconciles that repaired tree correctly and updates keep working, but the structure you wrote is gone, along with any CSS or `querySelector` that relied on it. The symptom shows up far from the cause, which is why it is worth naming.

- New opt-in dev warning `KERF_DEV_WARN_LIST_REBIND=1`: fires (once per list) when an `each()` list's container is rebuilt by the morph — an ancestor's tag changed across renders, so the subtree was replaced and the list self-healed by re-binding and repopulating. The recovery is correct but discards row DOM state (focus, scroll, IME, imperative listeners); the warning names the list and points at keeping ancestor tags stable. Follows the standard `KERF_DEV_WARN_*` family rules: off by default, dev-mode only, zero production cost.

- `KERF_DEV_WARN_UNTRACKED_SIGNALS=1` now tells you what it can and cannot see. The warning picks its machinery when a signal is _created_, so it only covers signals created after `kerfjs/dev` is installed — and because static imports are hoisted above a top-level `await import('kerfjs/dev')`, the module-scope signals it most wants to catch are usually created first. Previously that failed silently: you set the env var, saw nothing, and concluded your code was clean. Opting in now prints the coverage boundary once, along with the fix (make `import 'kerfjs/dev'` the first static import of a dev-only entry file). The boundary itself can't be removed — `Signal.prototype`'s `value` accessor is non-configurable, so already-created signals can't be retro-fitted without kerf keeping a registry of every signal, which production would pay for.

- An `each()` of `<tr>` written directly inside `<table>` now fails with a clear error instead of silently duplicating rows: the HTML parser inserts a `<tbody>` around the rows, which kerf cannot bind through. The message names both tags and shows the supported shape (`<table><tbody>{each(...)}</tbody></table>`). Previously this also mis-reported the rows as missing `data-key`.

- A keyed `each()` written inside another list's row now explains that nested lists aren't reconciled, instead of reporting a duplicate key.

- Toolchain: the repo now type-checks with the native **TypeScript 7** compiler across every gate (`typecheck`, the dist `.d.ts` typing gates, the docs code-block compile — a full-repo `tsc --noEmit` now takes ~0.3 s), with `typescript@6` (the JS-API bridge release) retained for tsup's `.d.ts` emit and typescript-eslint, which still require the JS compiler API. `@typescript-eslint/*` bumped to 8.65. No shipped-code changes — `dist/` output is unaffected.

- Fixed: passing a **function** as an `each()` item through an `arraySignal` insert/update (an unusual mistake, but functions are valid `WeakMap` keys so the per-item cache silently accepted them) rendered the row and then threw `each(): items must be objects…` on a _later, unrelated_ re-render — far from the cause. The granular path now enforces the same objects-only item contract the snapshot path does, so the error is thrown on the render the offending mutation triggered, naming the type and index. Primitive items already behaved this way; functions now match.

- `arraySignal.update(i, fn)` now works when `fn` mutates the row object and returns it (not only when it returns a fresh object). Previously such a same-ref update rendered correctly in one list but left every other view of the same signal — a second list, a second `mount()`, a `filter()`ed plain-array view — permanently stale, and was lost outright when the update was batched with a selection change or a `replace()`. kerf now tracks a per-item content version so the change reaches every consumer. Returning a fresh object remains the idiomatic style; both are supported. (Fixed in the same line of work: the per-item version tracking briefly made `arraySignal.update()` throw on a signal of primitives — `arraySignal<number>` used as a plain signal — because a primitive can't key the internal version map; primitive items are now simply skipped, since only object rows are ever memoized.)

- Fixed: `each()` rows under a `<math>` element rendered as MathML on first paint but fell into the HTML namespace on every later update (a granular insert, or a rebuild) — the rows became inert `HTMLUnknownElement`s that don't display as math. Row re-parsing now re-enters MathML foreign content the same way it already did for SVG (the KF-389 fix, generalized), so MathML lists keep their namespace across updates. The reverse case is handled too: a list of ordinary HTML rows placed where the parser re-enters HTML content — SVG `<foreignObject>`/`<desc>`/`<title>`, MathML `<mi>`/`<mo>`/`<mn>`/`<ms>`/`<mtext>` — is no longer wrapped on update, so those rows keep the HTML namespace instead of crashing (a block-level row) or turning foreign (an inline row). And a genuine "row produced the wrong number of elements" error now reports the count kerf actually parsed, rather than a misleading one from a re-parse in the wrong namespace.

- Fixed: a list rendered ZERO rows when a granular `arraySignal` change (an `insert`/`remove`/`update`) was batched with a re-render that rebuilt the list's container — a swapped ancestor tag, or a sibling appearing and positionally taking the container's place (e.g. a banner toggled on in the same update that removed a row). The list's data was intact in the signal; kerf now detects the rebuild and re-renders the affected list from a full snapshot instead of blanking it.

- Fixed: the diff could repurpose a `data-morph-skip-children` slot or an imperatively-injected `data-morph-preserve` node when a conditional sibling reappeared at its position — destroying a client-hydrated subtree, or a tooltip/overlay you injected. The morph now refuses to positionally adopt any node marked `data-morph-skip` / `data-morph-skip-children` / `data-morph-preserve` as a stand-in for an unrelated template element; it inserts the template element fresh beside it. A keyed match still morphs such a node in place.

- Fixed: an `arraySignal.update()` that mutated a row object in place (returning the same reference) could be silently reverted to its old content by the next unrelated re-render. The granular update path now keeps kerf's per-row HTML cache in sync with what it rendered, so the two never disagree. (Immutable updates — returning a fresh object — were unaffected, and remain the recommendation.)

- Fixed: showing an empty conditionally-rendered `each()` list in the same batch as an update to a _sibling_ list could empty the sibling entirely — it rendered zero rows. When the conditional list reappeared, its list-marker comment landed next to the sibling's, and the diff overwrote the sibling marker's internal id with the reappearing one's, so the sibling's binding could no longer find its own marker. Marker comments (kerf's internal list and binding anchors) now pair only with the identical marker, never with a different one that happens to be the same kind. Ordinary comments in your markup are unaffected.

- Fixed: when an element rendered by a condition came back, the diff could pair it with an unrelated sibling that happened to have the same tag, and then whatever protects that sibling's contents kept the wrong contents alive inside it. A `data-morph-skip` widget **swallowed** the reappearing element — its content never rendered — and the widget was duplicated, which for a library-owned subtree (an editor, a chart, a terminal) means a second live instance attached to a node the library has no reference to. A `data-morph-preserve` child ended up under the foreign host and appeared twice. A bound hole's text leaked into the reappearing element and rendered twice. Three rules now gate that pairing: an element with an `id`/`data-key` is only ever matched to a live element with the same key; a `data-morph-skip` element only ever matches another one (so a library-owned subtree is never adopted as a stand-in, whether or not you use keys); and a comment anchoring kerf's own state only matches an anchor of the same kind. Ordinary elements without a key still match positionally exactly as before.

- Fixed: when the number of `each()` calls in a render changed — a conditional list appearing or disappearing — a _surviving_ list could render the departed list's rows, or render its own rows inside the wrong container. Lists without a `key` are identified by their position among the `each()` calls, and both the per-item HTML cache and the live list binding were being read as belonging to whichever list now held that position. Two lists over the same collection hit each other's cache exactly, so nothing could detect it from the data. A shift now discards that state and re-renders, which is what the documentation already described it as costing: a rebuild, never wrong output. Lists given a `key` are unaffected, and a render that doesn't change the call count is unaffected. One related improvement falls out: an unrelated list no longer loses its row nodes when a nested `each()` shifts the count.

- Fixed: a row added to an `each()` list could land in the wrong place whenever the list wasn't the last thing inside its parent. A list ends at its last row, but kerf was looking for the next _element_ after it and skipping everything else on the way — so static content following the list (a footer row, a totals line, an "add item" control) got jumped, and a new row appeared after it instead of before. The same skip crossed a neighboring list's internal anchor: with two `each()` lists in one parent, rows from the first could be placed inside the second's region, and when both lists started empty their rows came out **in the wrong order** — the second list's rows rendered first. Both were correct on the initial paint and only went wrong on a later update, which made them read as intermittent. Lists now anchor on the next node of any kind, so a list's rows always stay within its own region.

- Fixed: an `each()` list inside an `<svg>` whose row markup contained an apostrophe (or anything else the serializer writes back differently) failed to mount at all, with a self-contradictory error. Also fixed: `each({ key })` now validates the key, so a key containing an HTML comment terminator can no longer break out of the list's internal marker and put markup in the page.

- The development warning about list identity no longer fires when a list simply swaps which data it renders (a filter or tab change) — it only reports an actual identity shift, and each mount now reports its own.

- Fixed: a controlled `<textarea>` row could keep a stale value after the user had typed in it, when the update changed only its text.

- Focus now survives every move the diff makes, not just morph-in-place updates — moving a subtree (a keyed match, a shifted sibling) no longer drops the caret on engines that blur on `insertBefore`.

- Fixed: a controlled `checked` / `value` on an `each()` row's own top-level element could stay visibly stale after the user had interacted with it — the row reconciler's attribute-only fast path wrote the attribute without syncing the live property, so whether the control obeyed your data depended on which internal route the update happened to take.

- Fixed: when a conditionally-rendered `each()` list is added or removed, a sibling list could render the _other_ list's rows — a batched "hide one list and push to another" applied the queued update to the wrong list's DOM. Lists now verify which data a pending update belongs to before applying it, and rebuild from their own items when it doesn't match.

- Fixed: `each()` rows inside an `<svg>` root were re-parsed in the HTML namespace on every update, so rows added or structurally changed after the first render were invisible in the browser — the initial picture looked right, which made it read as a rendering flake. Row parsing now follows the list parent's namespace (rows under `<foreignObject>` correctly stay HTML).

- Fixed: removing a conditionally-rendered sibling ahead of a keyed `each()` list (e.g. a banner that disappears) permanently emptied the list — the morph rebuilt the list's container from the template and the list binding stayed pointed at the detached subtree, silently rendering zero rows forever. The morph now performs a positional lookahead (a later same-tag live element is moved up and morphed in place instead of being cloned from scratch), so list containers — and any stateful element — survive a preceding sibling's removal with node identity intact. As defense in depth, `mount()` now self-heals a list binding whose marker left the live tree (e.g. an ancestor's tag changed, so the whole subtree was replaced): the stale binding is dropped and re-bound so rows repopulate instead of vanishing.

- Fixed: anything sitting between a keyed `each()` list's anchor and its rows — a node injected imperatively into the list region — could make a conditional sibling's removal reorder the list, landing a trailing sibling ahead of the rows. A list's row region (anchor through last row) is now treated as one unit by the diff: it moves whole, the diff's cursor steps over it whole, and injected nodes inside it travel along keeping their position relative to the rows.

- A conditional sibling _inside_ a keyed `each()` list's parent — a header row that comes and goes above the list — no longer costs the list's rows their DOM identity. The morph now recognizes the list's marker when a sibling shifts it, moving the marker and its rows up as a single unit instead of rebuilding the list, so row nodes, focus, and the caret survive the toggle. (An ancestor tag change, or a same-tag sibling that positionally takes the container's place, still rebuilds the list — give the list's own container a stable `id`/`data-key` if its rows need to survive that.)

- Fixed: a conditional sibling that shared or positionally shadowed a keyed `each()` list's container could strand the list's rows and then render a duplicate copy of them (e.g. a header `<li>` toggled inside the list's `<ul>`, or a same-tag banner `<ul>` before the list container). The morph can separate the list's marker comment from its still-attached rows; the self-heal now removes any such still-live stranded rows before repopulating, so recovery replaces the rows rather than duplicating them.

## [2.0.1] - 2026-07-23

- Fixed a `morph()` bug where static text siblings of a fine-grained bound text hole were dropped after a structural re-render (e.g. `<div>{label} / static</div>` collapsing to just the label).

- New animated coding-session demo on the getting-started page: watch the canonical counter get typed out, served, clicked in a browser, and live-edited into a todo list.
- Added an animated architecture diagram and a link to the docs site from the README.

## [2.0.0] - 2026-07-23

- `delegateCapture()` now uses `closest()`-style walk-up matching like `delegate()`, passing the matched ancestor to the handler; pass `{ match: 'direct' }` (new `DelegateOptions`) to restore exact-element matching.
- The dangerous-URL screen (`javascript:`, `vbscript:`, script-executing `data:` URLs) now throws an error in development instead of only warning. Production behavior is unchanged: warn and drop the attribute.

- New `kerfjs/html` tagged template: author kerf UIs with no build step (CDN / importmap, no JSX transform) with runtime semantics identical to JSX — signal holes become fine-grained bindings, attributes and text are escaped and URL-screened the same way.
- New no-build example app, **live-poll**, served exactly as authored — an importmap plus one `html`-templated module, with view-source showing the app.
- Added `<filter>` to the typed JSX intrinsic elements, so SVG filters compile in JSX-authored code.
- Fully-bound mounts are now a documented, test-pinned guarantee: a render that reads no signal `.value` runs exactly once, forever — every update is a direct per-node write.

- Controlled form state now survives user interaction: `checked`, `value`, and `selected` DOM properties are synced when the reconciler mutates those attributes, so a clicked checkbox or typed-into input no longer ignores later updates.
- Fixed stale fine-grained bindings after `arraySignal.update()`: in-place row updates now re-wire bindings whose signal instance changed, instead of leaving effects reading the old row object forever.

- New runtime dev-mode override: set `globalThis.KERF_DEV = false` (or `true`) to control dev mode without a bundler — CDN/importmap apps are no longer stuck in dev mode in production.
- Two new opt-in dev warnings: `KERF_DEV_WARN_STALE_BINDING` flags bindings that silently go stale on the byte-equal fast path, and `KERF_DEV_WARN_VALUE_ONLY_RERENDER` flags re-renders whose only changes could have been fine-grained bindings.
- `defineStore`'s dev-mode `get()` snapshot now returns a deep read-only proxy instead of freezing the live state: nested mutations like `get().nested.x = 1` are caught too, and they throw a descriptive `TypeError` rather than failing silently.

- Docs repositioned around the "values bind, structure re-renders" idiom as the primary way to render dynamic values, across the overview, reactivity guide, and AI assistant configs.
- New guide covering the no-build authoring path and example app, plus a documentation-wide accuracy pass (delegate capture semantics, `effect()` cleanup returns, URL-screen behavior, and more).

## [1.0.2] - 2026-07-22

- Fixed the row-selector demo animation 404ing on the published site — the missing SVG capture is now generated and committed.

## [1.0.1] - 2026-07-22

- KF-329: pin release-workflow npm upgrade to npm@11 — npm@12 needs Node ≥ 22.22.2, above the 22.21.0 pin (`c54559f`)

## [1.0.0] - 2026-07-22

- **Fine-grained signal bindings** — pass a signal or `computed` directly into a JSX attribute or text hole (e.g. `class={computed(...)}` or `{sig}`) inside `mount()`, and that one node updates on signal change without re-running `render()` or walking the list reconciler. Opt-in per hole and non-breaking; works in static content and inside `each()` rows on both the snapshot and `arraySignal` reconcile paths, with binding effects correctly wired, carried, and disposed across row insert/update/remove/move.
- Bound values get the same safety treatment as static ones: URL screening and `SafeHtml`/`raw()` unwrapping now apply to fine-grained bound attributes.
- New interactive benchmark playground (`npm run bench:serve`) to explore kerf by hand in the standard 1k-rows benchmark app.
- New **row-selector** example app and a "Fine-grained bindings" section in the reactivity demo, both showing select-row updates with zero render re-runs and zero list reconciles.

- Hardened the dangerous-URL screen: scheme detection now normalizes away C0 control characters, DEL, and leading whitespace, so obfuscations like `java	script:` or a NUL before the colon can no longer slip `javascript:`/`vbscript:` URLs past the check.
- Attribute names are now validated — malformed names (e.g. from spreading attacker-controlled keys into JSX) throw instead of breaking out of the open tag, and inline `on*` event handlers are rejected on both the static and signal-bound attribute paths, closing an XSS vector where a bound `onclick` would have installed a live handler.
- Documented kerf's reserved marker namespace (`data-kfb`, `data-kfbrow`, `kfb:`/`kfbr:`/`kf-list:` comments) — consumer content using these can collide with binding wiring, so they're now explicitly reserved.
- Documented the trusted-input bridges (`toElement()`, `morph()` with string/Element templates, `<iframe srcdoc>`) that bypass escaping by design, and the `raw()`/`SafeHtml` trust boundary.
- Hardened the release pipeline: least-privilege OIDC scoping per job, SHA-pinned GitHub Actions with automated Dependabot bumps, and a token-holding publish job that runs with `--ignore-scripts` and no build tools.

- Reduced the per-row create cost of fine-grained row bindings from ~1.65× to ~1.15× via lazy row wiring — the common single-root-binding case now needs no subtree walk or extra allocations.
- Published cross-framework benchmark numbers now come from the official upstream krausest js-framework-benchmark run (kerf is a merged upstream entry), replacing stale local-machine measurements.

- README refreshed for the 1.0 release: fine-grained updates and safe-by-default escaping promoted to headline features, and the status line flipped from "Pre-1.0 — API may evolve" to stable 1.0.
- Fine-grained bindings documented across all consumer and AI-assistant surfaces (reactivity docs, API reference, usage guide, Cursor rules, Claude skill).

- **Signposted the raw HTML/SVG → DOM bridges as trusted-input only.** `toElement()`, `morph()` (with a string/Element template), and the `<iframe srcdoc>` attribute bypass kerf's escaping/URL-screening by design — they're the same trust model as `innerHTML` / `raw()`. The docs now call this out loudly, including that the SVG path is _more_ dangerous than the HTML path (a top-level `<svg><script>`, SVG event attributes, and `xlink:href="javascript:"` execute once inserted, whereas an HTML-string `<script>` is inert), and that `srcdoc` is HTML a browser re-parses as a document (so `srcdoc={userString}` executes even though the value is escaped as an attribute). No behavior change — these are documentation + regression tests: a real-browser spec (`tests/browser/trusted-html-bridges.spec.ts`) pins the execution boundary across Chromium/Firefox/WebKit, a unit test pins that the granular list fast path keeps the URL screen's guarantee end-to-end, and another pins that SVG input isn't sanitized. See [`docs/7-svg.md`](docs/7-svg.md) § Security, [`docs/8-api-reference.md`](docs/8-api-reference.md), and [`docs/6-jsx-runtime.md`](docs/6-jsx-runtime.md) §6.4.3.
- **Documented kerf's reserved marker namespace.** Fine-grained bindings and `each()` lists coordinate through in-band markers that the wiring pass finds by scanning the mounted subtree and matching by id. A consumer element that carries one of those names can collide with a real binding's id and silently steal its update, so the names are now documented as reserved: the `data-kfb` / `data-kfbrow` attributes and HTML comments beginning `kfb:` / `kfbr:` / `kf-list:`. Don't emit them from your own markup or via `raw()`. (kerf's escaping already prevents a plain text/attribute _value_ from forging one — the only ways in are hand-written markup or `raw()`.) See [`docs/2-reactivity.md`](docs/2-reactivity.md) § "Reserved marker names".
- **Attribute names are now validated, and inline event handlers are rejected outright.** The JSX runtime already escaped attribute _values_; it now also validates each attribute _name_ against a safe shape (a letter/underscore/colon followed by letters, digits, or `_ . : -`) and **throws** on anything else. This closes a markup-injection vector when an object with attacker-controlled keys is spread into JSX (`<div {...untrustedObj}>`) — previously a key like `'x><img onerror=…>'` broke out of the open tag even though the value was escaped. Separately, any `on*` attribute (a function _or_ a string value, in any case — e.g. `onClick={fn}` or `onclick="…"`) now throws and points at `delegate()`; previously only function-valued keys matching `/^on[A-Z]/` were caught, so a string `onclick="alert(1)"` slipped through and became a live inline handler when parsed. Both checks now cover the **fine-grained bound path** too: a signal bound straight into an attribute (`onclick={signal}`) is written with `setAttribute`, and `setAttribute('onclick', …)` installs a live inline handler just as a parsed string would — so an `on*` (or malformed) name bound as a signal is rejected at binding time, closing the same vector on the signal path. See [`docs/6-jsx-runtime.md`](docs/6-jsx-runtime.md) §6.4.2.
- **Hardened the dangerous-URL screen.** The URL-attribute filter (on `href`/`src`/`xlink:href`/`formaction`/`action`) now: (1) sees through control-character and whitespace obfuscation of the scheme — a leading ``, an in-scheme `TAB`/`LF`/`CR` (`java	script:`), or a `NUL` before the colon are all normalized away before the scheme is read, matching how a browser resolves the URL, so they can no longer slip a `javascript:` past the screen; (2) treats `data:` by subtype instead of only blocking `data:text/html` — script-executing document types (`data:text/html`, `data:image/svg+xml`, XHTML/XML) are dropped while inert media (raster images, fonts, audio, video, plain text/CSS) still pass, and any unknown subtype fails closed; and (3) also screens the `data` attribute on `<object>` (which loads its target as a document). `raw()` remains the opt-out. Both the static serializer and the fine-grained bound-attribute writer share the screen, so both paths are covered.
- **Fine-grained signal bindings.** Hand a `Signal`/`computed` _itself_ (not its `.value`) into a JSX attribute (`class={someSignal}`) or a text hole (`{someSignal}`) inside a `mount()`, and kerf binds that hole directly to the signal: when the signal changes, only that attribute/text node updates — the render function does **not** re-run and the list reconciler does **not** walk. This is kerf's fine-grained update tier, sitting below the coarse `mount()` effect, for the "external state drives one spot" pattern (a `selectedId` flipping a row's class, a live status attribute, etc.). Works in static content and inside `each()` rows on both the snapshot and `arraySignal` (granular) paths, and row bindings' lifetimes track their row node (a row reorder is free; a removed row's binding is torn down). Opt-in and non-breaking: passing a raw signal into JSX previously threw, so existing apps are unchanged, and any hole that isn't a signal stringifies exactly as before. Bound URL attributes (`href`/`src`/`formaction`/`action`/`xlink:href`) get the same `javascript:`/`vbscript:`/`data:text/html` screening as static attributes (`raw()` opts out). Outside a `mount()` (SSR / `SafeHtml.toString()`) a bound signal snapshots its current value and emits no markers. See [`docs/2-reactivity.md`](docs/2-reactivity.md) §2.9.

## [0.16.0] - 2026-07-01

- Fixed keyed-list selection breaking after a row was removed: a signal read only inside `each()`'s `cacheKey` (such as a `selectedId` toggling a row's class) no longer drops out of the reactive dependency set, so later changes re-render correctly.
- Fixed appending items to a list after clearing it rendering nothing.

- `each()` on an `arraySignal`: appending rows to a list that was just emptied (e.g. **Clear** then **Append**) now renders the new rows immediately, instead of showing nothing until a second append. After the list was emptied its binding was empty but no longer in its first-render state, so the granular insert path emitted a segment the reconciler rendered as empty; repopulating an emptied list now takes the snapshot (build-from-scratch) path, the same as a first render.
- `each()` on an `arraySignal`: a signal read only inside the `cacheKey` comparator (the "external state drives the row" pattern — e.g. a `selectedId` flipping a row's class) now stays tracked across a granular structural update. Previously, after a granular insert/remove/update/move, that signal dropped out of the `mount()` effect's dependency set (the granular path never re-evaluates `cacheKey` for untouched rows), so a later change to it silently failed to re-render — e.g. row selection stopped working after a row was deleted. The granular path now re-reads every row's `cacheKey`, which both keeps those signals tracked and detects content drift the patches can't express (a selection flip batched together with a structural change), falling back to the snapshot path when it does.

## [0.15.5] - 2026-06-30

- Corrected the advertised bundle size in `llms.txt` to ~11 KB minified + gzipped (including the `@preact/signals-core` runtime dependency; ~12 KB with `arraySignal`), matching the README.

## [0.15.4] - 2026-06-30

- `llms.txt` is now published at a public docs-site URL and bundled in the npm package, making kerf's AI-assistant documentation index discoverable to llms.txt directories and tooling.

- The `kerfjs` package now bundles `llms.txt` (the AI-discovery index) at the package root, and the docs site serves it at `https://brianwestphal.github.io/kerf/llms.txt`. Its links are now absolute GitHub URLs so the file is portable across GitHub, the site, and the installed package.

## [0.15.3] - 2026-06-30

- `npm create kerf-component` with no directory argument now prompts for the target directory (defaulting to `my-kerf-component`, with a `.` hint for the current directory) instead of printing usage text and exiting with an error.

## [0.15.2] - 2026-06-30

- Added the `create-kerf-component` initializer — scaffold a ready-to-publish kerf component package with `npm create kerf-component@latest <dir>`, no need to reverse-engineer the packaging rules.

## [0.15.1] - 2026-06-30

- README refresh + eslint rule-count fixes + CHANGELOG hygiene (`cfbaef3`)

## [0.15.0] - 2026-06-30

- List updates now morph same-identity rows in place instead of recreating their DOM nodes, avoiding full-table relayout on large lists and preserving DOM identity, focus, and IME composition across re-renders.

- New guide on incremental migration: kerf can own a single DOM subtree and coexist with React (or any framework), letting you migrate one island at a time.
- New guide on building and publishing reusable kerf components as npm packages.
- Example app documentation pages now open with an animated SVG preview of the real app in action, plus a gallery on the complete-examples index.

## [0.14.0] - 2026-05-27

- Fix `toElement()` first-paint divergence in WebKit by adopting its result into the live document
- Fix `mount()` first render in WebKit by adopting an inert `rootEl` into the live document

## [0.13.0] - 2026-05-23

- Add `KERF_DEV_WARN_DELEGATE_IN_EFFECT` dev warning to catch `delegate()` calls inside reactive effects
- New `require-delegate-disposer` ESLint rule flags `delegate()` calls whose disposer is discarded
- Document `delegate()` disposer gotchas and canonical cleanup patterns

## [0.12.1] - 2026-05-22

- Add GitHub Sponsors link to README, homepage, and npm `funding` field

## [0.12.0] - 2026-05-22

- `toElement` now returns `Element | DocumentFragment` to support multi-root inputs

## [0.11.1] - 2026-05-21

- `attr()` redesign: typed `AttrSpec<N, V>` exposes `.attrs` with dual overloads for cleaner attribute handling

## [0.11.0] - 2026-05-21

- `attr()` redesigned with `AttrSpec<N,V>` shape, `.attrs` accessor, and dual overloads
- Hardened defensive programming across the runtime for safer edge-case handling
- Refreshed published performance numbers from a fresh cross-framework benchmark run

## [0.10.0] - 2026-05-20

- Expose `kerfjs/ai/*` subpaths via package `exports` so the bundled skill/cursorrules files are resolvable
- Add a defensive fallback in `kerfjs/ai-assistant-configs` ESLint rule so it fires against installed kerfjs versions whose `exports` block subpath resolution

## [0.9.1] - 2026-05-20

- Bundle the kerf-app Claude Code skill and Cursor rules inside the npm package at `ai/skill.md`, `ai/cursorrules`, and `ai/manifest.json`
- Add `kerfjs/ai-assistant-configs` rule to `eslint-plugin-kerfjs` (warn in recommended) to flag drift in installed AI assistant configs
- `eslint --fix` now replaces only the canonical section above the `KERF-APP-CANONICAL-END` marker, preserving consumer customizations below it

## [0.9.0] - 2026-05-20

- Bundle the kerf-app Claude Code skill and Cursor rules inside the npm package at `ai/skill.md`, `ai/cursorrules`, and `ai/manifest.json`
- Add `kerfjs/ai-assistant-configs` rule (warn in recommended) to `eslint-plugin-kerfjs` v0.9.0 to surface AI-config drift on every lint pass
- Canonical-file contract (`kerf-skill-version` + `KERF-APP-CANONICAL-END` marker) lets `eslint --fix` refresh the canonical section while preserving consumer customizations below the marker

## [0.8.2] - 2026-05-19

- Package `homepage` fields now point to the published docs site, with prominent links in both READMEs

## [0.8.1] - 2026-05-19

- New `eslint-plugin-kerfjs` with four AST rules enforcing kerf Hard Rules

## [0.8.0] - 2026-05-18

- Add opt-in dev warning `KERF_DEV_WARN_NARROW_SET=1` that fires when `set()` is called with a partial-state object (replace semantics would silently drop missing keys); names the missing keys and points at the `set({ ...get(), ...next })` merge fix
- Widen `KerfBaseAttrs.contentEditable` to accept `'plaintext-only'` and add the lowercase `contenteditable` alias
- Expand the `/kerf/migrating/` hub to 13 frameworks — adds Vue 3, Svelte 5, Solid, Preact, htmx, Angular, jQuery, Redux, and Astro pages alongside a refreshed 8-framework comparison matrix
- New runnable example apps: `cart-htmx` (htmx swap → kerf island mount pattern) and `counter-store` (sync + async + persisted store)
- Fix TodoMVC example: store actions now spread `get()` into `set()` so filter/edit interactions no longer wipe state
- Drop AI-evidence pages, the AI marketing page, the blog, and the built-by-an-AI example; remaining docs re-toned to verifiable claims only
- New `scripts/check-docs-examples.mjs` doc/example consistency gate (wired into `npm run check`): verifies every example linked from a migration page is built + tested, and typechecks self-contained doc code blocks against `dist/`

## [0.7.0] - 2026-05-18

- Granular list updates now preserve DOM identity, focus, scroll, IME state, `<details open>`/`<dialog open>`, and `data-morph-skip` subtrees across in-place row updates
- Two new fast paths in the granular reconciler cut krausest select-row by 71% (27.8 → 8.2 ms) and partial-update by 28% (46.8 → 33.8 ms)
- `each()`'s third parameter renamed from `key` to `cacheKey` to clarify it's a passive cache-invalidation comparator, not a React-style reconciliation identity; positional callers unaffected
- JSX types now accept lowercase HTML attribute names (`class`, `for`, `tabindex`, `autofocus`, `autocomplete`, `spellcheck`) alongside the camelCase forms
- New public `morph(liveRoot, template)` export — kerf's general-purpose DOM reconciler, replacing the prior morphdom dependency
- `mount()` now throws if called on an element already inside (or containing) a mounted tree
- New `defineStore` dev-mode safety: `get()` snapshots are frozen so accidental mutations throw a `TypeError` instead of silently desyncing reactive consumers
- Clearer JSX runtime error for inline `onClick={handler}`-style attributes that points at `delegate()` as the fix
- Two opt-in dev warnings via env vars: `KERF_DEV_WARN_REBUILT_LISTENERS=1` flags rebuilt listener-bearing nodes; `KERF_DEV_WARN_UNTRACKED_SIGNALS=1` flags signal writes with no subscribers; `each()` now warns once per binding when the first row has no `id` or `data-key`
- New `kerfjs/jsx-runtime` re-exports of `KerfBaseAttrs`, `KerfCustomElement`, `AttrLike`, `AttrValue`, `DataAriaAttrs` for declaration-merging custom-element types
- New `bench/micro/` Vitest bench-mode harness (`npm run bench:micro`) for primitive-level perf questions that don't need the full krausest run
- Docs: the AI usage-guide gains a decision-making-axes section and an explicit antipattern callout for `each(STATIC_ARRAY, …)` rows that read dynamic signals

## [0.6.0] - 2026-05-11

- Public `morph(liveRoot, template)` export for standalone DOM reconciliation
- New `data-morph-preserve` attribute to opt elements out of morphing
- New `data-morph-skip-children` attribute — morph host attrs but leave subtree intact
- Drop-in AI-tool config files (`kerf.cursorrules`, `kerf.claude-skill.md`) for Cursor and Claude Code
- Adopt American-English spelling everywhere — prose, comments, identifiers, and test names; the existing codebase was swept in the same change

## [0.5.1] - 2026-05-11

- Fix `dist/jsx-runtime.d.ts` IntrinsicElements self-shadow that broke JSX typing in consumer apps

## [0.5.0] - 2026-05-10

- Add `arraySignal` (`kerfjs/array-signal` subpath) — granular collection signal that drives O(patches) DOM updates for keyed lists
- Faster keyed-list updates: bulk-parse contiguous insert runs and consecutive update patches in the granular reconcile path
- Perf optimizations on the `each()` / `mount()` update path; benchmarks now competitive with Solid/Vue on swap/remove/clear
- Preserve uncontrolled `<details open>` and `<dialog open>` state across re-renders
- `each()` now reconciles correctly when list rows have non-list siblings under the same parent
- Enforce the "exactly one top-level element per row" contract in `each()` with clearer errors
- Typed JSX `IntrinsicElements` table; custom elements extend it via declaration merging
- JSX runtime hardens URL attributes against `javascript:` XSS
- Widen `mount()` return type for better tooling/typed usage
- Add `kerfjs/testing` subpath exposing `clearStoreRegistry` for unit-test isolation

## [0.4.2] - 2026-05-09

- No user-facing changes in this release.

## [0.4.1] - 2026-05-09

- Just fixing the build

## [0.4.0] - 2026-05-09

- `delegate()` now auto-promotes the seven well-known non-bubbling events (`focus`, `blur`, `scroll`, `load`, `error`, `mouseenter`, `mouseleave`) to capture phase, with `closest()`-style selector matching preserved
- Fixed focus and caret position loss when reordering keyed `each()` rows on engines that drop focus on `insertBefore` (older Safari, happy-dom)
- `mount()` now throws a descriptive error when the root element is null/undefined instead of a generic "Cannot set properties of null"
- `each()` now throws a descriptive error naming the offending index when an item is a primitive (per-item cache requires objects)
- Minimum Node version bumped to 22.12+
- New Starlight-powered docs site at `/kerf/` with inline live examples and runnable complete apps; the reactivity demo moved to `/kerf/demo/`
- New kerf brand identity: production logo, full favicon set (SVG + PNG + ICO + Apple touch icon), and PWA manifest

## [0.3.1] - 2026-05-08

- Removed stale `morphdom` references; the bundled native diff is now the only reconciler

## [0.3.0] - 2026-05-08

- Rebuilt render pipeline with structured segments and a native keyed-list diff, replacing the morphdom dependency
- Added `each()` for keyed list iteration with per-item HTML memoization by object identity
- Renamed the npm package from `kerf` to `kerfjs` (the `kerf` name tripped npm's typo-squatting heuristic); the brand, GitHub repo, and Pages URL are unchanged
- Add `isSafeHtml(value)` type guard for checking JSX values across module copies (works where `instanceof SafeHtml` can't)
- New `npm run test:dist:full` runs the full unit + integration suite against the built `dist/` bundle in CI
- Add behavioral-guarantee tests pinning documented contracts (non-deep-reactivity, `batch()` coalescing, the `mount()` disposer, Tier-3 listener survival)
- Publish the live reactivity demo to GitHub Pages via `.github/workflows/pages.yml`

## [0.2.1] - 2026-05-07

- Add `Fragment` export to the `kerfjs` barrel for explicit JSX fragment usage

## [0.2.0] - 2026-05-07

- Fix focused contenteditable losing focus/caret during morph
- Fix `SafeHtml` identity mismatch across entry points caused by dist bundling
- Fix `clearStoreRegistry` no-op in built output, restoring test isolation

## [0.1.2] - 2026-05-07

- No user-facing changes; release tooling fixes only.

## [0.1.1] - 2026-05-07

- This is just a publication script test

## [0.1.0] - 2026-05-07

### Added

- Initial release.
- `signal`, `computed`, `effect`, `batch` (re-exported from `@preact/signals-core`).
- `defineStore({ initial, actions })` factory + `resetAllStores()` lifecycle hook.
- `mount(el, () => jsx)` — morphdom-driven render with focus / selection / `data-morph-skip` preservation.
- `delegate(el, type, selector, handler)` and `delegateCapture(...)` for Tier 1 / Tier 2 event delegation.
- `toElement(jsx)` — SVG-aware JSX → DOM helper (handles `<svg>` root and orphan SVG fragments).
- JSX runtime at `kerfjs/jsx-runtime` with `SafeHtml`, `raw`, attribute aliases for HTML + SVG.
- Numbered design docs under `docs/`.
- 7-section live demo under `examples/reactivity-demo/`.
