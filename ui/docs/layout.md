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
icon and 8px gap, and always ends 8px from the right edge. Most interactive rows
and toolbar groups are 44px tall.
Toolbar groups reserve a real 1px outer border around a 42px inner area, even
when their border and background are transparent.

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
   `MenuHeader` renders its title/badge cluster separately from its optional
   44px action; disclosure mode makes the title cluster itself the button.
   `MenuActionRow` uses a noninteractive row root around sibling 44px primary
   and trailing buttons. `MenuItem.trailing` remains dormant content.
6. Reading width, column placement, and responsive relocation remain application
   decisions. The shared classes define local geometry, not the whole shell.

At narrow widths or 200% zoom, relocate or stack panes before shrinking targets.
The 8/1/8 item contract and 44px controls remain stable, so screenshots and
focus-order tests exercise the same model at every viewport.
