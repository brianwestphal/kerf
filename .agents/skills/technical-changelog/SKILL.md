---
name: technical-changelog
description: Generate a diff-grounded, one-page technical changelog for a release from the real code changes between the last production tag and HEAD, with measured numbers and every claim verified against the base tree; asks for the next version when it cannot be inferred.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

<!-- ai-playbook:skill name=technical-changelog v=1 -->

Produce a **one-page technical report** of what changed for a release and store it where the
project keeps release documents (`docs/technical-changelog/<base>-<next>.md` unless the docs
index names another place). The report is grounded in the **real diff**: added, modified, and
removed code, export and dependency deltas, measured test and coverage figures. It is never
written from commit messages, `CHANGELOG.md`, or the requirements docs; those describe the end
state and the whole feature history, so they routinely credit a range with work that predates
it or describe posture that was already true. Every claim is a verified delta between the base
tag and HEAD.

## Two facts that make this skill necessary

1. **HEAD may be the next, unreleased version.** Some release scripts bump the manifest before
   tagging, so the manifest often already holds the upcoming number; others bump at tag time.
   Check whether `v<manifest version>` is already a tag: if it is, the manifest holds the *last
   released* version and you must ask for the next one; if it is not, the manifest *is* the
   upcoming release. Say which case you hit.
2. **The base is the most recent production tag** and the range is `<base>..HEAD`. Pre-release
   tags (`-beta.N`, `-rc.N`) are never the base. If the repository has no production tag, the
   base is the root commit; say so, because then everything is new and the report is an
   initial-release summary.

## Steps

1. **Establish the version and the base.** Read the version from the project's manifest
   (`package.json`, `Cargo.toml` `[package]`, `pyproject.toml`, a `VERSION` file) or, for a
   tag-only project, from the tags alone.

   ```bash
   version=<read it from the manifest>
   if git rev-parse "v$version" >/dev/null 2>&1; then
     echo "v$version is already tagged: ask for the next version"
   fi
   base=$(git describe --tags --abbrev=0 --match 'v*' --exclude='*-*' 2>/dev/null \
          || git rev-list --max-parents=0 HEAD)
   echo "base=$base range=${base}..HEAD commits=$(git rev-list --count "${base}..HEAD")"
   ```

   When the next version cannot be inferred, ask (`AskUserQuestion` in an interactive session,
   a `FEEDBACK NEEDED` note on the ticket otherwise). Do not guess.

2. **Bucket the line delta by area.** Derive the areas from the top-level directories; the raw
   total is inflated by docs and agent scaffolding, so never present it as engineering effort:

   ```bash
   for area in $(git ls-tree -d --name-only HEAD) .github .claude .agents .codex .rulesync .hotsheet2; do
     printf '%-14s %s\n' "$area" "$(git diff --shortstat "${base}..HEAD" -- "$area" 2>/dev/null || echo '-')"
   done
   git diff --shortstat "${base}..HEAD" -- <product directories only>
   ```

   Label `docs` and the `.claude`, `.agents`, `.codex`, `.rulesync`, and `.hotsheet2`
   scaffolding as non-engineering.

3. **List added and removed files**, the honest signal for "new subsystem":

   ```bash
   git diff --diff-filter=A --name-only "${base}..HEAD"
   git diff --diff-filter=D --name-only "${base}..HEAD"
   ```

4. **Extract the public-surface deltas.** The codebase map names the entry points; typical
   ones are the export barrel, CLI options and exit codes, HTTP routes, schema and file-format
   definitions, and the dependency manifest:

   ```bash
   git diff "${base}..HEAD" -- <barrel or public API file>
   git diff "${base}..HEAD" -- <cli args file> | grep -E '^[+-].*--[a-z-]+' | head -40
   git diff "${base}..HEAD" -- <manifest> | grep -E '^[+-]' | grep -viE 'version|lock'
   ```

   A dependency change is headline material when the project documents a dependency
   invariant (zero runtime dependencies, a pinned toolchain).

5. **Read the real diffs; do not stop at the summaries.** The commands above say where to
   look; the narrative comes from the changes themselves (`git diff "${base}..HEAD" -- <path>`).
   Verify every "new" claim against the base tree rather than trusting a commit subject:

   ```bash
   git cat-file -e "${base}:<file>"                 # non-zero exit: genuinely new
   git show "${base}:<file>" | grep -c '<symbol>'   # 0: added in range
   git ls-tree -r --name-only "$base" -- <dir>
   ```

   Classic traps: a module that looks new but existed at the base; a feature added and removed
   within the same range (nets to zero; say so); posture that was already true at the base
   (baseline, not a change); a default that changed in two hops (report the full base-to-HEAD
   delta).

6. **Measure, never quote.** Any number that is not a line delta comes from a real run of the
   project's own gates: unit and end-to-end test counts, coverage, build or pack size. Read the
   commands from `AGENTS.md` and the CI workflow; keep output quiet and record the summary
   lines.

7. **Write the report**, roughly one page:
   - **Header**: the range, the commit count, and whether HEAD is untagged (so the "next"
     number is a label). State that the report is derived from the diff, not from commit prose.
   - **Honest size**: the area split with a product-only total called out separately from the
     raw total; name the biggest bucket.
   - **Baseline note**: one line on what already shipped at the base, so nothing pre-existing
     reads as new.
   - **Per-change sections** for the genuine deltas, each carrying its diff evidence (new
     files, the option or route delta, "0 hits at base, present now" for behavior, measured
     test counts). Order by significance: a new flag, route, or exit code before a doc sync.
   - **Contract changes**: a dedicated section whenever exit codes, CLI options, wire shapes,
     file formats, or environment contracts changed; downstream scripts break on those.
   - **Diagrams** only when they earn their place (a new subsystem, a changed decision order),
     rendered rather than drawn in text, with labels quoted when they contain punctuation.

8. **Validate and finish.** Sanity-check any diagram syntax; re-read the draft against your
   base-tree probes and cut or relabel anything that describes the baseline. Committing
   follows the project's git rules and its declared push policy.

## Guardrails

- **Diff over prose.** If a claim is not backed by a file or line change you read, do not make
  it. Commit subjects, `CHANGELOG.md`, and the docs are leads to verify, not sources to quote.
- **Never inflate.** Lead with product-only line counts; label docs and agent scaffolding as
  non-engineering.
- **Attribute to the range only.** When unsure whether something is new, run the base-tree
  probe before writing it up.
