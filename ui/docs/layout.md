# Pane and content layout

Import `Pane` from `@kerfjs/ui/pane`. Browser-aware bundlers receive its CSS
automatically; other consumers can import `@kerfjs/ui/pane.css`. Import
`@kerfjs/ui/layout.css` as well when using the related content-item and control
layout classes. The vocabulary deliberately describes structure rather than
location: the same pane can be placed anywhere.

## Anatomy

```tsx
<Pane
  element="aside"
  label="Workspace"
  contentElement="nav"
  contentLabel="Workspace pages"
  separators={["inline-end"]}
  header={<Toolbar label="Workspace" ... />}
  footer={<Toolbar label="Actions" ... />}
>
    <section>...</section>
    <section>...</section>
</Pane>
```

`Pane` has no padding. It reserves rows for an optional vertical header, one
scrolling vertical content area, and an optional footer. A header may contain a
top toolbar followed by secondary toolbar or status rows. A main area or dialog
often omits the footer; a navigation pane commonly uses all three. Fixed chrome
stays outside `.kui-pane__content`, which is the pane's only scroll owner.

Pass any combination of logical sides to `separators`: `block-start`,
`block-end`, `inline-start`, and `inline-end`. Every line is off by default and
each enabled side uses `--kui-pane-separator-width` (1px) and
`--kui-pane-separator-color` (`--kui-color-border`). Logical sides keep pane
boundaries correct in both left-to-right and right-to-left layouts.

`.kui-content` is a vertical stack with a 24px gap between major children.
Sections may contain adjacent `ListItem` rows without adding another major gap.
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

Nested rounded edges stay concentric by subtracting their full inset from the
outer radius. For example, `SegmentedControl` places each item behind a 1px
control border and 1px control padding, so its default rounded-rectangle radius
is 10px inside the control's 12px radius.

A visible parent surface does not make every child another visible card. The
composer recipe keeps its form as the single surface, uses a heading `Toolbar` for
its task hierarchy, and places field and action control edges on the shared 8px
inline gutter instead of nesting them inside another padded content item. A
conditional `StateBanner` remains visibly distinct because it communicates
semantic status.

## Public roles and tokens

| Need                                     | Class                     | Token / default                       |
| ---------------------------------------- | ------------------------- | ------------------------------------- |
| Unpadded header/content/footer structure | `Pane`, `.kui-pane`       | —                                     |
| Scrolling pane content                   | `.kui-pane__content`      | —                                     |
| Optional logical-edge separators         | `Pane.separators`         | `--kui-pane-separator-width: 1px`     |
| Major vertical rhythm                    | `.kui-content`            | `--kui-layout-content-gap: 24px`      |
| Self-contained child geometry            | `.kui-content-item`       | 8px margin + 1px border + 8px padding |
| Pill child                               | `.kui-content-item--pill` | `--kui-layout-pill-radius: 22px`      |
| Related controls                         | `.kui-control-cluster`    | `--kui-layout-control-gap: 8px`       |
| Inline metadata                          | `.kui-inline-metadata`    | `--kui-layout-metadata-gap: 4px`      |
| Explicit scroll owner outside a pane     | `.kui-scroll-owner`       | `overflow: auto`                      |

The component layer applies the same contract to `Toolbar`, `ListHeader`,
`ListItem`, `Toolbar`, `StateBanner`, `ValueTable`,
`ValueTableRow`, tabs, and form controls. A value-table row separator starts at
the row's 8px content inset, or at 40px when the row contains its 24px leading
icon and 8px gap, and always ends 8px from the right edge. Each value-table row
also keeps 8px of root-scaled block padding independently of its semantic inline
inset. Most interactive rows and toolbar groups are 44px tall.
Toolbar groups reserve a real 1px outer border around a 42px inner area, even
when their border and background are transparent.
Panel, dialog, and page headings are plain `Toolbar` compositions. The leading
zone holds an optional icon `ToolbarControlGroup` and a direct extra-large
`ToolbarText`; actions belong in a trailing group. Omit empty groups. Supporting
copy is app-owned content below the toolbar and aligns with the intended content
edge.

## Spacing scale

Spacing is not a free choice. The official scale is five canonical steps, each
expressing exactly one relationship — pick the step by **how connected two
elements are**, not by eye. Every scalable value is `remify`-authored against the
fixed 16px baseline, so it delivers as `rem`.

| Value | Token              | Relationship — when to use                                                                                                               |
| ----- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0px   | `--kui-space-none` | No separation. The elements read as a single unit (a control and its own affordance, adjacent `ListItem` rows).                          |
| 4px   | `--kui-space-2xs`  | Very minor. Still one connected cluster, but readability or aesthetics demand a hair of air (inline metadata, an icon beside its label). |
| 8px   | `--kui-space-xs`   | Standard. Between elements **within a group** — the content-item padding/gutter, gaps between toolbar controls in a group.               |
| 16px  | `--kui-space-m`    | Minor. Between **homogeneous groups** — two lists, two sibling sections of the same kind.                                                |
| 24px  | `--kui-space-l`    | Major. Between **heterogeneous groups** — the `.kui-content` rhythm between major, differing regions.                                    |

The two relationships that get confused most are 8px vs 24px: 8px is _inside_ a
group, 24px is _between_ major, differing regions. 16px sits between them for
same-kind groups.

`--kui-space-s` (12px) and `--kui-space-xl` (32px) exist but are **off the
canonical rhythm** — reach for them only as a deliberate exception, never as a
default step. Prefer the five canonical tokens so spacing stays legible and
consistent across every surface.

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
   `ListHeader` renders its title/count-or-badge cluster separately from its optional
   logical-end 44px action. The header fills the available inline width and its
   action glyph defaults to 18px; disclosure mode makes the title cluster itself
   the button and supplies the production `DisclosureArrow` unless `actionIcon`
   replaces it.
   `ListActionRow` uses a noninteractive row root around sibling 44px primary
   and trailing buttons. `ListItem.trailing` remains dormant content.
   In multiline `ListItem` and `ListActionRow` rows, the leading icon stays
   centered on the label's first line rather than the full wrapped label.
6. Reading width, column placement, and responsive relocation remain application
   decisions. The shared classes define local geometry, not the whole shell.
7. A visible collapsible pane owns its collapse control in that pane's toolbar.
   When the pane is hidden, move the restore control into the adjacent main
   toolbar on the same logical edge: an inline-start pane restores from the
   main toolbar's leading group, and an inline-end pane restores from its
   trailing group. Do not leave an otherwise empty icon-only rail behind.

At narrow widths or 200% zoom, relocate or stack panes before shrinking targets.
The 8/1/8 item contract and 44px controls remain stable, so screenshots and
focus-order tests exercise the same model at every viewport.
