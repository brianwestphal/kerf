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

## Ownership

The root owns its lowered background, 8px padding, and 8px vertical gap.
Children own their borders and internal geometry. The application owns child
order, responsive placement, and scrolling; `SunkenPanel` deliberately does not
create another scroll container.

Use `ariaLabel` only when the surface is a distinct region people need to find
by name. With a label, the root receives `role="region"`; without one it remains
a non-landmark grouping.

Do not use `SunkenPanel` merely to add padding, as a substitute for pane
header/content/footer anatomy, or around a child that already owns the same
outer surface.

## Public styling boundary

Override the public properties at the composition boundary:

- `--kui-sunken-panel-background`
- `--kui-sunken-panel-foreground`
- `--kui-sunken-panel-padding`
- `--kui-sunken-panel-gap`
- `--kui-sunken-panel-radius`

The public root class is `.kui-sunken-panel`. Prefer the properties above over
styling descendants. The `square` shape deliberately overrides the radius
property with zero; use `rounded` when customizing the radius token.
