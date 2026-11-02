// Play mode's Fit scale (KF-60BEEJ: play mode core; docs/26-ui-editor.md
// §11.1, §11.3). The stage scales the played view's frame down until it fits,
// never up. The scale is a transform on the frame's wrapper, so the frame's
// own layout size, and with it every viewport query inside it, stays the
// device's.

/** A width and height in CSS pixels. */
export interface PlaySize {
  readonly width: number;
  readonly height: number;
}

/**
 * The scale that fits `frame` inside `available`: at most 1, and never below
 * 0 (a stage with no room yet). A frame not laid out yet stays at 1.
 */
export function fitScale(available: PlaySize, frame: PlaySize): number {
  if (frame.width <= 0 || frame.height <= 0) return 1;
  return Math.max(
    0,
    Math.min(1, available.width / frame.width, available.height / frame.height),
  );
}

/** The box `frame` takes up at `scale`, which the stage reserves for it. */
export const scaledBox = (frame: PlaySize, scale: number): PlaySize => ({
  width: frame.width * scale,
  height: frame.height * scale,
});
