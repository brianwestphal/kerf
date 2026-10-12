/**
 * The sunken-surface noise texture: a seeded 100×100 Gaussian grain tile,
 * drawn once per document at runtime and layered over the lowered surface by
 * `--kui-sunken-surface` (foundation.css). Nothing ships as an asset.
 */

/** The private property the generated tile is stored in on `<html>`. */
export const SUNKEN_TEXTURE_PROPERTY = '--_kui-sunken-texture-generated';

/** Tile edge in pixels; foundation.css repeats it at the same CSS size. */
const TILE = 100;
/** Strongest grain opacity: the reviewed "Gaussian 4%" treatment. */
const MAX_OPACITY = 0.04;
const SEED = 7;

/** A small deterministic PRNG (mulberry32), so every page draws the same tile. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The tile's RGBA pixels: monochrome grains, darker below and lighter above
 * the surface, with Gaussian strength clipped at 2.5σ.
 */
export function sunkenTexturePixels(): Uint8ClampedArray {
  const next = random(SEED);
  const pixels = new Uint8ClampedArray(TILE * TILE * 4);
  for (let index = 0; index < TILE * TILE; index += 1) {
    // Box-Muller; the first uniform is kept off zero for the logarithm.
    const u = 1 - next();
    const v = next();
    const gaussian = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    const strength = Math.max(-1, Math.min(1, gaussian / 2.5));
    const channel = strength < 0 ? 0 : 255;
    const offset = index * 4;
    pixels[offset] = channel;
    pixels[offset + 1] = channel;
    pixels[offset + 2] = channel;
    pixels[offset + 3] = Math.round(Math.abs(strength) * MAX_OPACITY * 255);
  }
  return pixels;
}

/** Draw the tile and return it as a PNG data URL, or undefined without a 2D canvas. */
export function sunkenTextureDataUrl(
  doc: Document = globalThis.document,
): string | undefined {
  const canvas = doc?.createElement('canvas');
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return undefined;
  canvas.width = TILE;
  canvas.height = TILE;
  const image = context.createImageData(TILE, TILE);
  image.data.set(sunkenTexturePixels());
  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Generate the sunken texture once for a document. Sunken surfaces call this
 * as they render; it is idempotent, and on a server (no document) or without
 * a 2D canvas it does nothing, leaving the flat lowered surface.
 */
export function ensureSunkenTexture(
  doc: Document | undefined = globalThis.document,
): void {
  const root = doc?.documentElement;
  if (!root || root.style.getPropertyValue(SUNKEN_TEXTURE_PROPERTY)) return;
  const url = sunkenTextureDataUrl(doc);
  if (url) root.style.setProperty(SUNKEN_TEXTURE_PROPERTY, `url("${url}")`);
}
