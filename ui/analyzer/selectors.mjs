/**
 * Selector parsing shared by the package stylesheet ownership check
 * (`scripts/lib/css-ownership.mjs`, `npm run check:css-ownership`) and the
 * downstream component-ownership diagnostics in `kerf-ui-analyze`
 * (`component-ownership.mjs`). Pure string work over one selector list: no
 * PostCSS, no filesystem. One copy means the package rule and the consumer
 * rule agree on which compound a selector styles.
 */

export function ownsClass(rootClass, candidate) {
  return (
    candidate === rootClass ||
    candidate.startsWith(`${rootClass}__`) ||
    candidate.startsWith(`${rootClass}--`)
  );
}

/**
 * Split a selector list into its complex selectors, and each complex selector
 * into compounds, ignoring commas and combinators nested inside parentheses,
 * attribute brackets, or quotes. Each compound records the combinator that
 * joins it to the previous one (`''` for the first).
 */
export function complexSelectorParts(selectorList) {
  const selectors = [];
  let compounds = [];
  let current = '';
  let combinator = '';
  let pending = '';
  let depth = 0;
  let quote = null;
  const endCompound = () => {
    if (current.trim()) {
      compounds.push({ combinator, compound: current.trim() });
      combinator = '';
    }
    current = '';
  };
  for (const char of selectorList) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
      current += char;
    } else if (char === '(' || char === '[') {
      depth += 1;
      current += char;
    } else if (char === ')' || char === ']') {
      depth -= 1;
      current += char;
    } else if (depth === 0 && char === ',') {
      endCompound();
      selectors.push(compounds);
      compounds = [];
      pending = '';
    } else if (depth === 0 && /[\s>+~]/.test(char)) {
      const hadCompound = current.trim() !== '';
      endCompound();
      if (/[>+~]/.test(char)) pending = char;
      else if (!pending && (hadCompound || compounds.length > 0)) pending = ' ';
    } else {
      if (!current && compounds.length > 0) {
        combinator = pending || ' ';
        pending = '';
      }
      current += char;
    }
  }
  endCompound();
  selectors.push(compounds);
  return selectors;
}

/** Complex selectors as arrays of compound strings. */
export function complexSelectors(selectorList) {
  return complexSelectorParts(selectorList).map((parts) =>
    parts.map(({ compound }) => compound),
  );
}

export function kuiClasses(selector) {
  return [...selector.matchAll(/\.((?:kui)-[a-z0-9_-]+)/gi)].map(
    ([, name]) => name,
  );
}

/** Every class name a selector names, in any namespace. */
export function classNames(selector) {
  return [...selector.matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)].map(
    ([, name]) => name,
  );
}

export function dataComponents(selector) {
  return [
    ...selector.matchAll(
      /\[data-component\s*=\s*["']?([a-z0-9-]+)["']?\s*\]/gi,
    ),
  ].map(([, name]) => name);
}

/**
 * Remove the arguments of every pseudo-class named in `names` from a
 * compound, keeping the empty call.
 */
export function withoutPseudoArguments(compound, names) {
  const opener = new RegExp(`^:(?:${names.join('|')})\\(`, 'i');
  let result = '';
  let skipDepth = 0;
  for (let index = 0; index < compound.length; index += 1) {
    if (skipDepth === 0) {
      const match = opener.exec(compound.slice(index));
      if (match) {
        result += match[0];
        skipDepth = 1;
        index += match[0].length - 1;
      } else result += compound[index];
    } else if (compound[index] === '(') skipDepth += 1;
    else if (compound[index] === ')') {
      skipDepth -= 1;
      if (skipDepth === 0) result += ')';
    }
  }
  return result;
}

/**
 * Remove the arguments of every `:has()` and `:not()` in a compound. A parent
 * may key its own styles on a composed child's state
 * (`:has(> .kui-select[open])`) or exclude a kerf child it does not own
 * (`wa-dropdown:not(.kui-popup-menu)`): neither styles that child.
 */
export function withoutRelationalArguments(compound) {
  return withoutPseudoArguments(compound, ['has', 'not']);
}

/** The top-level arguments of each `:name(...)` call in a compound. */
export function pseudoArguments(compound, name) {
  const args = [];
  const opener = new RegExp(`:${name}\\(`, 'gi');
  for (const match of compound.matchAll(opener)) {
    let depth = 1;
    let index = match.index + match[0].length;
    const start = index;
    for (; index < compound.length && depth > 0; index += 1) {
      if (compound[index] === '(') depth += 1;
      else if (compound[index] === ')') depth -= 1;
    }
    args.push(compound.slice(start, index - 1));
  }
  return args;
}

export function splitTopLevel(list) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of list) {
    if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * The element types a subject compound can match: its own type selector and
 * the subject types inside its `:is()` / `:where()` arguments. `null` means the
 * compound places no type constraint (universal).
 */
export function subjectTypes(compound) {
  const bare = withoutPseudoArguments(compound, [
    'has',
    'not',
    'is',
    'where',
    'part',
    'nth-child',
    'nth-last-child',
    'nth-of-type',
    'nth-last-of-type',
  ]);
  const own = /^([a-z][a-z0-9-]*)/i.exec(bare);
  if (own) return [own[1].toLowerCase()];
  const types = [];
  for (const name of ['is', 'where']) {
    for (const args of pseudoArguments(
      withoutRelationalArguments(compound),
      name,
    )) {
      for (const arg of splitTopLevel(args)) {
        const parts = complexSelectors(arg)[0] ?? [];
        const last = parts.at(-1);
        if (!last) return null;
        const inner = subjectTypes(last);
        if (inner === null) {
          // A class-only argument constrains nothing by type, but it names an
          // element that must carry that class.
          if (kuiClasses(withoutRelationalArguments(last)).length > 0) continue;
          return null;
        }
        types.push(...inner);
      }
    }
  }
  return types.length > 0 ? types : null;
}
