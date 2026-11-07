/**
 * The morph-protection triple, encoded once.
 *
 * Three attributes make a live element "managed outside the template":
 * `data-morph-skip` and `data-morph-skip-children` mark a library-owned
 * subtree, and `data-morph-preserve` marks a node imperatively injected after
 * render that the template never emits. Both the full morph's positional
 * pairing (`morph.ts`, steps 2 and 2.5) and the change-scoped morph's
 * same-shape check (`static-subtree-morph.ts`) require the triple to be EQUAL
 * on both sides before pairing two unkeyed elements — so a template element
 * carrying no such claim never adopts a protected live node, and a protected
 * live node pairs only with a template that declares the same protection.
 *
 * KF-HYAA4T: the two callers had each grown their own string encoding of the
 * same three bits. One bitmask here keeps them in agreement, and an integer is
 * cheaper than a string on the morph's per-child hot path.
 */

/** The attribute that exempts an unmatched live node from the morph's removal pass. */
export const MORPH_PRESERVE_ATTR = 'data-morph-preserve';

/**
 * Bitmask of the protection attributes `el` carries — `0` for an unprotected
 * element. Only ever compared for equality.
 */
export function protectionOf(el: Element): number {
  const d = (el as HTMLElement).dataset;
  return (
    (d.morphSkip !== undefined ? 1 : 0) |
    (d.morphSkipChildren !== undefined ? 2 : 0) |
    (d.morphPreserve !== undefined ? 4 : 0)
  );
}
