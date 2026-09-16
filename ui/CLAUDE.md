# Working in `@kerfjs/ui`

This file is the decision discipline for building **and** demoing kerf UI. Read it
before any UI work here, alongside the canon:
[`docs/design-philosophy.md`](docs/design-philosophy.md) (why) and
[`docs/component-selection.md`](docs/component-selection.md) (which component). The
two goals everything serves:

1. **An AI can make good, consistent UI decisions with this package** — aesthetics,
   clarity, hierarchy — without a human correcting layout after the fact.
2. **The base looks good and consistent *unstyled*.** A screen built only from the
   primitives, their props, and their tokens should already read well. Reaching for
   custom CSS is the exception, not the rhythm.

## The one rule: don't fight the components

Almost every layout mistake in this package's history was **adding chrome or
spacing the primitive already owns.** Before you write CSS or add a wrapper, stop
and check: is the component/pane/content-item already handling this?

**If you are about to set any of these on or around a kerf component, you are
probably wrong:**

- `padding` / `margin` on a wrapper around a `.kui-content-item`, a pane, a
  `ListItem`, `StateBanner`, `PanelHeader`, etc. — they own their own 8px inset.
  Adding more **double-insets** it (the single most-repeated bug).
- `width` / `height` on a component to make it "the right size" — components size
  to their content and tokens. A forced box leaves a halo or a stretched oval
  (the ListHeader action was forced to 44px around an 18px icon and became an
  oval). Change the icon-size or spacing token instead.
- A **card / border / background / dashed outline / folded corner** to make a demo
  or region "look contained." Hierarchy comes from alignment, spacing, and type
  first; a border must mark a *real* distinction. A component sitting directly on
  the surface is usually correct.
- A **fixed heading row** you hand-built — use `PanelHeader` (a plain Toolbar with
  an xl `ToolbarText` title). Do not restyle a toolbar to make a header.

## Pre-flight checklist (the mistakes to not repeat)

- **No double-inset.** A pane has **no** padding; its `.kui-content` children own
  the 8px margin / 1px border / 8px padding. If a container already pads, the
  content-item inside must not also carry a margin that stacks with it, and
  vice-versa. When two things should line up, check their *content* edges land at
  the same inset (typically 8px, or 17px = 8 margin + 1 border + 8 padding).
- **Trust the defaults.** Render a component at its natural size and color; a
  LucideIcon is 24px by design, not 16px. If it looks wrong at the default, the
  fix is usually the surrounding layout, not an override.
- **One heading primitive.** `PanelHeader` is *the* panel/dialog/page heading.
  There is no separate page-header vs dialog-header. It overrides no Toolbar
  styles; its only bespoke CSS is the icon group's fill/border and the subtitle.
- **Toolbars hold only `ToolbarText` and `ToolbarControlGroup`.** Never a bare
  button, input, link, or loose markup in a zone. A title is `ToolbarText`, not an
  `<h2>`. (Popup menu = a `single` ToolbarControlGroup around a `wa-dropdown`.)
- **Every element earns its place.** Delete chrome, labels, and readouts that do
  not help a person decide or act (a live "device class: xl-desktop" readout aids
  nothing — cut it). Prefer directness over decoration.
- **Match the spacing scale, by relationship not by eye.** 8px inside a group, 24px
  between major differing regions; `--kui-space-*` tokens only. See `docs/layout.md`.
- **Animations move the right way.** A push slides the incoming view in; a pop
  slides the *outgoing* view out — verify direction, don't assume symmetry.

## When custom CSS is legitimate

Custom CSS is for **genuinely new structure the package does not provide** — a
recipe-specific grid, a product arrangement of panes — and even then it may only:

- join classes listed in a component's `publicClasses` (the catalog is the
  authority), never reach in by tag/id/attribute or an unlisted class; and
- override documented `--kui-*` tokens at the narrowest real composition boundary.

It is **not** for spacing (use the scale / content-item), sizing a component (use
its props/tokens), giving something a heading (use `PanelHeader`), laying out a
toolbar (use Toolbar zones + groups), or making a region look contained (use a
`.kui-content-item`, or nothing). If a diff is mostly `padding`/`margin`/`width`/
`height`/`border` on kerf elements, treat it as a smell and re-derive from the
primitives.

## Demos and recipes are the proof

The catalog renders the same exports and CSS consumers get, so a demo that needs
custom chrome to look right is a signal the *component or composition* is wrong —
fix that, don't dress the demo. Single-component demos sit directly on the grid
(no cards); label examples with a `ListHeader` + optional note, left-aligned and
vertically stacked. Recipes compose public primitives and show ownership
boundaries; they are reference compositions, not new styled components.

## Always look at it

Every visual change gets a real-browser QA pass (Playwright) at wide and narrow
widths — not just DOM assertions. Most of the mistakes above are invisible to a
passing test and obvious in a screenshot. Capture before/after when a ticket shows
a target or a defect. See the root `CLAUDE.md` "Visual UI validation".

## Keep the guidance surfaces in sync

Any component/API/behavior change updates, in the same diff: the component +
its CSS, `tests/`, `ai/component-catalog.json` (run `npm run catalog:sync`),
`ai/skill.md` + `llms.txt`, the affected `docs/*.md`, and the repo AI summaries
(`../docs/ai/*`). The `check:catalog` / `check:guidance` / `check:ai-signatures`
gates enforce most of this; run `npm run check` before handing work back.
