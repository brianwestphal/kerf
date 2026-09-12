# Kerf UI consumer audit — September 13, 2026

The documentation site is the first migration priority. It imports Kerf UI,
but still substitutes navigation buttons for links, repurposes menu rows as
toolbar controls, and implements its own modal and spacing behavior. Hot Sheet
2 has broader adoption and also retains five local primitive copies across 53
static JSX render sites. The main need is completing integration contracts and
migrating consumers; this audit does not justify a monolithic application shell.

Provenance: KF-R4WHC7 (consumer duplication and extraction investigation).
Kerf source revision `e42e293ba1fcdccd38ae37469cc76971c5dbe455`;
Hot Sheet 2 revision `699efbd5b1dfc0680a84ed4c7bbf1d06be726a56`.
The checkouts also contained unrelated workflow/settings changes, excluded from
this audit. Paths below are relative to their named repository. This is a source,
CSS, test, documentation, and catalog review; browser failures are not claimed
where only source evidence establishes a concern. Implementation belongs to
the linked follow-ups, including corresponding visual verification.

## Classification and ownership

Each row has one primary classification: **reuse** (already provided but missed),
**adapter** (correctly local), **recipe** (shared composition/style guidance),
**gap** (missing generic contract), or **duplicate** (migrate copied behavior).
P1 means correctness/accessibility or widespread adoption; P2 means bounded
cleanup or lower-frequency adoption. Retain means no extraction is recommended.

Package primitives own semantic markup, controlled state projection, accessible
anatomy, public tokens and optional interaction helpers. Recipes own topology,
mount/wire/dispose examples and responsive destinations. Product adapters own
copy, IDs, routes, parsing, permissions, transport, persistence and domain state.
Ordinary native controls, prose typography and brand artwork remain legitimate.
Web Awesome is already supported; a missing first-party export alone is not a
reason to build its equivalent again.

## Site first

