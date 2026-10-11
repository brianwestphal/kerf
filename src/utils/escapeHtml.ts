/**
 * HTML / attribute escaping for the JSX runtime. Identical to the helpers
 * used in any reasonable HTML emitter — included here so kerf has no extra
 * runtime dependencies beyond `@preact/signals-core`.
 */

// One scan with no allocation decides whether any replace pass is needed:
// most text and attribute values (ids, classes, SVG path data) carry none of
// these characters, and five full-string passes over each dominated the
// serialization of large static values.
const HTML_SPECIAL = /[&<>"]/;
const ATTR_SPECIAL = /[&"'<>]/;

export function escapeHtml(str: string): string {
  if (!HTML_SPECIAL.test(str)) return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(str: string): string {
  if (!ATTR_SPECIAL.test(str)) return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
