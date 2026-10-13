/**
 * The block edges at which a scroll owner clears chrome that lies over it.
 *
 * Overlaying chrome publishes how far it covers a region's edge through the
 * inherited `--kui-scroll-clearance-block-start` / `--kui-scroll-clearance-block-end`
 * context (a `DialogSurface` floating footer publishes `block-end`). A scroll
 * owner that opts in adds that clearance to its own block padding and
 * `scroll-padding`, so its content scrolls visibly beneath the chrome while its
 * first and last items, and anything focused or scrolled into view, can still
 * come to rest clear of it.
 */
export type ScrollClearance = 'block-start' | 'block-end' | 'both';
