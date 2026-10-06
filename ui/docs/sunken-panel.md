# SunkenPanel

`SunkenPanel` is a visually lowered application surface with one compact inset
and a vertical content stack. Use it for a main work area or nested panel whose
background should sit behind ordinary content, such as the primary stage in an
issue tracker or component catalog.

```tsx
import { SunkenPanel } from '@kerfjs/ui/sunken-panel';

<SunkenPanel ariaLabel="Release workspace">
  <ReleaseSummary />
  <ReleaseChecks />
</SunkenPanel>;
```

The default `shape="rounded"` uses the shared rounded-rectangle radius. Choose
`shape="square"` for a flush or edge-to-edge area that needs `border-radius: 0`:

```tsx
<SunkenPanel shape="square">
  <Workspace />
</SunkenPanel>
```

## Filling a work area

Set `fill` when the panel is the direct layout root of a parent with a definite
height. Inside a flex column, use `flex` so it takes the remaining space and
can shrink with its parent. Like `Grid`, `flex` accepts `true` (equivalent to
`1 1 auto`), a CSS flex keyword, or a typed `CssFlex` value. The panel keeps
`min-height: 0`, allowing its parent to own scrolling.

```tsx
<List fill>
  <Toolbar label="Work area" />
  <SunkenPanel flex>
    <WorkArea />
  </SunkenPanel>
</List>
```

Inside a `Pane`, the Pane's content remains the scroll owner. Place a
`SunkenPanel fill` in a definite-height Pane content region when the surface
itself needs to cover empty space, or use `flex` when a flex parent allocates
the remaining space. The panel does not add another scroller.

## Ownership

The root owns its lowered background, 8px padding, and 8px vertical gap.
Children own their borders and internal geometry. The application owns child
order, responsive placement, and scrolling; `SunkenPanel` deliberately does not
create another scroll container.

Use `ariaLabel` only when the surface is a distinct region people need to find
by name. With a label, the root receives `role="region"`; without one it remains
a non-landmark grouping.

Set `tabIndex={0}` to include the whole panel in the Tab order, or
`tabIndex={-1}` for a programmatic focus target. Keyboard focus draws the
standard focus ring. `outlined` keeps the same ring visible independently of
focus, for example while the panel is a drop target. Give a focusable work area
an `ariaLabel` when it is a distinct named region.

Do not use `SunkenPanel` merely to add padding, as a substitute for pane
header/content/footer anatomy, or around a child that already owns the same
outer surface.

For a lowered scrolling work area with Pane chrome, use
[`Pane appearance="sunken"`](layout.md#lowered-work-surfaces). It paints the
scroll viewport and empty space without adding a second scroller.

## Public styling boundary

Override the public properties at the composition boundary:

- `--kui-sunken-panel-background`
- `--kui-sunken-panel-foreground`
- `--kui-sunken-panel-padding`
- `--kui-sunken-panel-gap`
- `--kui-sunken-panel-radius`

The default background uses the shared translucent lowered-surface token.
Nested panels composite naturally at every depth: darker in light mode and
lighter in dark mode, without wrappers, depth classes, or per-instance token
assignments. Pane and Web Awesome sunken surfaces use the same palette.
See [Contextual transparency](./webawesome-theme.md#contextual-transparency).
Keep ordinary composition on these defaults; public properties are theming
escape hatches, not a reason to restyle each demo or nesting level.

The public root class is `.kui-sunken-panel`. Prefer the properties above over
styling descendants. The `square` shape deliberately overrides the radius
property with zero; use `rounded` when customizing the radius token.
