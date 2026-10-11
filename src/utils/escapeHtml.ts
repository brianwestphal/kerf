/**
 * HTML / attribute escaping for the JSX runtime. Identical to the helpers
 * used in any reasonable HTML emitter — included here so kerf has no extra
 * runtime dependencies beyond `@preact/signals-core`.
 */

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// One pass over the string, appending the unescaped runs between matches.
// A value with nothing to escape (most ids, classes, SVG path data) comes back
// as the same string with no allocation; one that needs escaping is about 2x
// faster than a chain of one `replace` pass per character.
function escapeWith(str: string, special: RegExp): string {
  special.lastIndex = 0;
  let out = '';
  let last = 0;
  let match;
  while ((match = special.exec(str))) {
    out += str.slice(last, match.index) + ENTITIES[match[0]];
    last = special.lastIndex;
  }
  return last ? out + str.slice(last) : str;
}

const HTML_SPECIAL = /[&<>"]/g;
const ATTR_SPECIAL = /[&"'<>]/g;

export function escapeHtml(str: string): string {
  return escapeWith(str, HTML_SPECIAL);
}

export function escapeAttr(str: string): string {
  return escapeWith(str, ATTR_SPECIAL);
}
