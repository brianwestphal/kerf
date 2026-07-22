#!/usr/bin/env node
/**
 * KF-343: verify the SIGNATURES shown in `docs/8-api-reference.md` against the
 * emitted `.d.ts` truth — not just that every export is *mentioned*
 * (`check-doc-api-coverage.mjs` already does presence). This catches a stale
 * signature in the doc: a renamed parameter, a reordered/removed parameter, a
 * changed committed type, an undocumented required parameter, or an
 * undocumented overload.
 *
 * ── What it reads ──────────────────────────────────────────────────────────
 * The built entry declaration files (dist/ must exist — run `npm run build`
 * first; the `check` chain calls this right after the build step):
 *   dist/index.d.ts, dist/array-signal.d.ts, dist/jsx-runtime.d.ts,
 *   dist/testing.d.ts
 * Re-exports that point at sibling dist chunks (`export { d as defineStore }
 * from './testing-….js'`) are followed into the chunk to find the real
 * `declare function` declaration. Re-exports of EXTERNAL modules
 * (`@preact/signals-core` → `computed`, `batch`, `Signal`, `ReadonlySignal`)
 * are skipped: their signatures don't live in our dist, so presence-coverage
 * is the only contract we can hold them to.
 *
 * ── Scope: top-level FUNCTION exports only ─────────────────────────────────
 * We verify `declare function` exports (including overloads). We deliberately
 * do NOT walk class members (`SafeHtml`, `ArraySignal`): their internal
 * constructors/methods reference intentionally-hidden internal types
 * (`SafeHtml`'s `constructor(input: string | Segment)` is documented as the
 * simpler `constructor(html: string)` because `Segment` is internal), so
 * member-level checking would force the doc to expose internals or generate
 * false positives. Classes are still presence-checked by
 * `check-doc-api-coverage.mjs`.
 *
 * ── The matching rule (pragmatic, documented on purpose) ───────────────────
 * The doc shows simplified signatures; it must not have to mirror the .d.ts
 * verbatim. For each documented signature of an export, per overload:
 *
 *  1. PARAMETER NAMES + ARITY. The parameter-name sequence in the doc must
 *     equal the .d.ts parameter names in order. The doc MAY omit *trailing*
 *     parameters, but only if every omitted .d.ts parameter is optional (`?`)
 *     — this is how `morph`'s internal trailing `ownedItems?` is legitimately
 *     left out. A renamed / reordered / removed-non-optional / extra parameter
 *     fails.
 *  2. RETURN TYPE. When the doc gives a return type (all our real signatures
 *     do), its normalized form must equal the .d.ts return type.
 *  3. PARAMETER TYPES — checked only where the doc COMMITS to one. A bare doc
 *     parameter (`each(items, render, cacheKey?)`) skips its type check by
 *     design. When the doc annotates a parameter, the normalized type must
 *     match the .d.ts — EXCEPT function-typed / object-literal-typed
 *     parameters (types containing `=>` or `{`), which docs routinely
 *     simplify and which are fragile to compare; those skip the type check but
 *     still enforce the name.
 *  4. OVERLOADS. Every .d.ts overload of an export must be matched by at least
 *     one documented signature (catches an overload the doc dropped, e.g. the
 *     dynamic `attr(name)` form).
 *
 * A "documented signature" is any inline-code span or fenced-code line that
 * starts with the export name, parses as a balanced `name(params): return`,
 * AND carries a return type. Requiring the return type is what separates a
 * real signature from a CALL example — `morph(liveCard, freshEl)` and
 * `each(rows.value, row => …)` have no `): T` tail, so they're ignored.
 *
 * Normalization: collapse all insignificant whitespace (spaces are kept only
 * between two word characters, so `Signal < T >` ≡ `Signal<T>`, `() => void`
 * ≡ `()=>void`, while `value is SafeHtml` keeps its word spacing).
 *
 * Run via `node scripts/check-doc-api-signatures.mjs` (or the standalone
 * `npm run check:docs:api-signatures`, which builds first). Wired into
 * `npm run check` immediately after `npm run build`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = resolve(REPO_ROOT, 'dist');
const API_DOC = resolve(REPO_ROOT, 'docs/8-api-reference.md');

const ENTRY_DTS = ['index.d.ts', 'array-signal.d.ts', 'jsx-runtime.d.ts', 'testing.d.ts'];

// Internal function exports the JSX transform consumes but users never call by
// hand, plus JSX sugar with no user-facing parameter signature. Presence of
// the user-facing ones (`Fragment`) is covered by check-doc-api-coverage.
const EXEMPT_FUNCS = new Set([
  'jsx',
  'jsxs',
  'jsxDEV',
  'listSafeHtml',
  'granularListSafeHtml',
  'Fragment',
]);

// ── .d.ts scanning helpers ────────────────────────────────────────────────

const fileCache = new Map();
function readDts(name) {
  if (!fileCache.has(name)) {
    fileCache.set(name, readFileSync(resolve(DIST, name), 'utf8'));
  }
  return fileCache.get(name);
}

/** Parse every `export { ... } from '...'?` specifier list in a .d.ts. */
function parseExportStatements(src) {
  const specs = [];
  for (const m of src.matchAll(/export\s*\{([^}]*)\}\s*(?:from\s*['"]([^'"]+)['"])?\s*;?/g)) {
    const from = m[2] ?? null;
    for (const rawPiece of m[1].split(',')) {
      const piece = rawPiece.trim();
      if (piece === '') continue;
      const isType = /^type\s+/.test(piece);
      const cleaned = piece.replace(/^type\s+/, '');
      const [localRaw, exportedRaw] = cleaned.includes(' as ')
        ? cleaned.split(' as ').map((s) => s.trim())
        : [cleaned.trim(), cleaned.trim()];
      specs.push({ local: localRaw, exported: exportedRaw, from, isType });
    }
  }
  return specs;
}

