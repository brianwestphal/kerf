# Device class

`@kerfjs/ui/device-class` reports the current viewport as a reactive **device
class** — a size bucket × orientation × viewport-segment count — so a layout can
pick its presentation from one signal instead of hand-wiring `matchMedia`. It is
the foundation the app/dialog layouts build on (see
[`../../docs/23-app-layouts.md`](../../docs/23-app-layouts.md)).

```ts
import { deviceClass } from "@kerfjs/ui/device-class";

const device = deviceClass(); // ReadonlySignal<DeviceClass>

effect(() => {
  if (device.value.compact) showStack();
  else showSplit();
});
```

## `DeviceClass`

| Field                           | Meaning                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| `size`                          | `xs-mobile` \| `mobile` \| `tablet` \| `desktop` \| `xl-desktop`           |
| `orientation`                   | `portrait` \| `landscape`                                                  |
| `segments` / `verticalSegments` | viewport segment counts (foldables / dual-screen); `1` on ordinary devices |
| `handset`                       | `xs-mobile` or `mobile`                                                    |
| `compact`                       | "one pane at a time" — a handset or a portrait tablet                      |
| `atLeast(size)`                 | true when the current size is `size` or larger                             |

Reading `device.value` inside an `effect`/`computed` re-runs when the viewport
crosses a breakpoint, rotates, or changes its segment count. One shared viewport
source backs every reader.

## Breakpoints

Default minimum widths (px): `mobile` 360, `tablet` 720, `desktop` 1024,
`xl-desktop` 1440. Override per reader:

```ts
const device = deviceClass({ breakpoints: { tablet: 900 } });
```

The same numbers are mirrored as CSS custom properties in the foundation
(`--kui-bp-mobile`, `--kui-bp-tablet`, `--kui-bp-desktop`, `--kui-bp-xl-desktop`)
so CSS media queries and the JS signal read one source. `classifyViewport(width,
orientation, segments?, verticalSegments?, breakpoints?)` is exported as the
pure, DOM-free bucketing core.

## Server rendering

Without a DOM, `deviceClass()` resolves to an SSR default (1024×768, landscape,
one segment) and hydrates to the real class on the client. Override the assumed
viewport with `deviceClass({ ssr: { width, height } })`.
