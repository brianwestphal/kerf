/**
 * The disclosure glyphs Kerf's popups share (a PopupMenu's trigger caret and
 * submenu chevron, a Select's caret): a rounded stroke chevron drawn edge to
 * edge in its box, so a 0.875em box gives the weight of a text-size caret.
 * Decorative: the control's own name and state carry the meaning.
 */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2.25',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const;

/** A downward chevron: the closed-popup caret, turned to face an open popup. */
export function PopupCaretGlyph() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2 4.75 7 9.75 12 4.75" {...STROKE} />
    </svg>
  );
}

/** A chevron toward the inline end: an item that opens a submenu. */
export function PopupSubmenuGlyph() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M4.75 2 9.75 7 4.75 12" {...STROKE} />
    </svg>
  );
}