/**
 * Scan a balanced `<...>` type-parameter block starting at `i` (src[i] === '<').
 * Handles `=>` so the `>` of an arrow type isn't mistaken for a closer.
 * Returns the index just past the matching `>`.
 */
function skipAngles(src, i) {
  let depth = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '=' && src[i + 1] === '>') {
      i++;
      continue;
    }
    if (c === '<') depth++;
    else if (c === '>') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return i;
}

/** Scan a balanced `(...)` starting at `i` (src[i] === '('); return end index (past ')'). */
function skipParens(src, i) {
  let depth = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return i;
}

/**
 * Parse a single `declare function NAME<...>(params): ret;` declaration whose
 * `declare function` keyword starts at `start`. Returns { params, ret } or null.
 */
function parseFunctionDecl(src, start) {
  let i = src.indexOf('function', start) + 'function'.length;
  while (src[i] === ' ') i++;
  const nameMatch = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
  if (!nameMatch) return null;
  i += nameMatch[0].length;
  while (src[i] === ' ') i++;
  if (src[i] === '<') i = skipAngles(src, i);
  while (src[i] === ' ') i++;
  if (src[i] !== '(') return null;
  const parenStart = i;
  const parenEnd = skipParens(src, i);
  const paramsRaw = src.slice(parenStart + 1, parenEnd - 1);
  // Return type: from the ':' after the ')' up to the terminating ';' — the
  // one at bracket depth 0, NOT a ';' inside an object-literal return type
  // (e.g. `(value: V) => { readonly [K in N]: V; }`).
  let j = parenEnd;
  while (src[j] === ' ') j++;
  let ret = null;
  if (src[j] === ':') {
    let depth = 0;
    let end = src.length;
    for (let k = j + 1; k < src.length; k++) {
      const c = src[k];
      if (c === '=' && src[k + 1] === '>') {
        k++; // skip the arrow so its '>' doesn't unbalance depth
        continue;
      }
      if (c === '(' || c === '<' || c === '{' || c === '[') depth++;
      else if (c === ')' || c === '>' || c === '}' || c === ']') depth--;
      else if (c === ';' && depth === 0) {
        end = k;
        break;
      }
    }
    ret = src.slice(j + 1, end).trim();
  }
  return { params: splitTopLevel(paramsRaw).map(parseParam), ret };
}

/** Collect all `declare function <name>` overload declarations in `src`. */
function collectFunctionDecls(src, name) {
  const decls = [];
  const re = new RegExp(`declare function ${name}\\b`, 'g');
  for (const m of src.matchAll(re)) {
    const parsed = parseFunctionDecl(src, m.index);
    if (parsed) decls.push(parsed);
  }
  return decls;
}

