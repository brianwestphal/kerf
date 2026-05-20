# `kerfjs/ai-assistant-configs`

Check that the [kerf-app Claude Code skill](https://github.com/brianwestphal/kerf/blob/main/kerf.claude-skill.md) and [Cursor rules](https://github.com/brianwestphal/kerf/blob/main/kerf.cursorrules) drop-ins are installed in the project and up-to-date with the canonical files bundled inside the consumer's installed `kerfjs` package.

Unlike the four AST-only rules in this plugin, this rule reads the **filesystem**, not source code. It runs once per lint pass and reports project-level hygiene issues rather than per-file code defects. Severity in `kerfjs.configs.recommended` is `warn`, not `error` — a missing skill file shouldn't fail CI.

Maps to design doc [`docs/12-ai-assistant-configs.md`](https://github.com/brianwestphal/kerf/blob/main/docs/12-ai-assistant-configs.md) §12.4.

## What it checks

The rule resolves `kerfjs/ai/manifest.json` from the consumer's installed `kerfjs` (silently no-ops if `kerfjs` isn't a dep). For each bundled file, it picks a trigger heuristic — "is this project using the tool this file is for?" — and only nudges the consumer when the trigger says yes:

| Bundled file | Triggers when | Installed to |
|---|---|---|
| `ai/skill.md` (Claude Code) | `.claude/` directory exists at the project root | `.claude/skills/kerf-app/SKILL.md` |
| `ai/cursorrules` (Cursor) | `.cursorrules` file or `.cursor/` directory exists | `.cursorrules` |

A triggered file is then classified into one of three reported states (a fourth, "up-to-date," is silent):

- **Missing** — the consumer's `dest` doesn't exist.
- **Stale** — exists, parses cleanly, but its `kerf-skill-version` line is older than the bundle's.
- **Forked** — the consumer's file no longer matches the canonical layout: marker is missing, marker appears more than once, `kerf-skill-version` line is missing, or the content above the marker has been edited.

## ❌ Reported

```
$ eslint .

src/index.ts
  1:1  warning  Claude Code kerf-app skill drop-in at `.claude/skills/kerf-app/SKILL.md`
               is stale (have 1.0.0, latest is 1.1.0). Run `eslint --fix` to update
               the canonical section above the `KERF-APP-CANONICAL-END` marker; your
               customizations below the marker are preserved.
               kerfjs/ai-assistant-configs
```

The warning attaches to whichever source file ESLint happens to lint first — it's a project-level report, not a code-level one. The message text makes that clear.

## ✅ Auto-fix

```bash
$ eslint --fix .
```

For **missing** files, `--fix` copies the bundled canonical (`node_modules/kerfjs/ai/skill.md` / `node_modules/kerfjs/ai/cursorrules`) to the consumer's `dest` path, creating any missing parent directories.

For **stale** files, `--fix` replaces only the content **above and including the `KERF-APP-CANONICAL-END` marker**. Everything below the marker — the consumer's append zone — is preserved byte-for-byte. This is the "versioned-section preservation" strategy from the design doc.

The `fix()` callback writes to a file OTHER than the linted source — unusual for an ESLint rule. ESLint only invokes `fix()` under `--fix`, so the side effect is opt-in by definition; plain `eslint` will report the warning without touching disk.

## ❗ Forked — no auto-fix

If the consumer has edited the file in a way that breaks the canonical/append-zone contract, the rule refuses to auto-fix. It reports the specific shape mismatch instead:

- **No marker present.** The file pre-dates the marker convention, the consumer deleted the marker, or the file is a hand-written variant. Auto-fixing would either clobber legitimate customizations or leave the file in an ambiguous state.
- **Multiple markers.** A well-formed file has exactly one. Auto-fix would have to guess which boundary is real.
- **No `kerf-skill-version` line.** The staleness signal is missing; we can't tell what's there.
- **Content above the marker has been edited.** The contract is "above the marker is kerf's; below is yours." Above-the-marker edits are a deliberate fork.

Resolution: either restore the canonical layout (move customizations below a freshly-inserted marker, delete extras, re-add the version line) or disable the rule for this project — `'kerfjs/ai-assistant-configs': 'off'` in `eslint.config.js`.

## Options

```js
// eslint.config.js — disable both checks
{ rules: { 'kerfjs/ai-assistant-configs': 'off' } }

// Disable only one tool's check
{ rules: { 'kerfjs/ai-assistant-configs': ['warn', { claude: false }] } }
{ rules: { 'kerfjs/ai-assistant-configs': ['warn', { cursor: false }] } }
```

Both `claude` and `cursor` default to `true`. Setting either to `false` makes that specific drop-in silent regardless of trigger state.

## What this rule does NOT do

- It does not install the configs at `npm install` time — there are no postinstall scripts. The first lint pass after `npm install kerfjs` surfaces the recommendation.
- It does not write to disk under plain `eslint` (no `--fix`). The warning is emitted; nothing changes on disk.
- It does not push Claude Code or Cursor on consumers who haven't signalled they use them — no `.claude/` or `.cursor*` ⇒ silent.
- It does not validate the *content* of the canonical files in the bundle. That's the kerf maintainer's responsibility (and the `check:ai-bundle-in-sync` gate in the kerf repo).
