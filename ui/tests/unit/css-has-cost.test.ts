import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

// KF-MEV7Q1 (restore-corner `:has(…) > * > * > *` scope made every style
// recalc ~7x slower in a real app): in Chromium, a `:has()` container
// followed by a combinator and a UNIVERSAL rightmost compound (`> *`,
// `> :not(…)`, `* *`, …) restyles every child of every ancestor of a DOM
// change, so a text edit in a long list costs a full restyle of the list
// (measured ~85ms -> ~0.9ms per change once the shape was removed). The same
// selector ending on a class, attribute, id, or type is invalidated only for
// elements carrying that key and stays cheap. A keyed :has() container
// (`.kui-workbench__main:not(:has(…)) > *`) narrows the candidates to that
// class; its remaining cost is under investigation in KF-1M98TC (measure
// keyed `:not(:has(…)) > *` layout-content rules under long lists).

const src = resolve(import.meta.dirname, '../../src');

async function cssFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await cssFiles(file)));
    else if (entry.name.endsWith('.css')) files.push(file);
  }
  return files;
}

/** Splits `text` on `separator` characters outside parentheses/brackets. */
function splitTopLevel(text: string, isSeparator: (char: string) => boolean) {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    if (depth === 0 && isSeparator(char)) {
      parts.push(current);
      current = '';
    } else current += char;
  }
  parts.push(current);
  return parts;
}

/** The compounds of one complex selector, combinators dropped. */
function compounds(complex: string): string[] {
  const normalized = complex
    .replace(/\s*([>+~])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return splitTopLevel(normalized, (char) => '>+~ '.includes(char)).filter(
    Boolean,
  );
}

/** Whether a compound carries a key (type, class, id, or attribute). */
function keyed(compound: string): boolean {
  let bare = '';
  let depth = 0;
  for (const char of compound) {
    if (char === '(') depth++;
    if (depth === 0) bare += char;
    if (char === ')') depth--;
  }
  return /^[a-z]|[.#[]/i.test(bare);
}

/** Top-level `:is()` / `:where()` arguments of a compound. */
function forgivingArguments(compound: string): string[] {
  const found: string[] = [];
  const pattern = /:(?:is|where)\(/g;
  for (
    let match = pattern.exec(compound);
    match;
    match = pattern.exec(compound)
  ) {
    let depth = 1;
    let index = match.index + match[0].length;
    const start = index;
    for (; index < compound.length && depth > 0; index++) {
      if (compound[index] === '(') depth++;
      if (compound[index] === ')') depth--;
    }
    found.push(compound.slice(start, index - 1));
    pattern.lastIndex = index;
  }
  return found;
}

/**
 * The costly shapes in one complex selector: a `:has()` compound followed by
 * an unkeyed rightmost compound, or an unkeyed subject whose `:has()` looks
 * across siblings (`:has(~ …)` / `:has(+ …)`) or through all descendants.
 */
function costlyShapes(complex: string): string[] {
  const parts = compounds(complex);
  const subject = parts.at(-1) ?? '';
  const problems: string[] = [];
  if (
    !keyed(subject) &&
    parts.slice(0, -1).some((part) => part.includes(':has(') && !keyed(part))
  )
    problems.push('universal compound after a universal :has() container');
  if (
    !keyed(subject.replace(/:has\(.*$/, '')) &&
    /:has\(\s*(?:[~+]|[^>\s~+])/.test(subject)
  ) {
    if (/:has\(\s*[~+]/.test(subject))
      problems.push('universal :has() sibling subject');
    else if (!/^:(?:is|where)\(/.test(subject))
      problems.push('universal :has() descendant subject');
  }
  // An unkeyed subject such as `:is(…)` is only as keyed as its arguments.
  if (!keyed(subject))
    for (const argument of forgivingArguments(subject))
      for (const inner of splitTopLevel(argument, (char) => char === ','))
        problems.push(...costlyShapes(inner));
  return problems;
}

async function violations() {
  const found: string[] = [];
  for (const file of await cssFiles(src)) {
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    root.walkRules((rule) => {
      for (const complex of splitTopLevel(rule.selector, (c) => c === ',')) {
        for (const problem of costlyShapes(complex))
          found.push(
            `${relative(src, file)}: ${problem}: ${complex.replace(/\s+/g, ' ').trim()}`,
          );
      }
    });
  }
  return found;
}

// Known debt, each tracked by a follow-up ticket. An entry must keep matching
// a live selector, so the list can only shrink.
const KNOWN = [
  // KF-PM5EVE (universal `:has(~ …)` edge-inset rules restyle every
  // preceding sibling on each insertion into a long list).
  'collapsible-panel.css: universal :has() sibling subject: :has( ~ .kui-collapsible-panel--right[data-presentation="inline"]:not( [data-collapsed="true"], [data-collapsible-overlay="true"] *, [data-collapsible-responsive="hidden"] * ) )',
  'collapsible-panel.css: universal :has() sibling subject: :has( ~ .kui-collapsible-panel--bottom[data-presentation="inline"]:not( [data-collapsed="true"], [data-collapsible-overlay="true"] *, [data-collapsible-responsive="hidden"] * ) )',
];

describe('package CSS :has() cost', () => {
  it('flags the costly shapes and passes their keyed forms', () => {
    expect(costlyShapes(':where(:has(> .a)) > * > * > *')).not.toEqual([]);
    expect(costlyShapes(':where(:has(> .a)) > :not(.b)')).not.toEqual([]);
    expect(costlyShapes(':is(:has(> .a) > *)')).not.toEqual([]);
    expect(costlyShapes(':has(~ .a)')).not.toEqual([]);
    expect(costlyShapes(':has(.a)')).not.toEqual([]);
    expect(costlyShapes(':where(:has(> .a)) > .b')).toEqual([]);
    expect(costlyShapes(':where(:has(> .a), :has(> .a) > *) > .b[x]')).toEqual(
      [],
    );
    expect(costlyShapes(':where(:has(> .a))')).toEqual([]);
    expect(costlyShapes('.x:has(~ .a)')).toEqual([]);
    expect(costlyShapes('.x:not(:has(> .a)) > *')).toEqual([]);
    expect(costlyShapes('[data-x]:has(.a)')).toEqual([]);
  });

  it('never follows a :has() container with a universal selector in ui/src', async () => {
    const found = await violations();
    expect(found.filter((entry) => !KNOWN.includes(entry))).toEqual([]);
    for (const entry of KNOWN) expect(found).toContain(entry);
  });
});
