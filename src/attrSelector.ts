/**
 * `attr(name, value)` — create a pre-computed attribute descriptor (static form).
 * `attr(name)` — create a per-render factory for dynamic attribute values (dynamic form).
 *
 * **Static form** — best for fixed action names, filter keys, role values, etc.
 * Escapes once at module-load time; produces a full {@link AttrSpec} with
 * `.name`, `.value`, `.selector`, and `.attrs`.
 *
 *   const ACTIONS = {
 *     toggle: attr('data-action', 'toggle'),
 *     remove: attr('data-action', 'remove'),
 *   } as const satisfies Record<string, AttrSpec<'data-action'>>;
 *
 *   // In JSX — spread .attrs (rename-safe; no hardcoded attribute name):
 *   <button {...ACTIONS.toggle.attrs}>Toggle</button>
 *
 *   // In delegate — use the pre-computed selector:
 *   delegate(root, 'click', ACTIONS.toggle.selector, handler);
 *
 * **Dynamic form** — best for per-row data like `data-id`, where the value
 * changes per item but the attribute name is constant.
 * The name is validated and pre-escaped at definition time; calling the
 * returned factory is cheap (just escape the value and freeze the object).
 *
 *   const ITEM = { id: attr('data-id') } as const;
 *
 *   // In JSX — call the factory inline:
 *   <li {...ITEM.id(String(item.id))}>…</li>
 *
 * For ad-hoc compound selectors, concatenate `.selector` strings:
 *
 *   delegate(root, 'click',
 *     ACTIONS.toggle.selector + attr('data-id', id).selector,
 *     handler);
 *
 * Escaping:
 * - Attribute name: escaped as a CSS identifier via `cssEscapeIdent`, which is
 *   an SSR-safe (no `CSS.escape`) adaptation of the Mathias Bynens polyfill
 *   (https://github.com/mathiasbynens/CSS.escape, MIT licensed — see the
 *   Acknowledgements section of LICENSE). Handles
 *   control chars, leading digits, non-ASCII, and CSS metacharacters.
 * - Attribute value: embedded in double quotes as a CSS string. Backslashes and
 *   double-quote characters are backslash-escaped; control characters are
 *   hex-escaped per CSS Syntax Level 3 §3.4.
 *
 * Throws on an empty attribute name (not a valid CSS identifier).
 */

/** Descriptor created by the static {@link attr} overload. */
export interface AttrSpec<N extends string = string, V extends string = string> {
  /** The raw attribute name passed to `attr()`. */
  readonly name: N;
  /** The raw attribute value passed to `attr()`. */
  readonly value: V;
  /** Pre-computed `[name="value"]` CSS selector string, safe to pass to `delegate()`. */
  readonly selector: string;
  /** Spreadable JSX object — `{ [name]: value }` — keeps the attribute name out of JSX literals. */
  readonly attrs: { readonly [K in N]: V };
}

/**
 * Escape `value` as a CSS identifier (for attribute names, id fragments, etc.).
 * Adapted from the CSS.escape polyfill by Mathias Bynens (MIT).
 */
function cssEscapeIdent(value: string): string {
  if (value === '') {
    throw new Error('attr: attribute name must not be empty');
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
 * Static overload — pre-computes the full descriptor at definition time.
 * Returns an {@link AttrSpec} with `.name`, `.value`, `.selector`, and `.attrs`.
 */
export function attr<N extends string, V extends string>(name: N, value: V): AttrSpec<N, V>;

/**
 * Dynamic overload — pre-validates and pre-escapes the attribute name, returns a
 * factory that accepts a per-render value and produces a frozen spreadable object.
 * Use for per-row attributes like `data-id` where the value changes per item.
 * The optional `V` generic constrains which values the factory accepts:
 * `attr<'data-id', 'a'|'b'>('data-id')` → `(value: 'a'|'b') => { 'data-id': 'a'|'b' }`.
 * Leaving both generics off infers `N` from the argument and defaults `V` to `string`.
 */
export function attr<N extends string, V extends string = string>(name: N): (value: V) => { readonly [K in N]: V };

export function attr<N extends string, V extends string>(
  name: N,
  value?: V,
): AttrSpec<N, V> | ((value: string) => { readonly [K in N]: string }) {
  const escapedName = cssEscapeIdent(name); // validates + pre-escapes name in both paths
  if (value !== undefined) {
    const selector = `[${escapedName}="${escapeCSSString(value)}"]`;
    return Object.freeze({
      name,
      value,
      selector,
      attrs: Object.freeze({ [name]: value }) as { readonly [K in N]: V },
    }) as AttrSpec<N, V>;
  }
  return (v: string): { readonly [K in N]: string } =>
    Object.freeze({ [name]: v }) as { readonly [K in N]: string };
}
