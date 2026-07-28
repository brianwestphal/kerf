---
name: check-code-hygiene
description: Check code for standardization, readability, maintenance complexity, and defensive coding practices
allowed-tools: Read, Grep, Glob, Bash, Agent
---

> **Thresholds live in CLAUDE.md, not here.** Every number and file list in this skill has gone stale at least once by being copied rather than referenced. Before flagging anything against a *rule*, open CLAUDE.md and read the current text; treat any figure quoted below as a pointer to the right section, never as the authority. The mechanical recipes (greps, `wc`, dependency checks) are the durable part of this skill.

Analyze the kerf codebase for code hygiene issues. Generate a report highlighting problems with standardization, human readability, maintenance complexity, and defensive coding.

Scope: `src/` and (where relevant) `tests/`. Skip `examples/` unless something there bleeds into the published package.

## Analysis Areas

### 1. Standardization
- **File naming conventions**: `src/` uses kebab-case / lowercase (`mount.ts`, `jsx-runtime.ts`) by default. **camelCase is allowed when the filename matches the primary function / class / value exported from that file** — e.g. `toElement.ts` exports `toElement`, `escapeHtml.ts` exports `escapeHtml`. The principle is "filename = primary export"; that mirroring is more useful than a global casing rule. Flag a casing only if the filename matches *neither* convention nor its primary export.
- **Function / variable / type naming**: TypeScript identifiers use camelCase for values, PascalCase for types/classes, SCREAMING_SNAKE_CASE for module-level constants. Flag inconsistencies.
- **One-primary-export-per-file** (CLAUDE.md design rule #4). Legitimate exceptions: `delegate.ts` (Tier 1 + Tier 2 paired), `escapeHtml.ts` (paired escapers), `jsx-runtime.ts` (the JSX runtime contract). Anything else with multiple unrelated exports is a finding.
- **Import patterns**: All relative imports must use the `.js` extension (CLAUDE.md). eslint-plugin-simple-import-sort enforces order — if lint passes, import order is fine. The `.js` extension check is your responsibility.
- **Error message style**: kerf throws descriptive errors with hints (`'JSX: unsupported child of type X. Common mistakes: ...'`). New errors should follow that pattern; flag terse `throw new Error('failed')`-style throws.

### 2. Human Readability
- **File length**: read the current rule under CLAUDE.md § *Code Quality Gates* — do not trust a number quoted here. As of writing it is "one coherent concern per file", with **~500 LOC a *smell* worth a second look for a hidden second concern, not a gate**. A large file housing a single algorithm is explicitly NOT a finding — the keyed list reconciler is called out by name. Use `wc -l src/*.ts src/utils/*.ts | sort -rn` to rank, then judge each large file on whether it holds one concern or two. `src/jsx-types.ts` is data (a per-tag attribute table), so length there says nothing.
- **Function length**: Flag functions over 50 lines that should be broken up.
- **Nesting depth**: Flag code with more than 3 levels of nesting.
- **Magic numbers / strings**: Hardcoded values that should be module-scope constants. The runtime occasionally has these (e.g. `excerpt(html)`'s 100-char limit in `toElement.ts`); flag them.
- **Unclear naming**: Flag variables / functions with ambiguous names. Note that `fromEl` / `toEl` in `mount.ts` are morphdom convention — leave those alone.
- **Missing context comments**: kerf's style is to keep comments for *why*, not *what*. A long comment block explaining a design decision (e.g. the `Symbol.for` brand block in `jsx-runtime.ts`) is a feature; a comment that paraphrases the next line is noise. Flag both: missing-when-needed AND noise-when-not-needed.

### 3. Maintenance Complexity
- **Coupling**: kerf modules should be near-orthogonal, with a few deliberate hubs. Derive the current graph rather than matching a list: `grep -rhoE "from '\./[a-z-]*" src/*.ts | sort | uniq -c | sort -rn`. Expect `dev-warn-config` and `dev-hooks` at the top (the switch layer and the hook registry — every `dev-*` module reads them by design), plus the list-reconcile family's internal edges. Flag an edge that crosses concerns for no stated reason, not merely a high-degree node.
- **Shared mutable state**: CLAUDE.md **Design rule 5** is the source of truth — read it, do not rely on a count quoted here. It enumerates the sanctioned locations AND a separate not-counted list (pure caches with GC-tied lifetimes, observability-only counters, dev-only one-shot flags). Sweep with `grep -rnE '^let |^export let ' src/` and flag only what falls outside BOTH lists. Rule 5 derives its force from being exhaustive, so a hit outside both is a finding even when the code is fine — it means the rule needs updating.
- **Callback chains / Promise chains**: kerf is synchronous; effects run sync, no schedulers. Flag any introduction of async logic that isn't isolated to a single test or example.
- **Switch / if-else chains**: Flag complex branching. `toSegment` in `jsx-runtime.ts` has a chain of if/else-if for child-type discrimination — that's appropriate. Flag any chain > 6 branches without a lookup-table refactor.
- **Duplicate patterns**: Code that does the same thing in slightly different ways. Use `grep` to spot-check.

### 4. Defensive Coding
- **Input validation at boundaries**: kerf's "boundary" is its public API. Verify each public function rejects malformed input with an informative error rather than silently misbehaving:
  - `delegate` / `delegateCapture`: `assertValidSelector` throws on bad selectors at registration.
  - `jsx` / `Fragment`: `toSegment` and `renderAttr` throw on unsupported child / attribute value types; `assertEmittableAttrName` rejects `on*` and malformed attribute names on both the static and signal-bound paths.
  - `mount`: relies on TS types — flag if the runtime should be defensive against `null` rootEl.
  - `toElement`: throws on empty input, parse errors, zero-element results.
- **Error boundaries**: Are exceptions caught where appropriate? `morph.ts:preserveTextEntryState` wraps `setSelectionRange` in try/catch (some input types reject the API); that is the kind of selective catch we want. Flag any blanket `try { ... } catch { /* swallow */ }` without a reason.
- **Null safety**: Are optional values checked before use? With `strict: true` in tsconfig, the compiler usually catches this. Flag any `!` non-null assertion in `src/` (tests get a pass).
- **Type safety**: Are `any` types used where specific types would be safer? Grep `src/` for `: any\b`, `as any\b`, `<any>`. The pattern in kerf is `unknown` plus a type guard (`isSafeHtml`). Flag any `any`.
- **XSS surface**: kerf's whole job is to escape HTML. `escapeHtml` and `escapeAttr` should cover `&`, `<`, `>`, `"`, and (for attrs) `'`. Verify the escapers haven't drifted.

## Report Format

For each finding:
- **File**: path and line numbers
- **Category**: standardization | readability | maintenance | defensive
- **Severity**: high | medium | low
- **Description**: what the issue is
- **Suggestion**: how to fix it

End with a prioritized summary of the top 10 most impactful improvements (or fewer — kerf is small, expect 0–5 in a healthy state). Suggest filing Hot Sheet tickets (`hs-task` for cleanups, `hs-bug` for real defects) for any non-trivial finding.
