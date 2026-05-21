/**
 * `attrSelector(attrs)` — build a CSS attribute-selector string from an
 * object map of attribute name → value pairs.
 *
 *   attrSelector({ 'data-action': 'add-todo' })
 *   // → '[data-action="add-todo"]'
 *
 *   attrSelector({ 'data-action': 'toggle', 'data-id': '42' })
 *   // → '[data-action="toggle"][data-id="42"]'
 *
 * The result is safe to pass directly to `delegate(root, type, selector, fn)`.
 * Both the attribute name and value are escaped so injection via unusual
 * characters (whitespace, CSS metacharacters, non-ASCII) can't produce a
 * syntactically invalid or misinterpreted selector.
 *
 * Escaping:
 * - Attribute name: escaped as a CSS identifier via `cssEscapeIdent`, which is
 *   an SSR-safe (no `CSS.escape`) adaptation of the Mathias Bynens polyfill
 *   (https://github.com/nicktindall/cyclon.p2p-common, MIT licensed). Handles
 *   control chars, leading digits, non-ASCII, and CSS metacharacters.
 * - Attribute value: embedded in double quotes as a CSS string. Backslashes and
 *   double-quote characters are backslash-escaped; control characters are
 *   hex-escaped per CSS Syntax Level 3 §3.4.
 *
 * Throws on an empty attribute name (not a valid CSS identifier).
 */

/**
 * Escape `value` as a CSS identifier (for attribute names, id fragments, etc.).
 * Adapted from the CSS.escape polyfill by Mathias Bynens (MIT).
 */
function cssEscapeIdent(value: string): string {
  if (value === '') {
    throw new Error('attrSelector: attribute name must not be empty');
  }
  const str = String(value);
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const cp = str.charCodeAt(i);
    const ch = str.charAt(i);

    // U+0000 NULL → replacement character
    if (cp === 0x0000) {
      result += '�';
      continue;
    }
    // Control characters and DEL: hex-escape
    if ((cp >= 0x0001 && cp <= 0x001F) || cp === 0x007F) {
      result += '\\' + cp.toString(16) + ' ';
      continue;
    }
    // Leading digit: hex-escape to avoid "-NN" / "3px"-style ambiguity
    if (i === 0 && cp >= 0x0030 && cp <= 0x0039) {
      result += '\\' + cp.toString(16) + ' ';
      continue;
    }
    // Second char is a digit when first is '-' (e.g. "-3foo"): hex-escape digit
    if (
      i === 1 &&
      cp >= 0x0030 && cp <= 0x0039 &&
      str.charCodeAt(0) === 0x002D
    ) {
      result += '\\' + cp.toString(16) + ' ';
      continue;
    }
    // Non-ASCII, safe identifier chars (letters, digits, underscore, hyphen)
    if (
      cp >= 0x0080 ||
      cp === 0x002D ||              // `-`
      cp === 0x005F ||              // `_`
      (cp >= 0x0030 && cp <= 0x0039) || // 0-9
      (cp >= 0x0041 && cp <= 0x005A) || // A-Z
      (cp >= 0x0061 && cp <= 0x007A)    // a-z
    ) {
      result += ch;
      continue;
    }
    // Everything else: backslash-escape
    result += '\\' + ch;
  }
  return result;
}

/**
 * Escape `value` as a CSS double-quoted string (for attribute values in
 * `[attr="value"]` selectors).
 */
function escapeCSSString(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    const cp = value.charCodeAt(i);
    const ch = value.charAt(i);
    if (cp === 0x0000) {
      result += '�';
    } else if ((cp >= 0x0001 && cp <= 0x001F) || cp === 0x007F) {
      // Control chars: hex-escape
      result += '\\' + cp.toString(16) + ' ';
    } else if (cp === 0x005C) {
      // Backslash
      result += '\\\\';
    } else if (cp === 0x0022) {
      // Double quote (the string delimiter we use)
      result += '\\"';
    } else {
      result += ch;
    }
  }
  return result;
}

/**
 * Build a CSS attribute-selector string from an object whose keys are
 * attribute names and whose values are the expected attribute values.
 *
 * ```ts
 * attrSelector({ 'data-action': 'add-todo' })
 * // → '[data-action="add-todo"]'
 *
 * delegate(root, 'click', attrSelector({ 'data-action': 'toggle', 'data-id': itemId }), handler);
 * ```
 *
 * Both names and values are escaped, so this function is safe for any
 * string value — including external input with CSS metacharacters.
 */
export function attrSelector(attrs: Record<string, string>): string {
  let result = '';
  for (const [name, value] of Object.entries(attrs)) {
    result += `[${cssEscapeIdent(name)}="${escapeCSSString(value)}"]`;
  }
  return result;
}
