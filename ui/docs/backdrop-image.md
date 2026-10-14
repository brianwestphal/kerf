# BackdropImage

`BackdropImage` opens a scrolling `Pane` or `NavStack` view with a large image,
such as an artist, album, or place page. The image can lag the scroll
(parallax), dissolve through a mask into an app-chosen color, and that color
keeps painting under the content below, so the page reads as one surface.

```tsx
import { BackdropImage } from '@kerfjs/ui/backdrop-image';
import { remify, uiColor } from '@kerfjs/ui/css-values';

<Pane label="Artist">
  <BackdropImage
    src="/art/hero.jpg"
    srcset="/art/hero-800.jpg 800w, /art/hero-1600.jpg 1600w"
    sizes="100vw"
    alt=""
    height={remify(360)}
    parallax="subtle"
    fadeTo={uiColor('surface')}
    scrim="bottom"
    overlay={
      <Toolbar
        label="Artist"
        leading={<ToolbarText text="Night Harbor" size="xl" headingLevel={1} />}
      />
    }
  >
    <ContentItem>Top songs</ContentItem>
  </BackdropImage>
</Pane>;
```

## Props

- `src`, `alt` (required). Pass `alt=""` for a decorative image that only sets a
  mood. `srcset` and `sizes` add responsive candidates to the fitted form.
- `fit` (`cover` by default, `contain`, `fill`) and `position` (`center` by
  default, or `top`, `bottom`, `left`, `right`, and the four corners) choose how
  one image fills the block and which part stays in view.
- `repeat` (`repeat`, `repeat-x`, `repeat-y`) tiles the image as a background at
  its natural size instead. A tiled image with alt text is exposed as
  `role="img"`; `srcset`, `sizes`, and `fit` do not apply.
- `height` is a typed `CssLength` (default 320px). The block grows when the
  overlay content is taller.
- `parallax`: `none` (default) scrolls the image with the content, `subtle`
  lags by 35%, and a number from 0 to 1 is the lag factor.
- `fadeTo` is a typed `CssColor` (`uiColor()`, `colorVar()`, `fillColor()`).
  The image's lower half dissolves into it, and the whole surface, including
  `children` below the image, paints it. Omit it for a hard edge and no
  surface color.
- `blur` (`{ radius?, blurredSrc?, dim? }`) blurs the image progressively as it
  scrolls away (see [Progressive blur](#progressive-blur)).
- `scrim`: `bottom` darkens toward the block end where an overlay title sits,
  `full` dims the image evenly. A scrim is dark in both color schemes, so the
  overlay takes the dark scheme over it: default-tone titles and controls read
  light in both schemes (do not use `ToolbarText tone="dark"` there; that tone
  inverts with the scheme). Under reduced transparency or increased contrast,
  where the overlay sits on a solid `fadeTo` band, it keeps the page's scheme.
  The app keeps overlay text at AA with the image, scrim, and fade it chooses.
- `overlay` is laid over the image's block end; `children` continue below it.
- `underChrome` runs the image up beneath the Pane's block-start inset (an
  overlay or clear header's clearance, NavStack chrome handed to a view's
  Pane, and the top safe area), so artwork fills the screen behind clear
  chrome. The visible image keeps `height` below the chrome, and `overlay`
  content stays clear of it. It reads the Pane's
  `--kui-pane-content-inset-block-start`, so the image must be the first child
  of the Pane's content.

## Layout and ownership

Place it first in the scrolling content. The root bleeds to the Pane's resolved
inline insets (the safe area, `deepInset`) and hands them back to its overlay
and content, so a `ContentItem` or `Toolbar` inside keeps the ordinary text
axis. It adds no padding of its own. Configure it through its props; never
restyle its internals.

## Parallax

The image layer animates only `transform` on a scroll-driven
`animation-timeline`: the image block is a named `view-timeline`, and the layer
runs over its `exit-crossing` range, from the block's top meeting the
scroller's start edge to its bottom passing it. That binds to the nearest
scroll container, which is the Pane's content scroller (or the Pane root while
a `chromePlacement="auto"` pane scrolls as one column), and the range is the
block's own height of scroll wherever it sits. The layer moves by the lag
factor times that distance, so the image moves slower than the content. There
is no scroll listener and no `background-attachment: fixed`, and the compositor
runs the animation.

## Progressive blur

`blur` stacks a blurred copy of the image over the sharp one and fades the
copy in over the first half of the parallax's scroll range, so the image is
fully softened while most of it is still in view, the way a media page's
artwork blurs early in the scroll. The blur itself is set once: either a CSS `filter: blur()` of
`radius` (default 24px) on a copy of `src`, which overhangs the block by its
radius so the blur's transparent fringe falls outside the clip, or an
app-supplied pre-blurred or low-resolution `blurredSrc` (no filter unless
`radius` is also given). Only the copy's `opacity` animates, plus the optional
`dim` layer (a black layer whose opacity ramps to `dim`, from 0 to 1), so no
frame re-rasterizes the image. The copy is decorative (`alt=""`,
`aria-hidden`).

```tsx
<BackdropImage
  src="/art/hero.jpg"
  alt=""
  parallax="subtle"
  blur={{ blurredSrc: '/art/hero-blur-64.jpg', dim: 0.2 }}
  fadeTo={uiColor('surface')}
/>
```

In a Chromium performance trace of 200 scroll frames across the image's exit
range, the effect produced no `Paint` events and no per-frame raster (a
control that repainted the root each frame produced 400 `Paint` events), and
no animation failed to composite.

## Fallbacks

| Condition                                                          | Result                                                                                             |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| No `animation-timeline` support (Firefox at the time of writing)   | Static, sharp image (no parallax, blur, or dim); the fade and color still apply.                   |
| `prefers-reduced-motion: reduce`                                   | Static, sharp image.                                                                               |
| `:root[data-kui-effects="static"]`                                 | Static, sharp image.                                                                               |
| `@media (update: slow)` (e-ink, print)                             | Static, sharp image.                                                                               |
| `prefers-reduced-transparency: reduce` or `prefers-contrast: more` | No dissolve: a hard edge onto solid `fadeTo`, and `overlay` content sits on a solid `fadeTo` band. |