| Candidate | Classification / priority | Evidence in Kerf | Disposition |
| --- | --- | --- | --- |
| Sidebar iconless rows | recipe / P1 | `site/src/scripts/site-view.tsx:40`; `ui/src/sidebar.css`; `site/tests/site.spec.ts:128` explicitly requires a reserved column over 30px | KF-BK330Y (unused sidebar icon column): add meaningful Lucide icons or a deliberate iconless column configuration. Preserve header/row alignment. Change the test to assert the chosen usable layout. |
| Toolbar commands and search width | reuse / P1 | `site-view.tsx:78`; `site/src/styles/site.css:137`; `site/src/styles/kerf-site.css:175` | KF-T16RMJ (toolbar groups and flexible search): compose ToolbarControlGroup with named ordinary buttons; give search the remaining width and retain access when narrow. MenuItem is a navigation action row, not an icon-button API. |
| Route and TOC rows | gap / P1 | `site-view.tsx:40,51`; `ui/src/menu-item.tsx:21` always renders a button; `site/src/scripts/site.tsx:54` routes clicks | KF-4RSNZ2 (real navigation-link contract): retain href, no-JS access, modifier/new-tab behavior and aria-current through a supported row composition. TOC anchors should preserve fragment semantics. |
| Search result rows | gap / P1 | `site/src/scripts/search.tsx:92` copies menu anatomy onto anchors with listbox/option roles | Same KF-4RSNZ2: keep a list of navigable results or implement the complete intended widget. Existing search test checks that an option appears, not selection/keyboard semantics. |
| Search modal | duplicate / P1 | `search.tsx:115,141`; `<dialog open>` is toggled without `showModal`; `kerf-site.css:46` owns full-screen scrim | KF-1QCVW3 (shared site overlay lifecycle): use native/kerfjs overlay ownership for containment, background inertness, dismissal and restoration. Pagefind and query state stay local. |
| Mobile navigation drawer | duplicate / P1 | `site.tsx:58–69,88`; `site.css` below 63.99rem | Same KF-1QCVW3: preserve focus and expanded state across open→Escape, open→navigate, resize, and search-over-drawer. Current Escape path does not reset aria-expanded. Source does not establish a complete focus trap. |
| Search field and query execution | adapter / retain | `search.tsx:57,130`; `ui/docs/component-selection.md` structured-search row | This is plain text search. A native search input is appropriate; TokenSearchField is for ordered editable filter tokens. Keep Pagefind lazy loading, stale-response sequence checks and excerpts local. Group/size it under KF-T16RMJ; no token-editor migration. |
| Loading, error, empty search | reuse / retain | `search.tsx:78–90` uses EmptyState/StateBanner/LoadingSpinner | Preserve these adapters. Add error/empty/retry and focus transitions when KF-1QCVW3 changes the containing surface. |
| Common action icons and CTA styling | duplicate / P2 | `site-view.tsx:19–29,58`; `site/src/styles/app-showcase.css:13–62` has another CTA treatment | KF-FK59GJ (shared controls/icons): use LucideIcon for common icons and a consistent native/WA button-link recipe. Keep href semantics and brand art; avoid importing an entire icon or registration barrel. |
| Page, surface, dialog, control spacing | reuse / P1 | `site.css:141` and card/pagination rules; `kerf-site.css:99,131,235`; no layout roles on site composition | KF-EYY70M (site layout/CSS contract): use semantic layout owners at real boundaries. Keep reading width, article typography and brand composition local; do not mechanically replace every number, icon size or media dimension. |
| Stylesheet delivery | duplicate / P1 | `site/src/styles/site.css:2` imports `../../../ui/src/sidebar.css`; `site/package.json` declares published UI | Same KF-EYY70M: consume the public package CSS subpath and verify a package-only build. Root imports plus styles.css are valid for SSR when the whole layer is wanted; they are not inherently a tree-shaking bug. |
| Anatomy customization | recipe / P1 | PageHeader `h1` selectors in `site.css`; StateBanner copy `span` selectors in `kerf-site.css`; `ui/ai/component-catalog.json` publicClasses | KF-EYY70M plus KF-Y2GJ0W (CSS guidance/scoring alignment). Toolbar slots, MenuItem label and StateBanner copy are explicitly public classes. Do not call all descendants private. Prefer existing variants/tokens; private element structure needs a documented hook or removal. |
| Showcase view choice and values | adapter / retain | `site/src/scripts/showcase.tsx:31–51` uses SegmentedControl/StateBanner/ValueTable | Good component selection. Keep mode/copy local; spacing and unsupported inner-element overrides belong to KF-EYY70M. |
| Article cards, pagination, markdown tables | adapter / retain | `site/scripts/lib/site-content.mjs`; `site.css`; `kerf-compare.css`; `responsive-tables.css` | Semantic links and reading/publishing layout are application compositions. Reuse surface/gap tokens; do not force editable table or tab components into static prose. |
| SPA fetch/morph, generated content and search index | adapter / retain | `site.tsx`; `site/scripts/render-site.tsx`; `site/scripts/lib/site-content.mjs` | URL policy, metadata, static HTML and Pagefind are site responsibilities, outside UI. Root page-lifetime listeners are not automatically a per-route leak. Preserve explicit disposal in hydrated widgets. |
| Stale hero size claim | adapter defect / P2 | `site-view.tsx:58`; `site/src/content/docs/index.md` advertises ~11 KB | KF-TJCMJG (rendered bundle-size claim drift): verify current measured size and include the SSR hero in the claim gate. Incidental finding, no benchmark comparison changes in this audit. |

Site test coverage inspected: `site/tests/site-content.unit.test.mjs` covers
content parsing/rendering; `site/tests/site.spec.ts` covers direct routes, SPA
navigation, three viewport profiles, search, showcase and basic examples.
It does not establish modal trapping/restoration, no-JS sidebar navigation,
modifier-click links, search error transitions or retained narrow command access.
Those assertions are required in the corresponding implementation tickets.

## Hot Sheet 2

