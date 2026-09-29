# Working in `@kerfjs/ui`

This file is the decision discipline for building **and** demoing kerf UI. Read it
before any UI work here, alongside the canon:
[`docs/design-philosophy.md`](docs/design-philosophy.md) (why) and
[`docs/component-selection.md`](docs/component-selection.md) (which component). The
two goals everything serves:

1. **An AI can make good, consistent UI decisions with this package** — aesthetics,
   clarity, hierarchy — without a human correcting layout after the fact.
2. **The base looks good and consistent _unstyled_.** A screen built only from the
   primitives, their props, and their tokens should already read well. Reaching for
   custom CSS is the exception, not the rhythm.

## The one rule: don't fight the components

Almost every layout mistake in this package's history was **adding chrome or
spacing the primitive already owns.** Before you write CSS or add a wrapper, stop
and check: is the component/pane/content-item already handling this?

**If you are about to set any of these on or around a kerf component, you are
probably wrong:**

- `padding` / `margin` on a wrapper around a `.kui-content-item`, a pane, a
  `ListItem`, `StateBanner`, `Toolbar`, etc. — they own their own 8px inset.
  Adding more **double-insets** it (the single most-repeated bug).
- `width` / `height` on a component to make it "the right size" — components size
  to their content and tokens. A forced box leaves a halo or a stretched oval
  (the ListHeader action was forced to 44px around an 18px icon and became an
  oval). Change the icon-size or spacing token instead.
- A **card / border / background / dashed outline / folded corner** to make a demo
  or region "look contained." Hierarchy comes from alignment, spacing, and type
  first; a border must mark a _real_ distinction. A component sitting directly on
  the surface is usually correct.
- A **fixed heading row** with custom geometry — compose a plain `Toolbar` with a
  direct `ToolbarText` title (xl, or the default size in a narrow rail — see
  "One heading composition") and grouped controls. Do not restyle the toolbar.

## Always dogfood the components

**Build every kerf UI surface from `@kerfjs/ui` components whenever one fits —
including the package's own catalog and shell components (`Catalog`,
`CatalogSidebar`, `CatalogExample`, …), the demos, and the recipes.** Use
`Text` rather than a raw `<p>`/`<span>` for copy, `Workbench`/`Pane` for app
shells, `Toolbar` + `ToolbarText` for headings, and `List`/`ListItem`/
`ListHeader` for navigation and grouped content, instead of hand-rolled markup
with its own CSS.

The order of preference is **Kerf UI component, then Web Awesome component,
then raw HTML tag** — using each naturally for what it is good at. Never
render a `Discouraged` Web Awesome element (`wa-dropdown`, `wa-button-group`,
`wa-select`, `wa-tab-group`, `wa-icon`, …) directly, in a demo, recipe, or the
catalog shell; reach it only through the Kerf component that wraps or replaces
it (`PopupMenu`, `SegmentedControl`, `Select`, `TabBar`, `LucideIcon`). When a
Web Awesome component needs Kerf's look, prefer a theme override that reaches
parity; wrap it as a Kerf component only when Kerf must own its spacing or
behavior contract (`Select`, `PopupMenu`). Catalog-only helpers are fine when
they are clearly not part of the public component set; nominate any that
deserve promotion to real components rather than promoting them yourself.

When you touch such code, evaluate every CSS rule and every raw tag: is this
customization genuinely important, or is it re-implementing (or quietly
diverging from) something a component already does? Delete the unnecessary
ones. Demos have no CSS files at all — only individual components do, and a
component's CSS never styles another component; when a demo seems to need
styling, flag it as the component gap it is. If a component lacks a capability
the surface really needs, improve the component rather than working around it.
Never invent behavior nobody asked for (the catalog once grew an unrequested
two-column phone layout). **Ask when you are unsure whether a customization
matters, and ask rather than guess when a design brief is ambiguous.**

## Pre-flight checklist (the mistakes to not repeat)

- **No double-inset.** A pane has **no** padding; its `.kui-content` children own
  the 8px margin / 1px border / 8px padding. If a container already pads, the
  content-item inside must not also carry a margin that stacks with it, and
  vice-versa. When two things should line up, check their _content_ edges land at
  the same inset (typically 8px, or 17px = 8 margin + 1 border + 8 padding).
- **Trust the defaults.** Render a component at its natural size and color; a
  LucideIcon is 24px by design, not 16px. If it looks wrong at the default, the
  fix is usually the surrounding layout, not an override.
- **One heading composition.** Panel/dialog/page headings are plain `Toolbar`
  compositions: a direct xl `ToolbarText`, optional grouped icon, and grouped
  trailing controls. Set `headingLevel` for page/section landmarks. Supporting
  copy is app-owned content below the toolbar.
- **Size the title to its track.** xl is for a page, view, dialog, or pane
  that holds it at its narrowest size. A narrow peripheral rail or drawer — a
  navigator, inspector, or console beside a work area that already carries the
  xl title, especially one whose header also holds its own close control —
  takes the **default** size: xl truncates there ("Inspector" becomes "Ins…"
  in a 160px Workbench rail), and the quiet default reads as pane identity
  instead of competing with the work-area title. The collapsible-sidebar
  recipe's rail and the Workbench catalog's rails do this. Never ship a
  truncated title to satisfy the size rule; check the panel at its minimum
  size.
- **Toolbars hold only `ToolbarText` and `ToolbarControlGroup`.** Never a bare
  button, input, link, or loose markup in a zone. A title is `ToolbarText`, not an
  `<h2>`. (Popup menu = a `PopupMenu` in a `single` ToolbarControlGroup with `nestedDropdown`.)
