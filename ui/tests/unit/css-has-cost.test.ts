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
// elements carrying that key and stays cheap.
//
// KF-3D4T27 (the layout-content inset rules cost ~46ms per restyle when list
// rows were the region's direct children): keying the :has() container does
// not help. `.kui-workbench__main:not(:has(…)) > *` still makes each child of
// the region re-check the region's :has() on every DOM change (~2ms with the
// list one level down, ~46ms with 1000 rows directly inside). The regions now
// test the exemption on the child (`region > :not(:is(…):only-child)`), so any
// :has() compound, keyed or not, followed by an unkeyed rightmost compound is
// rejected.
//
// KF-PM5EVE (CollapsiblePanel's sibling edge-inset rules restyled a long
// list's rows on every insertion): an unkeyed subject reached across siblings
// (`:has(~ …)` subject, or `.panel ~ *`) makes every element a sibling-rule
// candidate, so each insertion into a long list restyles the list's other
// rows (measured ~14.6ms -> ~0.2ms per insertion in a 1000-row list once the
// three CollapsiblePanel rules moved to a container flag + style query).

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
 * Whether a subject compound is keyed, counting a top-level `:is()` /
 * `:where()` whose every alternative ends on a key (`:is(button, .a)`).
 */
function keyedSubject(compound: string): boolean {
  return (
    keyed(compound) ||
    forgivingArguments(compound).some((argument) =>
      splitTopLevel(argument, (char) => char === ',').every((alternative) =>
        keyed(compounds(alternative).at(-1) ?? ''),
      ),
    )
  );
}

/** A compound with its top-level `:is()` / `:where()` groups removed. */
function withoutForgiving(compound: string): string {
  let result = compound;
  for (const argument of forgivingArguments(compound))
    result = result.replace(argument, '');
  return result;
}

/** The combinator before the subject compound, or `''` for a lone compound. */
function subjectCombinator(complex: string): string {
  const normalized = complex
    .replace(/\s*([>+~])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  let depth = 0;
  let last = '';
  for (const char of normalized) {
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (depth === 0 && '>+~ '.includes(char)) last = char;
  }
  return last;
}

/**
 * The costly shapes in one complex selector: a `:has()` compound followed by
 * an unkeyed rightmost compound, an unkeyed subject whose `:has()` looks
 * across siblings (`:has(~ …)` / `:has(+ …)`) or through all descendants, or
 * an unkeyed subject after a general sibling combinator (`.a ~ *`).
 */
function costlyShapes(complex: string): string[] {
  const parts = compounds(complex);
  const subject = parts.at(-1) ?? '';
  const problems: string[] = [];
  if (!keyedSubject(subject) && subjectCombinator(complex) === '~')
    problems.push('universal subject after a ~ sibling combinator');
  if (
    !keyedSubject(subject) &&
    parts.slice(0, -1).some((part) => part.includes(':has('))
  )
    problems.push('universal compound after a :has() container');
  // The subject's own `:has()`, not one inside an `:is()` / `:where()`
  // argument (those are checked as their own complex selectors below).
  const own = withoutForgiving(subject);
  if (
    !keyed(own.replace(/:has\(.*$/, '')) &&
    /:has\(\s*(?:[~+]|[^>\s~+])/.test(own)
  ) {
    if (/:has\(\s*[~+]/.test(own))
      problems.push('universal :has() sibling subject');
    else problems.push('universal :has() descendant subject');
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
const KNOWN: string[] = [];

describe('package CSS :has() cost', () => {
  it('flags the costly shapes and passes their keyed forms', () => {
    expect(costlyShapes(':where(:has(> .a)) > * > * > *')).not.toEqual([]);
    expect(costlyShapes(':where(:has(> .a)) > :not(.b)')).not.toEqual([]);
    expect(costlyShapes(':is(:has(> .a) > *)')).not.toEqual([]);
    expect(costlyShapes(':has(~ .a)')).not.toEqual([]);
    expect(costlyShapes(':has(.a)')).not.toEqual([]);
    expect(costlyShapes('.a ~ *')).not.toEqual([]);
    expect(costlyShapes('.a[x]:not(.b) ~ :not(.c)')).not.toEqual([]);
    expect(costlyShapes('.a ~ .b')).toEqual([]);
    expect(costlyShapes('.a + *')).toEqual([]);
    expect(costlyShapes('.a:not(.a ~ *)')).toEqual([]);
    expect(costlyShapes(':where(.a:not(:has(~ .a)))')).toEqual([]);
    expect(costlyShapes(':where(:has(~ .a))')).not.toEqual([]);
    expect(costlyShapes(':where(.b):has(~ .a)')).not.toEqual([]);
    expect(costlyShapes(':where(:has(> .a)) > .b')).toEqual([]);
    expect(costlyShapes(':where(:has(> .a), :has(> .a) > *) > .b[x]')).toEqual(
      [],
    );
    expect(costlyShapes(':where(:has(> .a))')).toEqual([]);
    expect(costlyShapes('.x:has(~ .a)')).toEqual([]);
    expect(costlyShapes('.x:not(:has(> .a)) > *')).not.toEqual([]);
    expect(costlyShapes('.x:has(> .a) > :not(.b)')).not.toEqual([]);
    expect(costlyShapes('.x > :not(:is(.a):only-child)')).toEqual([]);
    expect(costlyShapes('.x:has(> .a) > .b')).toEqual([]);
    expect(costlyShapes('.x:has(> .a) > :is(button, .b):hover')).toEqual([]);
    expect(costlyShapes('.x:has(> .a) > :is(.b, *)')).not.toEqual([]);
    expect(costlyShapes('[data-x]:has(.a)')).toEqual([]);
  });

  it('never follows a :has() container with a universal selector in ui/src', async () => {
    const found = await violations();
    expect(found.filter((entry) => !KNOWN.includes(entry))).toEqual([]);
    for (const entry of KNOWN) expect(found).toContain(entry);
  });
});