/**
 * Resolve an exported name to its concrete `declare function` overloads,
 * following local dist re-exports. Returns { name, decls } or null when the
 * export isn't a locally-declared function (external re-export, a class, a
 * type, etc.).
 */
function resolveFunction(fileName, exportedName, seen = new Set()) {
  const key = `${fileName}#${exportedName}`;
  if (seen.has(key)) return null;
  seen.add(key);

  const src = readDts(fileName);
  const specs = parseExportStatements(src);
  const spec = specs.find((s) => s.exported === exportedName);

  if (spec && spec.from) {
    // External module → unresolvable here (presence-only contract).
    if (!spec.from.startsWith('.')) return null;
    const target = spec.from.replace(/^\.\//, '').replace(/\.js$/, '.d.ts');
    return resolveFunction(target, spec.local, seen);
  }

  // Local declaration: use the spec's local name if present, else the export
  // name itself (barrels list local declares in a plain `export { ... }`).
  const localName = spec ? spec.local : exportedName;
  const decls = collectFunctionDecls(src, localName);
  if (decls.length === 0) return null;
  return { name: exportedName, decls };
}

// ── shared signature tokenizing ───────────────────────────────────────────

/** Split a comma list at top level (ignoring commas inside () <> {} []). */
function splitTopLevel(s) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '=' && s[i + 1] === '>') {
      buf += '=>';
      i++;
      continue;
    }
    if (c === '(' || c === '<' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '>' || c === '}' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      if (buf.trim() !== '') out.push(buf.trim());
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf.trim() !== '') out.push(buf.trim());
  return out;
}

/** Parse one parameter declaration → { name, optional, type } or null. */
function parseParam(seg) {
  const m = /^(\.\.\.)?\s*([A-Za-z_$][\w$]*)\s*(\?)?\s*(?::\s*([\s\S]+))?$/.exec(seg.trim());
  if (!m) return null;
  return { name: m[2], optional: Boolean(m[3]), type: m[4] ? m[4].trim() : null };
}

/** Normalize a type string: keep a space only between two word chars. */
function normalizeType(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\s*([<>(){}\[\],;:|&?=])\s*/g, '$1')
    .trim();
}

const isComplexType = (t) => t.includes('=>') || t.includes('{');

// ── doc signature extraction ──────────────────────────────────────────────

/**
 * Pull candidate signature strings out of the doc: every inline-code span
 * (outside fenced blocks) plus every line inside a ```…``` fence.
 */
function collectDocCandidates(doc) {
  const lines = doc.split('\n');
  const fenceLines = [];
  const proseLines = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) fenceLines.push(line.trim());
    else proseLines.push(line);
  }
  const candidates = [...fenceLines];
  for (const m of proseLines.join('\n').matchAll(/`([^`]+)`/g)) {
    candidates.push(m[1].trim());
  }
  return candidates;
}

/**
 * Parse a candidate string as a signature for `name`. Returns { params, ret }
 * when it starts with `name`, is balanced, carries a return type, and every
 * parameter is a valid declaration; otherwise null.
 */
function parseDocSignature(candidate, name) {
  const s = candidate.trim().replace(/^declare function\s+/, '');
  if (!s.startsWith(name)) return null;
  let i = name.length;
  // Reject `nameOther(` — the name must be followed by `<` or `(`.
  if (s[i] !== '<' && s[i] !== '(') return null;
  if (s[i] === '<') i = skipAngles(s, i);
  if (s[i] !== '(') return null;
  const parenEnd = skipParens(s, i);
  if (parenEnd > s.length) return null;
  const paramsRaw = s.slice(i + 1, parenEnd - 1);
  let j = parenEnd;
  while (s[j] === ' ') j++;
  if (s[j] !== ':') return null; // require a return type — excludes call examples
  const ret = s.slice(j + 1).replace(/;?\s*$/, '').trim();
  if (ret === '') return null;
  const params = splitTopLevel(paramsRaw).map(parseParam);
  if (params.some((p) => p === null)) return null; // an arg wasn't a param decl
  return { params, ret };
}

// ── matching ──────────────────────────────────────────────────────────────

/** Does a documented signature satisfy a .d.ts overload? Returns null or a reason string. */
function overloadMismatchReason(dtsDecl, docSig) {
  const dp = dtsDecl.params;
  const cp = docSig.params;
  if (cp.length > dp.length) {
    return `doc lists ${cp.length} params, .d.ts has ${dp.length}`;
  }
  // Trailing .d.ts params the doc omits must be optional.
  for (let k = cp.length; k < dp.length; k++) {
    if (!dp[k].optional) return `doc omits required param \`${dp[k].name}\``;
  }
  for (let k = 0; k < cp.length; k++) {
    if (cp[k].name !== dp[k].name) {
      return `param #${k + 1} name: doc \`${cp[k].name}\` vs .d.ts \`${dp[k].name}\``;
    }
    if (cp[k].type && dp[k].type && !isComplexType(cp[k].type) && !isComplexType(dp[k].type)) {
      if (normalizeType(cp[k].type) !== normalizeType(dp[k].type)) {
        return `param \`${cp[k].name}\` type: doc \`${cp[k].type}\` vs .d.ts \`${dp[k].type}\``;
      }
    }
  }
  // Object-literal return types (`… => { … }`) are skipped for the same
  // reason object/function param types are: TS emits `;`-separated members the
  // doc simplifies, and comparing them verbatim is fragile. Plain and
  // function-type returns (`() => void`, `Signal<T>`, `value is SafeHtml`) are
  // still compared.
  const retFragile = (t) => t.includes('{');
  if (
    docSig.ret && dtsDecl.ret
    && !retFragile(docSig.ret) && !retFragile(dtsDecl.ret)
    && normalizeType(docSig.ret) !== normalizeType(dtsDecl.ret)
  ) {
    return `return type: doc \`${docSig.ret}\` vs .d.ts \`${dtsDecl.ret}\``;
  }
  return null;
}