Reviewed all 76 production component TSX modules and inventoried their JSX
sites, excluding `main.tsx`, tests and demos from counts. The five local wrappers
account for MenuItem 20 sites/14 files, MenuHeader 14/9, Select 13/9, AppTab 3/2,
ResizableRegion 3/1: **53 render sites**. These are static source sites, not
runtime instance counts. Existing shared usage includes Toolbar 10 sites,
ToolbarControlGroup 27, DialogHeader 4, ValueTable 4, and one each PageHeader,
StateBanner and EmptyState. No SegmentedControl, TabBar or TokenSearchField JSX
sites occur in that production component inventory. Thirteen WA dialog render
sites are existing primitive reuse.

Paths in this table are in `hotsheet2/clients/web/src/` unless stated otherwise.

| Candidate | Classification / priority | Evidence | Disposition |
| --- | --- | --- | --- |
| MenuItem/MenuHeader wrappers | gap then duplicate / P1 | `components/menu-item.tsx:26`; `menu-header.tsx:8` | KF-7CH4AV (typed root/trigger extension hooks), then KF-SQVNYZ (UI adoption). Keep domain data attributes and action/popover relationships without copying anatomy. A role=menuitem override alone must not masquerade as a complete menu. |
| Interactive trailing row actions | gap / P1 | `components/repository-status-popover.tsx:73,97` puts focusable role=button content inside MenuItem | KF-BBH774 (sibling primary/trailing action composition): independent controls require a noninteractive row container, not nested interactive descendants. |
| Controlled view mode buttons | duplicate / P1 | `components/workspace-header.tsx:40,87`; `workspace-header.css:5–10` | KF-SQVNYZ: SegmentedControl owns the few exclusive modes and selected treatment; icon/count labels and notification policy remain local. |
| Inspector section selection | recipe / P1 | `components/ticket-inspector.tsx:103` four named sections with conditionally rendered content | KF-SQVNYZ: decide semantics before migration. Use TabBar if exposing tabpanels; a compact view selector may use SegmentedControl only with its pressed-choice contract. Do not infer equivalence from pill styling or the variable name. |
| Tokenized search, saved-view query editor | duplicate / P1 | `components/workspace-header.tsx:103`; `saved-view-dialog.tsx:26`; `inline-search.ts` | KF-SQVNYZ: use TokenSearchField/readTokenSearchField/placeTokenSearchCaret. Keep operators, dates, parser, suggestions and saved queries local; preserve IME, paste, token order and caret on reset. |
| Select compatibility wrapper | adapter pending migration / P1 | `components/select.tsx:10,21`; Kerf `ui/src/select.tsx:30–37` | KF-SQVNYZ: verify the published version includes the keyed slotted-icon fix before deleting its compatibility seam. Current shared source also preserves mixed grouped/ungrouped choices; local source does not. Add that regression when migrating. |
| Project and terminal tabs | gap then duplicate / P1 | `components/app-tab.tsx:18`; `project-tab-bar.tsx:17`; `main.tsx:1024` | KF-0QM0NR (icon/lifecycle extension boundary), then KF-SQVNYZ: use AppTab/TabBar/wireTabBars, retaining domain IDs, close/reorder policy and terminal state. Replace every-tab tabindex=0 with the intended roving focus contract. |
| Split pane rendering and arithmetic | gap then duplicate / P1 | `components/resizable-region.tsx:22–33`; `app-region-resize.ts`; `app-shell.tsx` | Same KF-0QM0NR/KF-SQVNYZ: shared render/helper contracts; preserve saved sizes, min/max, collapse thresholds and terminal fitting locally. Verify disposal, keyboard resize and narrow relocation. |
| Toolbar/header/value primitives | reuse / retain | `components/workspace-header.tsx`; `ticket-inspector.tsx`; dialog components | Keep successful subpath imports. Adapt policy around the shared controls; do not introduce a second runtime or blanket registration. |
| Empty and connection-state wrappers | adapter / retain | `components/ticket-empty-state.tsx:17`; `connection-state-banner.tsx:24` | Models for correct thin adapters: domain mapping and copy into EmptyState/StateBanner. |
| Other persistent/empty feedback | duplicate / P2 | `components/app-error.tsx:5`; `ticket-inspector.tsx:99–100`; `repository-status-popover.tsx:62–70,96`; `ticket-inspector-placeholder.tsx:11` | KF-SQVNYZ: use StateBanner/EmptyState where semantics fit; inline validation can remain small native feedback. Keep linked duplicate-target content as an action, not forced into a string-only detail prop. |
| Quick composer and stacked reader overlay | recipe / P1 | `components/quick-ticket-composer.tsx:41`; `ticket-reader.tsx:14`; `main.tsx:863,1406` | KF-E2AXTV (overlay lifecycle verification): source concern requiring browser reproduction, not a claimed observed failure. Keep drafts/reader stack local; share or explicitly verify modal ownership. |
| WA dialogs/native popovers | adapter / retain | 13 WA dialog JSX sites; `components/dialog-layout.css`; `connection-details-dialog.tsx` | Preserve proven modal/top-layer ownership. Compose DialogHeader and body roles. Do not wholesale replace native popovers with WA nonmodal dialog-backed popovers; existing KF-SQVNYZ notes already explain this boundary. |
| Custom inspector/shell layout and responsive hiding | recipe / P1 | `components/app-shell.css`; `workspace-header.css:35–38`; `ticket-inspector-panel.css` | KF-ZFG6Z5 (responsive command access) plus KF-SQVNYZ layout work: inventory public hooks, remove dependence on private element shape, relocate commands before hiding, one inset/scroll owner per pane. |
| StatusBadge / BlockedBadge | adapter with style reuse / P2 | `components/status-badge.tsx:19–42`; `status-badge.css`; Kerf catalog wa-badge | Retain status-to-label/icon/color policy. KF-SQVNYZ should compare noninteractive filled badges with themed wa-badge; plain/interactive status controls have different contracts. No new generic Badge is accepted merely because Kerf lacks a named first-party export. |
| Tag chips | adapter / retain | `components/tag-chip.tsx:36–52` wraps WA tags | Correct use of supported wa-tag; parsing/removal/domain naming stay local. Atomic query tokens belong to TokenSearchField instead. |
| Ticket row/list/board and inspector content | adapter / retain | `components/ticket-row.tsx`, `ticket-list.tsx`, `ticket-board-column.tsx`, `ticket-info-panel.tsx` | Keep ticket lifecycle, bulk selection, blocked/duplicate relationships, provider capabilities and board policy out of the package. Reuse internal feedback/controls through KF-SQVNYZ. |
| Composer, Markdown, notes, attachments, AI and terminals | adapter / retain | `components/quick-ticket-composer.tsx`, `markdown-editor.tsx`, `note-card.tsx`, `ticket-attachments.tsx`, `ai-conversation.tsx`, terminal components | Keep editing, autosave, transport, permissions, uploads, annotation and terminal lifetime local. Recipe composition/overlay ownership does not justify extracting product workflows. |

