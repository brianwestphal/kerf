#!/usr/bin/env node
/**
 * Enforce AGENTS.md **Design rule 5** — module-level mutable state in `src/` is
 * restricted to the places the rule enumerates.
 *
 * The rule's entire force comes from being exhaustive: "restricted to four
 * documented places" is only useful for judging a NEW mutable while the list is
 * complete. It had quietly stopped being complete — `each.ts:renderingRow` and
 * `item-version.ts:anyVersioned` were both live, both correct, and both
 * unmentioned, which left a reviewer with no way to say whether the next one
 * belonged. Prose can't notice that about itself; this can.
 *
 * Module-level mutable state is found two ways, from the TypeScript AST:
 *
 *   - every top-level `let`, and
 *   - every top-level `const` holding a container (`new Map/Set/WeakMap/
 *     WeakSet`, an array literal, or an object literal) that some function in
 *     its file mutates (`.set/.add/.delete/.clear/.push/…`, an element or
 *     property assignment, or `delete`). A lookup table filled once while the
 *     module loads is not mutable state and is not reported.
 *
 * Each one is accounted for when either:
 *
 *   1. the rule-5 paragraph of AGENTS.md names it as `file.ts:name` (the path
 *      relative to `src/`, so `utils/x.ts:name` for a nested file). Matching
 *      the pair, not the bare name, is what keeps a new `let context` in some
 *      other file from passing because `each.ts:context` is listed; or
 *   2. it lives in a `dev-*.ts` module — the rule covers those categorically as
 *      dev-only bookkeeping (one-shot dedup flags, the delegate nesting
 *      counter), because naming each one would make the rule churn every time a
 *      warning is added.
 *
 * Anything else fails, **even when the code is right** — that is the point. A
 * hit here means the rule needs updating, which is a decision for a human, not
 * something to silently absorb.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** The text of AGENTS.md's Design rule 5, so identifiers can be looked up in it. */
function ruleText() {
  const agentsMd = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
  const start = agentsMd.indexOf(
    '5. **Module-level mutable state is restricted',
  );
  if (start === -1) {
    console.error(
      'check-design-rule-5: could not find Design rule 5 in AGENTS.md.\n' +
        'If the rule was renumbered or reworded, update the anchor in this script.',
    );
    process.exit(1);
  }
  // The rule runs to the next numbered design rule, or to the end of the list.
  const rest = agentsMd.slice(start + 1);
  const end = rest.search(/\n\s*\d+\. \*\*/);
  return end === -1 ? rest : rest.slice(0, end);
}

/** Every `.ts` file under `src/`, recursively. */
function sourceFiles(dir = SRC) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (entry.name.endsWith('.ts')) out.push(path);
  }
  return out;
}

const MUTATING_METHODS = new Set([
  'set',
  'add',
  'delete',
  'clear',
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
]);

/** Is `init` a container a function could mutate in place? */
function isContainer(init) {
  if (init === undefined) return false;
  while (ts.isAsExpression(init) || ts.isSatisfiesExpression(init))
    init = init.expression;
  if (ts.isArrayLiteralExpression(init) || ts.isObjectLiteralExpression(init))
    return true;
  return (
    ts.isNewExpression(init) &&
    ts.isIdentifier(init.expression) &&
    ['Map', 'Set', 'WeakMap', 'WeakSet'].includes(init.expression.text)
  );
}

/** The identifier an access chain starts from: `a.b[c].d` → `a`. */
function rootName(node) {
  while (
    ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node)
  )
    node = node.expression;
  return ts.isIdentifier(node) ? node.text : null;
}

const insideFunction = (node) => {
  for (let parent = node.parent; parent; parent = parent.parent)
    if (ts.isFunctionLike(parent)) return true;
  return false;
};

/** Names of the given candidates that a function body in `file` mutates. */
function mutatedInFunctions(file, candidates) {
  const mutated = new Set();
  const visit = (node) => {
    let target = null;
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      MUTATING_METHODS.has(node.expression.name.text)
    )
      target = rootName(node.expression.expression);
    else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      (ts.isPropertyAccessExpression(node.left) ||
        ts.isElementAccessExpression(node.left))
    )
      target = rootName(node.left);
    else if (ts.isDeleteExpression(node)) target = rootName(node.expression);
    if (target && candidates.has(target) && insideFunction(node))
      mutated.add(target);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return mutated;
}

/** Top-level `let`s and function-mutated `const` containers in one file. */
function moduleState(path) {
  const text = readFileSync(path, 'utf8');
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const lets = [];
  const containers = new Map();
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const isLet = (statement.declarationList.flags & ts.NodeFlags.Let) !== 0;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const line =
        file.getLineAndCharacterOfPosition(declaration.getStart()).line + 1;
      const entry = { name: declaration.name.text, line, kind: 'let' };
      if (isLet) lets.push(entry);
      else if (isContainer(declaration.initializer))
        containers.set(entry.name, { ...entry, kind: 'mutated const' });
    }
  }
  const mutated = mutatedInFunctions(file, containers);
  return [
    ...lets,
    ...[...containers.values()].filter((c) => mutated.has(c.name)),
  ];
}

const rule = ruleText();
const unaccounted = [];

for (const file of sourceFiles()) {
  const rel = relative(ROOT, file);
  // Categorically covered: dev-only bookkeeping in the dev-* modules.
  if (/(^|\/)dev-[\w-]+\.ts$/.test(rel)) continue;
  const key = relative(SRC, file);
  for (const { name, line, kind } of moduleState(file)) {
    if (rule.includes(`${key}:${name}`)) continue;
    unaccounted.push({ where: `${rel}:${line}`, name: `${key}:${name}`, kind });
  }
}

if (unaccounted.length > 0) {
  console.error(
    '\nModule-level mutable state not accounted for by AGENTS.md Design rule 5:\n',
  );
  for (const hit of unaccounted)
    console.error(`  ${hit.where}  —  ${hit.name} (${hit.kind})`);
  console.error(
    '\nThe rule enumerates where module-level mutable state may live, and it is only\n' +
      'useful for judging a new one while that list is complete. Either fold this into\n' +
      'an existing clause, add a clause for it, or move the state into an argument.\n' +
      'Being correct code is not sufficient — the rule has to say so.\n',
  );
  process.exit(1);
}

console.log(
  '[check-design-rule-5] OK — every top-level `let` and function-mutated `const` container in src/ maps to a documented `file:name` clause.',
);
