---
sourceRevision: 4ed4515fb372cf4dc45325452fa4347bdaa080b0
sourcePaths:
  - ai/skill.md
  - docs/component-selection.md
  - docs/layout.md
  - docs/accessibility.md
purpose: Frozen pre-recipe evaluation context; do not synchronize with live docs.
---

# Kerf UI guidance before production recipes

Start from the interface need. Search the Kerf catalog and supported Web
Awesome set; reuse a primitive when its purpose, anatomy, state, and interaction
match; compose primitives through public props, classes, and tokens; keep
product copy, state, routing, permissions, persistence, and transport in a thin
application adapter. Build custom markup only for a genuinely different
semantic contract, and propose a reusable upstream component or recipe when
that contract recurs.

Use `Toolbar` for persistent application chrome, `PageHeader` for a page title,
and `DialogHeader` for a modal task. Use `MenuHeader` and `MenuItem` for a
sectioned navigation sidebar. Use `TabBar` for tabpanels, `SegmentedControl` for
a few visible exclusive choices, and `Select` for a longer value list. Use
`StateBanner` for persistent inline status, `EmptyState` for absent content,
and `LoadingSpinner` for compact indeterminate activity. Use
`ResizableRegion` only for a user-operable controlled separator. Use
`TokenSearchField` only when free text and ordered filter tokens form one
editor.

Import components from their explicit `@kerfjs/ui/<component>` subpaths.
Retain the disposers returned by `wireResizableRegions`, `wireTabBars`, and
delegated action wiring. Import `@kerfjs/ui/select/register` once when using
`Select`. Web Awesome catalog coverage means supported and themed, not
preferred: use the Kerf application primitives above when their contract fits.

For navigation, put one `.kui-sidebar` gutter around `.kui-sidebar-section`,
`MenuHeader`, and `MenuItem`; use `.kui-sidebar-surface` for inset blocks. Do not
stack wrapper padding, compensate with negative margins, or fork component
markup and private descendant CSS.

For application spacing, import `@kerfjs/ui/layout.css`, put `.kui-layout` on
the composition root, and assign exactly one semantic owner to each page,
pane, surface, section, control, metadata, dialog, and scroll boundary. Keep
toolbar/header chrome outside body insets. Allow controls to wrap or relocate
at narrow widths rather than shrinking hit targets. Do not create competing
scroll containers or one-off spacing systems.

Decorative icons are hidden, controls are named, focus remains visible, state
does not rely on color alone, and reduced motion and increased contrast remain
usable.