- **Nothing wraps inside a `ToolbarControlGroup`.** An icon sits beside its
  label on one row; a group's controls never break onto a second line, and no
  trigger gets a fixed width — the group sizes to its content and the toolbar's
  `responsive` policy relocates whole groups. A `ToolbarText` is one ellipsized
  line unless `wrap`/`maxLines` is set deliberately; a wrapped title keeps the
  trailing groups beside its first line, in the toolbar's top 44px band.
- **Dividers earn their place.** Toolbars draw no divider by default; the line
  between pinned chrome and scrolling content is scroll state
  (`wireScrollDividers`, a `Pane`'s `chromeDividers`). Use `dividerSides` only
  for a permanent separator edge, and never fake a divider with a border or pad
  below one to make it look right.
- **Controls sit near their effect.** A collapsed drawer's restore goes in the
  bottom toolbar or a `FloatingToolbar` beside the drawer, not a distant top
  toolbar; a panel's toggle is the last control of its last group, and exactly
  one control owns each collapse/expand action.
- **Align text to text, icons to icons.** A border is decoration, never the
  alignment anchor: a bordered surface extends to the pane gutter instead of
  being indented to line its border up with a heading's text, and bare prose
  goes on the shared text column via `ListInsetText`.
- **Select and PopupMenu are one popup.** They share the caret, rows, check
  column, and group titles from one contract; a `Select` in a group uses
  `focusRingOwner="group"`, and a trigger drops its ring while its popup is
  open. Never restyle one to match the other or add ring CSS.
- **Every element earns its place.** Delete chrome, labels, and readouts that do
  not help a person decide or act (a live "device class: xl-desktop" readout aids
  nothing — cut it). Prefer directness over decoration.
- **Match the spacing scale, by relationship not by eye.** 8px inside a group, 24px
  between major differing regions; `--kui-space-*` tokens only. See `docs/layout.md`.
- **Animations move the right way.** A push slides the incoming view in; a pop
  slides the _outgoing_ view out — verify direction, don't assume symmetry.

## When custom CSS is legitimate

Custom CSS is for **genuinely new structure the package does not provide** — a
recipe-specific grid, a product arrangement of panes — and even then it styles
only that new structure:

- it never selects a kerf component (no `.kui-*` class, `[data-component]`, a
  `wa-*` element a kerf component renders, or its `::part()`s) — configure
  those through their props, and treat a missing prop as a component gap
  (ticket it) rather than overriding; and
- it sets `--kui-*` theme tokens only for theming (color ramps, the spacing
  scale), never to resize, re-inset, or re-frame a component that has a prop
  for it.

It is **not** for spacing (use the scale / content-item), sizing a component (use
its props/tokens), giving something a heading (use the standard Toolbar +
ToolbarText composition), laying out a
toolbar (use Toolbar zones + groups), or making a region look contained (use a
`ContentItem`, or nothing). If a diff is mostly `padding`/`margin`/`width`/
`height`/`border` on kerf elements, treat it as a smell and re-derive from the
primitives.

## Components never style other components

Inside the package, a child styles itself in a parent's context from its own
stylesheet (`.kui-parent[…] > .kui-child …` lives in `child.css`). A parent may
key its own styles on a child's state (`:has(> .kui-select[open])`) and style
raw native or raw Web Awesome children, excluding kerf children by class
(`wa-dropdown:not(.kui-popup-menu)`). Name kerf components by class, never by
a `wa-*` tag they render; write only your own `--_kui-<self>-*` variables and
name the context you provide after yourself; never put a hook class on a
composed child's root to restyle it. `npm run check:css-ownership` enforces
all of this (see `docs/component-contract.md`); fix a finding rather than
adding an exception to `scripts/lib/css-ownership.mjs`. The same rule is the
guidance for applications and component packages built on kerf ui
(`ai/skill.md`, `docs/design-philosophy.md`): components own their styles and
are configured, never overridden.

## Demos and recipes are the proof

The catalog renders the same exports and CSS consumers get, so a demo that needs
custom chrome to look right is a signal the _component or composition_ is wrong —
fix that, don't dress the demo. Single-component demos sit directly on the grid
(no cards); label examples with a `ListHeader` + optional note, left-aligned and
vertically stacked. Recipes compose public primitives and show ownership
boundaries; they are reference compositions, not new styled components.

A demo is a specimen of the rules, so it also: demonstrates the component
_working_ — interactive elements respond when clicked, not a static sketch of
the concept; renders every default at its real value (a `LucideIcon` at 24px);
gives every trigger an icon and/or text (never a bare caret pill); places
toggles and restore controls only where the guidance recommends; resets any
page-altering state (a toggled floating toolbar) when the viewer leaves it;
composes `LucideIcon`s and native buttons directly instead of through demo
helper indirection that saves nothing; and is not duplicated by a second demo
of the same thing — make one the direct demonstration or drop it.

## Always look at it

Every visual change gets a real-browser QA pass (Playwright) at wide and narrow
widths — not just DOM assertions. Most of the mistakes above are invisible to a
passing test and obvious in a screenshot. Capture before/after when a ticket shows
a target or a defect. Toolbar and trigger geometry differs across engines
(Safari clips what Chrome fits), so check Firefox and WebKit too when a change
touches it. See the root `CLAUDE.md` "Visual UI validation".

## Keep the guidance surfaces in sync

Any component/API/behavior change updates, in the same diff: the component +
its CSS, `tests/`, `ai/component-catalog.json` (run `npm run catalog:sync`),
`ai/skill.md` + `llms.txt`, the affected `docs/*.md`, the component's SVG
design templates (`npm run check:design-templates`), and the repo AI summaries
(`../docs/ai/*`). The `check:catalog` / `check:guidance` / `check:ai-signatures`
gates enforce most of this; run `npm run check` before handing work back.