Preserve and extend HS2 unit coverage in components `menu-item`,
`workspace-header`, `ticket-inspector`, `ticket-metadata-controls`,
`app-shell-components`, `dialog-layout`, plus `dialog-lifecycle`,
`app-region-resize` and `inline-search`. Existing browser suites
`tests/{advanced-search,saved-views,ticket-reader-stack,drawer-tab-order,terminal-drawer,ticket-content-overflow,ux-demo,providers}.spec.ts`
are the consumer acceptance surfaces. The adoption ticket now has the explicit
candidate list above; a passing source-string lifecycle check is insufficient
evidence for focus behavior.

## Catalog, recipes and other maintained consumers

| Candidate | Classification / priority | Evidence in Kerf | Disposition |
| --- | --- | --- | --- |
| Recipe mount/wire/dispose boundary | recipe / P1 | `ui/ux-demo/main.tsx:523,645,653`; `ui/docs/recipes.md`; controller-only unit tests | Existing KF-4SNNHC (copyable wiring): published TSX/CSS copying must include the host integration needed to work outside the catalog. |
| Hidden shell panes | recipe / P1 | `ui/ux-demo/recipes/recipes.css:49,62`; `app-shell.tsx:29`; `ui/tests/browser/recipes.spec.ts:51` | KF-83R1P6 (responsive pane reachability): the current test asserts hiding, not access. Provide alternate navigation/inspector destinations. |
| Tab IDs after deletion | adapter defect / P2 | `ui/ux-demo/main.tsx:583` | KF-CMD39V (unique tab IDs): add→close an original→add repeats new-8. Test identity through selection/reorder/close. |
| Focused AppTab specimen keyboard handler | duplicate / P2 | `ui/ux-demo/main.tsx:273,712`; `ui/docs/component-selection.md` AppTab row | KF-ZYD1VH (shared TabBar wiring): retain a focused sample while consuming the public interaction owner. |
| Responsive multiline menu styling | reuse / P2 | `ui/ux-demo/style.css:243`; `ui/src/menu-item.tsx` multiline prop | KF-Y2GJ0W: prefer the supported prop where equivalent; the label hook is public, so this is not categorically a private-selector defect. |
| Toolbar slot relocation | recipe / retain | `ui/ux-demo/recipes/recipes.css:53–58`; catalog Toolbar publicClasses/appOwns | Supported customization of public slots. Keep topology responsive and controls reachable. |
| Stage geometry and ecosystem specimens | adapter / retain | `ui/docs/ux-demo.md:15`; `ui/ux-demo/webawesome-demos.tsx`; `ui/tests/browser/ux-demo.spec.ts` | Preview dimensions/checkerboards/display controls are intentional teaching apparatus. WA routes demonstrate supported alternatives; presence is not a recommendation to replace preferred Kerf primitives. |
| Missing-concept adapter guidance | recipe / P1 | `ui/ai-regressions/results/2026-09-12/findings.md` | Existing KF-HNCMKD (thin adapter layout) and KF-Y2GJ0W: clarify layout/public CSS rules without demanding nonexistent components. |
| Nine basic and eleven complete examples | adapter / retain | `site/scripts/build-examples.mjs:26,40`; `site/src/examples`; `tests/browser/example-apps.spec.ts` | Core API teaching consumers have no UI imports. Preserve isolated signals/events/list/JSX lessons; a dashboard-looking example alone does not establish a shared UI contract to extract. |
| Reactivity demo | adapter / retain | `examples/reactivity-demo/package.json`; `src/main.tsx`; site build-examples script | Intentional core-only interactive lesson. Keep specimen-specific controls and labels. |
| Component scaffold | adapter / retain | `create-kerf-component/template/src/counter.tsx`; template manifest and scaffold typing tests | Teaches pure rendering and explicit wiring, not application UI. No UI dependency required. |
| Benchmark and dist fixtures | adapter / retain | `bench/kerfjs-impl/src/main.tsx`; `tests/dist/consumer-app`, `tests/dist/example-apps` | Benchmark DOM comparability and targeted runtime/typing verification determine their shape; exclude cosmetic UI migrations. |

## Implementation order and evidence limits

1. Repair site toolbar/sidebar through existing KF-T16RMJ/KF-BK330Y; resolve
   link and overlay semantics through KF-4RSNZ2/KF-1QCVW3. Fold related control
   styling into KF-FK59GJ and spacing/delivery into KF-EYY70M.
2. Align public CSS guidance/scoring through KF-Y2GJ0W, make recipes copyable
   through KF-4SNNHC, and retain hidden functionality through KF-83R1P6.
3. Complete row/header/tab/resize extension contracts (KF-7CH4AV, KF-BBH774,
   KF-0QM0NR), then execute the enumerated HS2 adoption work under KF-SQVNYZ.
   Verify overlay and responsive concerns in KF-E2AXTV/KF-ZFG6Z5.
4. Fix catalog adapter issues KF-CMD39V/KF-ZYD1VH and incidental site claim
   drift KF-TJCMJG. KF-HNCMKD continues the missing-concept guidance work.

No implementation gap above is left only in this document. This source audit
does not establish a measured improvement in generated UI, visual correctness,
or equivalence between model identities. The separately requested Astra rerun
of KF-F3NGSB records fresh model outputs against the frozen regression corpus.
