// The `$css` value grammar of @kerfjs/ui/view: a builder call from
// `@kerfjs/ui/css-values` with literal arguments only, parsed to a tree the
// interpreter evaluates and the generator emits verbatim.

// Every builder `@kerfjs/ui/css-values` exports; a css-value prop without a
// catalog `cssValue` restriction accepts any of them.
export const CSS_HELPERS = [
  'calc',
  'colorVar',
  'em',
  'fillColor',
  'flex',
  'foregroundColor',
  'foregroundColorVar',
  'lengthVar',
  'pct',
  'plus',
  'px',
  'rem',
  'remify',
  'space',
  'uiColor',
];

/**
 * Parses a `$css` builder call with literal arguments only: numbers, quoted
 * strings without quotes or backslashes inside, and nested builder calls.
 * Generated code emits the call verbatim and the interpreter evaluates the
 * tree, so anything else (an identifier, an operator, a template) is rejected
 * rather than trusted. Returns `{ name, args }` (each argument a number,
 * string, or nested call), or undefined when it does not parse.
 */
export function parseCssTree(source) {
  if (typeof source !== 'string') return undefined;
  const text = source.trim();
  let index = 0;
  const space = () => {
    while (text[index] === ' ') index += 1;
  };
  const call = () => {
    const name = /^[A-Za-z]+/.exec(text.slice(index))?.[0];
    if (!name || text[index + name.length] !== '(') return undefined;
    const node = { name, args: [] };
    index += name.length + 1;
    space();
    if (text[index] === ')') {
      index += 1;
      return node;
    }
    for (;;) {
      space();
      const value = argument();
      if (value === undefined) return undefined;
      node.args.push(value);
      space();
      if (text[index] === ',') index += 1;
      else if (text[index] === ')') {
        index += 1;
        return node;
      } else return undefined;
    }
  };
  const argument = () => {
    const rest = text.slice(index);
    const number = /^-?\d+(?:\.\d+)?/.exec(rest)?.[0];
    if (number) {
      index += number.length;
      return Number(number);
    }
    const quoted =
      /^'[^'\\\n]*'/.exec(rest)?.[0] ?? /^"[^"\\\n]*"/.exec(rest)?.[0];
    if (quoted) {
      index += quoted.length;
      return quoted.slice(1, -1);
    }
    return call();
  };
  const tree = call();
  return tree && index === text.length ? tree : undefined;
}

/** The helper names a `$css` call uses, outermost first, or undefined. */
export function parseCssCall(source) {
  const tree = parseCssTree(source);
  if (!tree) return undefined;
  const names = [];
  const visit = (node) => {
    names.push(node.name);
    for (const arg of node.args) if (typeof arg === 'object') visit(arg);
  };
  visit(tree);
  return names;
}
