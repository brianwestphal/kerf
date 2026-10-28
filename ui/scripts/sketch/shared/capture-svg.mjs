/**
 * Lucide draws dots as zero-length round-capped strokes. The capture
 * serializes them as degenerate `M x yz` paths, which browsers paint as dots
 * but Sketch's SVG import drops. A 0.01px horizontal segment renders the same
 * round-capped dot and survives import.
 */
export function restoreDotPaths(svg) {
  return svg.replace(/<path\b[^>]*>/g, (tag) =>
    /stroke-linecap="round"/.test(tag)
      ? tag.replace(
          /\sd="M(-?[\d.]+)[ ,](-?[\d.]+)z"/,
          (match, x, y) => ` d="M${x} ${y}h.01"`,
        )
      : tag,
  );
}
