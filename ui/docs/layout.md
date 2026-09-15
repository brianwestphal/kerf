# Pane and content layout

Import `@kerfjs/ui/layout.css` for the shared geometry used by sidebars, main
areas, inspectors, and dialogs. The vocabulary deliberately describes structure
rather than location: the same pane can be placed anywhere.

## Anatomy

```tsx
<aside class="kui-pane">
  <div class="kui-pane__toolbar"><Toolbar label="Workspace" ... /></div>
  <div class="kui-pane__content kui-content">
    <section>...</section>
    <section>...</section>
  </div>
  <footer class="kui-pane__footer"><Toolbar label="Actions" ... /></footer>
</aside>
```

`.kui-pane` has no padding. It reserves rows for an optional toolbar, one
scrolling content area, and an optional footer. A main area or dialog often
omits the footer; a navigation pane commonly uses all three. Fixed chrome stays
outside `.kui-pane__content`, which is the pane's scroll owner.

`.kui-content` is a vertical stack with a 24px gap between major children.
Sections may contain adjacent `MenuItem` rows without adding another major gap.
Ordinary surface-like children use `.kui-content-item` and own their complete
geometry:

- 8px inline margin from the pane edge
- 1px border, transparent by default
- 8px internal padding and 8px internal gap
- `calc(1px + remify(11px))`, or 12px, rounded corners

Use `.kui-content-item--pill` for the 22px pill radius expressed as
`calc(1px + remify(21px))`. Consumers can make a content item visible without
changing its geometry by setting `--kui-content-item-border` and
`--kui-content-item-background`.

A visible parent surface does not make every child another visible card. The
composer recipe keeps its form as the single surface and uses three transparent
content items for the introduction, fields, and footer. A conditional
`StateBanner` remains visibly distinct because it communicates semantic status.

## Public roles and tokens

| Need | Class | Token / default |
| --- | --- | --- |
| Unpadded toolbar/content/footer structure | `.kui-pane` | — |
| Scrolling pane content | `.kui-pane__content` | — |
| Major vertical rhythm | `.kui-content` | `--kui-layout-content-gap: 24px` |
| Self-contained child geometry | `.kui-content-item` | 8px margin + 1px border + 8px padding |
| Pill child | `.kui-content-item--pill` | `--kui-layout-pill-radius: 22px` |
| Related controls | `.kui-control-cluster` | `--kui-layout-control-gap: 8px` |
| Inline metadata | `.kui-inline-metadata` | `--kui-layout-metadata-gap: 4px` |
| Explicit scroll owner outside a pane | `.kui-scroll-owner` | `overflow: auto` |

The component layer applies the same contract to `Toolbar`, `MenuHeader`,
`MenuItem`, `PageHeader`, `DialogHeader`, `StateBanner`, `ValueTable`,
`ValueTableRow`, tabs, and form controls. A value-table row separator starts at
the row's 8px content inset, or at 40px when the row contains its 24px leading
icon and 8px gap, and always ends 8px from the right edge. Each value-table row
also keeps 8px of root-scaled block padding independently of its semantic inline
inset. Most interactive rows and toolbar groups are 44px tall.
Toolbar groups reserve a real 1px outer border around a 42px inner area, even
when their border and background are transparent.
`PageHeader` keeps its title on the shared inset while its action border aligns
with the logical edge of the following `.kui-content-item` border.
`DialogHeader` applies the same rule internally: its icon/title identity is a
borderless group in a top toolbar, its direct action children are wrapped in a
contained group, and its optional subtitle is a separate row aligned below the
title. The icon visual is 24px inside a 34px circular background.

## Ownership rules

1. Do not pad a sidebar, main area, dialog, or `.kui-pane` shell. Children own
   their own margin, border, background, padding, and radius.
2. Use 24px gaps for major vertical separation and 8px gaps inside an item or
   between toolbar groups. Do not confuse the two relationships.
3. Wrap toolbar content in `ToolbarControlGroup`, including dormant text. A
   transparent group still reserves the same 44px geometry as a visible group.
4. Keep one scrolling content owner per pane. Toolbar and footer siblings stay
   fixed while the content scrolls.
5. A split item keeps dormant and interactive regions separate. For example,
   `MenuHeader` renders its title/count-or-badge cluster separately from its optional
   logical-end 44px action. The header fills the available inline width and its
   action glyph defaults to 18px; disclosure mode makes the title cluster itself
   the button and supplies the production `DisclosureArrow` unless `actionIcon`
   replaces it.
   `MenuActionRow` uses a noninteractive row root around sibling 44px primary
   and trailing buttons. `MenuItem.trailing` remains dormant content.
   In multiline `MenuItem` and `MenuActionRow` rows, the leading icon stays
   centered on the label's first line rather than the full wrapped label.
6. Reading width, column placement, and responsive relocation remain application
   decisions. The shared classes define local geometry, not the whole shell.

At narrow widths or 200% zoom, relocate or stack panes before shrinking targets.
The 8/1/8 item contract and 44px controls remain stable, so screenshots and
focus-order tests exercise the same model at every viewport.
