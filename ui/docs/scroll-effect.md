# ScrollEffect

`ScrollEffect` ties compositor-only effects on any content to that content's
own scroll position: a block that fades and scales in as it scrolls into view,
fades out as it leaves, lags the scroll, or dims as it scrolls away. There is
no scroll listener. Each effect animates only `transform` or `opacity` on a CSS
view timeline that the compositor runs, and Kerf owns the static fallbacks.

```tsx
import { ScrollEffect } from '@kerfjs/ui/scroll-effect';

<Pane label="Story">
  <ScrollEffect
    effects={[
      { kind: 'reveal', range: 'entry', rangeEnd: 60 },
      { kind: 'scale', from: 0.96 },
      { kind: 'fade', range: 'exit' },
    ]}
  >
    <ContentItem>Chapter one</ContentItem>
  </ScrollEffect>
</Pane>;
```

## Props

- `effects` (required): a list of presets. A kind may repeat; repeats stack like any other effects.
- `children`: the content the effects apply to.
- `rootAttributes`: application `data-*` metadata on the root, such as an
  editor node marker. The component's own markers stay protected.

### Presets

| Preset     | Options                                         | Default range | What moves                                                               |
| ---------- | ----------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| `parallax` | `lag`: a number from 0 to 1, or `subtle` (0.35) | `exit`        | The content lags the scroll by `lag`. The wrapper clips it.              |
| `reveal`   | none                                            | `entry`       | Opacity from 0 to 1.                                                     |
| `fade`     | none                                            | `exit`        | Opacity from 1 to 0.                                                     |
| `scale`    | `from`, `to`: above 0 and at most 2 (0.96, 1)   | `entry`       | Scale around the center. The wrapper clips a scale above 1.              |
| `dim`      | `to`: 0 to 1 (0.5)                              | `exit`        | A black, `aria-hidden` layer over the content, from transparent to `to`. |

Every preset also takes `range` (`entry`, `exit`, `cover`, or `contain`, the
CSS named view-timeline ranges) and `rangeStart` / `rangeEnd` percentages
within it (0 and 100 by default; the start must be below the end). An
out-of-range number throws a `RangeError`; an unknown kind or range throws a
`TypeError`.

`parallax` moves the content by `lag` times its own height across the range.
Over `exit` that is exactly the lag factor of the scroll, the way
`BackdropImage` lags: the content rests in place as it starts to leave and
slides down as it scrolls out. Over `entry` it settles into place as it
arrives, and over `cover` or `contain` it passes its resting place halfway.

### Composition

Effects nest in array order, the first outermost. Transforms stack and
opacities multiply, so `reveal` on `entry` with `fade` on `exit` fades the
content in and out again. `dim` is an overlay above all of them.

## Layout and ownership

`ScrollEffect` is a block box with no margin, border, or padding, so its
content keeps its own geometry: wrap a `ContentItem` or `List` directly, and do
not add spacing around it. It needs a vertically scrolling ancestor, such as a
Pane's content. The wrapper is the timeline subject and never moves; its inner
layers do, so the effect follows the content's resting position. Configure it
through its props; never restyle its internals.

## The shared scroll-effect layer

`ScrollEffect` and `BackdropImage` run on one shared layer, the stylesheet
`@kerfjs/ui/scroll-effect.css` (the `backdrop-image.css` entry imports it):

- an element marked `data-kui-scroll-timeline` is a named block-axis view
  timeline;
- an element marked `data-kui-scroll-effect` animates one keyframe family
  (`translate`, `scale`, or `opacity`) over a range of the nearest such
  timeline, configured by inline custom properties;
- the static fallbacks below are written once, so every effect gets them.

Each component marks only elements it renders itself. `BackdropImage`'s
parallax is a `translate` layer over its hero's `exit-crossing` range, and its
progressive blur and dim are `opacity` layers over the first half of that
range. The markers and their custom properties are package internals, not an
application API: use `ScrollEffect`.

## Blur-in is BackdropImage's

There is no `blur-in` preset. A blur that only animates opacity needs a
statically blurred second copy to cross-fade, and a copy of arbitrary content
duplicates its interactive controls, ids, and accessible names. The other way,
an animated `filter` or `backdrop-filter`, runs a blur every frame instead of
compositing a finished layer. `BackdropImage`'s `blur` has a real second copy,
the decorative image, so the progressive blur stays there.

## Off-screen work

`ScrollEffect` does not gate its animations with an `IntersectionObserver`.
That was measured for the effects this layer drives: it changed
neither the layer count nor frame times compared with `content-visibility:
auto`, and it added a one-to-two-frame pop after a scroll jump. For dense
image feeds, `BackdropImage`'s `deferOffscreen` (and
`ContentItem.media.deferOffscreen`) applies `content-visibility: auto` to the
image hero instead (opt-in, because a large scroll jump paints the newly
visible heroes blank for a frame; see [layout](layout.md)). `ScrollEffect`
offers no off-screen skipping of its own.

## Fallbacks

| Condition                                                                                    | Result                                                |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| No `animation-timeline` support (Firefox at the time of writing)                             | Static: content in place, fully opaque, and undimmed. |
| `prefers-reduced-motion: reduce`                                                             | Static.                                               |
| `:root[data-kui-effects="static"]`                                                           | Static.                                               |
| `@media (update: slow)` (e-ink, print)                                                       | Static.                                               |
| `prefers-reduced-transparency: reduce`, `prefers-contrast: more`, or `forced-colors: active` | Static.                                               |

Because every fallback shows the content at rest, never put information only
in a revealed or scaled state.

## Performance

Only `transform` and `opacity` animate, on a scroll-driven timeline the
compositor runs; no filter animates and nothing re-rasterizes per frame. A
Chromium trace of 200 scroll frames across a `BackdropImage`'s exit range on
this layer produced no `Paint` events (see
[BackdropImage](backdrop-image.md#progressive-blur)).