function main() {
  if (!existsSync(resolve(DIST, 'index.d.ts'))) {
    console.error(
      '[check-doc-api-signatures] dist/*.d.ts not found — run `npm run build` first '
      + '(or use `npm run check:docs:api-signatures`, which builds).',
    );
    process.exit(1);
  }

  const doc = readFileSync(API_DOC, 'utf8');
  const candidates = collectDocCandidates(doc);

  // Discover every public function export across the entry files.
  const targets = new Map(); // exported name → resolved { name, decls }
  for (const entry of ENTRY_DTS) {
    const src = readDts(entry);
    for (const spec of parseExportStatements(src)) {
      if (spec.isType) continue;
      if (EXEMPT_FUNCS.has(spec.exported)) continue;
      if (targets.has(spec.exported)) continue;
      const resolved = resolveFunction(entry, spec.exported);
      if (resolved) targets.set(spec.exported, resolved);
    }
  }

  const problems = [];
  for (const [name, { decls }] of targets) {
    const docSigs = candidates
      .map((c) => parseDocSignature(c, name))
      .filter((s) => s !== null);

    if (docSigs.length === 0) {
      problems.push({ name, detail: 'no signature documented in docs/8-api-reference.md' });
      continue;
    }

    for (const decl of decls) {
      const anyMatch = docSigs.some((sig) => overloadMismatchReason(decl, sig) === null);
      if (!anyMatch) {
        // Report the closest doc signature's reason for a helpful message.
        const reason = overloadMismatchReason(decl, docSigs[0]);
        const sig = `${name}(${decl.params.map((p) => p.name + (p.optional ? '?' : '')).join(', ')})`
          + `: ${decl.ret ?? 'void'}`;
        problems.push({
          name,
          detail: `.d.ts overload \`${sig}\` not matched by any documented signature (${reason})`,
        });
      }
    }
  }

  if (problems.length === 0) {
    console.log(
      `[check-doc-api-signatures] OK — ${targets.size} public function exports match their `
      + 'documented signatures.',
    );
    return;
  }

  console.error(
    '[check-doc-api-signatures] docs/8-api-reference.md signatures drifted from dist/*.d.ts:\n',
  );
  for (const { name, detail } of problems) {
    console.error(`  - ${name}: ${detail}`);
  }
  console.error(
    '\nUpdate the signature shown in docs/8-api-reference.md (then run '
    + '`node site/scripts/sync-docs.mjs`), or fix the export. See the matching rule '
    + 'documented at the top of scripts/check-doc-api-signatures.mjs.',
  );
  process.exit(1);
}

main();
