#!/usr/bin/env bash
#
# Non-interactive beta release. Mirrors `npm run release:beta` (which runs
# `scripts/release.sh --beta`) but answers every prompt automatically so it
# can be invoked from automation (or by Claude when the user says "push a
# beta").
#
# Why a separate script instead of piping into release.sh?
# The interactive script has multiple `read`-driven branches (version-bump
# menu, "use this text?" confirms, "proceed with this BETA release?" confirm,
# resume-from-state prompts) that can't be cleanly answered with echo-pipes —
# answers depend on the run's saved `.release-state.json` which would need to
# be pre-stubbed. Cleaner to re-implement the beta path here than to bend the
# interactive script into something it isn't.
#
# What this script does — matches `release.sh --beta` exactly:
#   1. Preflight: working tree must be clean; must be on main/master.
#      (Skips the `npm whoami` check the interactive script does — beta
#      releases publish via GitHub Actions' NPM_TOKEN in release.yml, not the
#      local user's credentials, so a local npm login isn't required for the
#      tag-and-push path.)
#   2. Read the target version. Beta tags target the upcoming stable version;
#      CI (release.yml) bumps package.json ephemerally at publish time. If the
#      current package.json version is already a stable tag, target next-minor;
#      otherwise package.json IS the upcoming target. Override with --version.
#   3. Draft release notes with gitgist (the same tool release.sh uses) over
#      `<lastTag>..HEAD`: AI draft, then gitgist `--no-ai` deterministic
#      grouping, then a `git log` pointer. Override with `--notes <file>` /
#      `--notes-stdin`.
#   4. Run `npm run check` — kerf's canonical green-gate (lint + typecheck +
#      doc/coverage checks + unit/integration tests + build + bundle-size +
#      both dist suites + the jsx-typing/examples/scaffold typing gates). This
#      is the same gate the pre-commit hook runs. Skip with --skip-checks.
#   5. Auto-increment the beta number: find the highest existing
#      `v<version>-beta.N` tag and pick N+1. Same logic as the interactive
#      `step_beta_tag_and_push`.
#   6. Annotated git tag with the release notes as the message; push the tag
#      (NOT a commit — beta mode skips version-file bumps + the release commit).
#
# What CI does on push of the tag — release.yml (triggers on `v*-beta.*`; see
# the `detect` job's is_beta branch):
#   1. Re-runs tests + lint + build verification.
#   2. Publishes kerfjs@<version>-beta.N to npm with `--tag beta --provenance`
#      (does NOT promote to `@latest`).
#   3. Creates a GitHub Release flagged prerelease: true so anyone tracking
#      releases/latest (which GitHub auto-filters past prereleases) is unaffected.
#
# To install the beta:  npm install kerfjs@beta
#
# To revert a beta tag (if a release is botched before CI completes):
#   git tag -d v<version>-beta.N
#   git push origin :refs/tags/v<version>-beta.N
#
# Exit codes:
#   0 — beta tag pushed (or --dry-run completed); CI is running.
#   1 — preflight failure (dirty tree, wrong branch, missing tools).
#   2 — local checks failed (`npm run check`).
#   3 — git tag or push failed (often: tag already exists, or upstream
#       rejected — usually means we need to pull first).
#
set -euo pipefail

# --- Colors (stripped on non-tty for log readability) ---
if [[ -t 1 ]]; then
  BOLD="\033[1m"; DIM="\033[2m"; GREEN="\033[32m"; YELLOW="\033[33m"
  RED="\033[31m"; CYAN="\033[36m"; RESET="\033[0m"
else
  BOLD=""; DIM=""; GREEN=""; YELLOW=""; RED=""; CYAN=""; RESET=""
fi
info()    { echo -e "${CYAN}${BOLD}>>>${RESET} $1"; }
success() { echo -e "${GREEN}${BOLD}>>>${RESET} $1"; }
warn()    { echo -e "${YELLOW}${BOLD}>>>${RESET} $1"; }
error()   { echo -e "${RED}${BOLD}>>>${RESET} $1" >&2; }

# --- Preflight ---
preflight() {
  info "Preflight..."

  if [[ ! -f "package.json" ]]; then
    error "No package.json — run from the project root."
    exit 1
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    error "Working tree is dirty. Commit or stash before running a beta."
    git status --short >&2
    exit 1
  fi

  local branch
  branch=$(git branch --show-current)
  if [[ "$branch" != "main" && "$branch" != "master" ]]; then
    error "Current branch is '${branch}', not main/master. Refusing to push a beta from a side branch."
    exit 1
  fi

  if ! command -v node >/dev/null; then
    error "node not found on PATH."
    exit 1
  fi

  # Fetch tags from origin before read_version / draft_release_notes /
  # tag_and_push read the local tag list. A stale local clone would (a) compute
  # the wrong "previous tag" anchor for the notes diff, (b) auto-increment to a
  # beta number the remote already holds (causing the subsequent push to fail).
  # Intentionally NOT --prune-tags (would delete local-only unpushed tags).
  # Failure is non-fatal (offline / network blip): proceed with local state and
  # let the downstream push surface any conflict.
  info "Fetching tags from origin..."
  if ! git fetch --tags origin 2>/dev/null; then
    warn "git fetch --tags failed (offline?) — proceeding with local tag list."
  fi

  success "Preflight clean (branch=${branch}, tree clean)"
}

# --- Steps ---
read_version() {
  # Betas target the upcoming X.Y.0 release, not the current X.Y.Z. Explicit
  # override via `--version X.Y.Z` for the rare case where the upcoming release
  # is a patch / major / custom.
  #
  # If package.json points at a version that hasn't shipped as a stable tag
  # yet, package.json IS the upcoming target. Otherwise next-minor.
  if [[ -n "${OVERRIDE_VERSION:-}" ]]; then
    VERSION="$OVERRIDE_VERSION"
    info "Target version (from --version): ${BOLD}${VERSION}${RESET}"
    return
  fi

  local current
  current=$(node -p "require('./package.json').version")

  local target
  if git rev-parse "v${current}" >/dev/null 2>&1; then
    # Current is already a stable tag — package.json hasn't been bumped yet.
    # Pick next-minor.
    local major minor patch
    IFS='.' read -r major minor patch <<< "$current"
    target="${major}.$((minor + 1)).0"
    info "Current package.json (${current}) is already a stable tag — targeting next minor: ${BOLD}${target}${RESET}"
  else
    # Current isn't a stable tag yet — package.json IS the upcoming target.
    target="$current"
    info "Current package.json (${target}) is not yet a stable tag — targeting it directly"
  fi

  VERSION="$target"
  info "Beta tag will be ${BOLD}v${VERSION}-beta.N${RESET} for the next free N"
}

# Prefer the locally-installed binary (devDependency), then a PATH gitgist.
# Echoes the resolved command, or nothing if gitgist isn't available.
resolve_gitgist() {
  if [[ -x "node_modules/.bin/gitgist" ]]; then
    echo "node_modules/.bin/gitgist"
  elif command -v gitgist >/dev/null; then
    echo "gitgist"
  fi
}

draft_release_notes() {
  # Draft notes with gitgist — the same engine release.sh uses — over the commit
  # range since the last tag. gitgist owns the prompt, the AI-provider selection,
  # code-fence stripping, and noise filtering, and honors the `gitgist.exclude`
  # globs in package.json (generated mirrors, synced docs, bench imports).
  #
  # Fallback chain: gitgist AI draft -> gitgist `--no-ai` deterministic grouping
  # -> a bare `git log` pointer. The `--no-ai` rung means notes never collapse to
  # "see git log" just because no AI provider was reachable.
  #
  # `--notes <file>` / `--notes-stdin` short-circuit gitgist entirely, for callers
  # that already have notes drafted and don't want to spawn a nested model call.
  if [[ -n "${NOTES_OVERRIDE:-}" ]]; then
    NOTES="$NOTES_OVERRIDE"
    info "Using release notes from ${BOLD}${NOTES_SOURCE_LABEL}${RESET}:"
    echo "$NOTES" | sed 's/^/    /'
    echo ""
    return
  fi

  # Beta notes anchor at the most recent tag (beta or stable) — they're
  # incremental and shouldn't repeat bullets from an earlier beta.
  local last_tag range
  last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  range="${last_tag:+${last_tag}..HEAD}"
  local pointer="- See \`git log ${range:-HEAD}\` for details."

  local gitgist
  gitgist=$(resolve_gitgist)
  if [[ -z "$gitgist" ]]; then
    warn "'gitgist' not found (run 'npm install' — it's a devDependency). Using a git-log pointer."
    NOTES="$pointer"
    return
  fi

  info "Drafting release notes with gitgist (${range:-since last tag})..."
  # gitgist exits non-zero on failure and prints nothing to stdout. We still
  # guard against its "_No commits…_" sentinel becoming the tag body.
  local errfile generated
  errfile=$(mktemp "${TMPDIR:-/tmp}/gitgist-beta-auto.XXXXXX")
  generated=$("$gitgist" ${range:+"$range"} 2>"$errfile" || true)
  [[ "$generated" == _No\ * ]] && generated=""

  # Fall back to gitgist's deterministic (no-AI) grouping if the AI draft failed
  # or no provider was available — better than a bare log pointer.
  if [[ -z "$generated" ]]; then
    warn "gitgist AI draft empty/failed — trying deterministic (--no-ai) grouping."
    [[ -s "$errfile" ]] && warn "  $(tail -1 "$errfile" 2>/dev/null)"
    generated=$("$gitgist" ${range:+"$range"} --no-ai 2>/dev/null || true)
    [[ "$generated" == _No\ * ]] && generated=""
  fi
  rm -f "$errfile"

  NOTES="${generated:-$pointer}"

  echo ""
  echo -e "    ${DIM}Drafted notes:${RESET}"
  echo "$NOTES" | sed 's/^/    /'
  echo ""
}

run_local_checks() {
  if [[ "${SKIP_CHECKS:-false}" == "true" ]]; then
    warn "Skipping local checks (--skip-checks). Use only when you've verified 'npm run check' passes elsewhere. CI re-runs everything on tag-push regardless."
    return
  fi

  info "Running the full green-gate (npm run check)..."
  npm run check || { error "'npm run check' failed. Fix the failures above, or re-run with --skip-checks if you've validated the tree some other way (CI re-runs on push regardless)."; exit 2; }
  echo ""
  success "All local checks passed"
}

tag_and_push() {
  # Same auto-increment logic as release.sh::step_beta_tag_and_push.
  local n=1
  while git rev-parse "v${VERSION}-beta.${n}" >/dev/null 2>&1; do
    n=$((n + 1))
  done
  BETA_TAG="v${VERSION}-beta.${n}"

  if [[ "${DRY_RUN:-false}" == "true" ]]; then
    echo ""
    success "Dry run complete — would create + push ${BOLD}${BETA_TAG}${RESET} (commit $(git rev-parse --short HEAD)) with the drafted notes."
    info "Re-run without --dry-run to cut the beta."
    return
  fi

  info "Creating tag ${BOLD}${BETA_TAG}${RESET} with the drafted release notes..."
  # Annotated tag, notes as the message. `--cleanup=verbatim` is REQUIRED: git
  # tag defaults to `--cleanup=strip`, which drops every line beginning with `#`
  # as a comment — silently deleting the `##`/`###` markdown headings gitgist
  # emits. The GitHub Release body is built from the tag message, so a stripped
  # heading is a lost section label in the published notes.
  echo -e "$NOTES" | git tag -a "$BETA_TAG" --cleanup=verbatim -F - || { error "git tag -a failed."; exit 3; }

  info "Pushing tag to origin..."
  git push origin "$BETA_TAG" || {
    error "git push failed. Tag exists locally but not on origin."
    error "To retry after fixing: git push origin ${BETA_TAG}"
    error "To unwind: git tag -d ${BETA_TAG}"
    exit 3
  }

  echo ""
  success "Beta tag ${BOLD}${BETA_TAG}${RESET} pushed."
  echo ""
  echo -e "  ${DIM}CI (release.yml) is now:${RESET}"
  echo -e "    1. Re-running tests, lint, build verification."
  echo -e "    2. Publishing kerfjs@${VERSION}-beta.${n} to npm with --tag beta --provenance."
  echo -e "    3. Creating a GitHub Release flagged ${BOLD}prerelease: true${RESET}."
  echo ""
  echo -e "  ${DIM}Install via:${RESET}  npm install kerfjs@beta"
  echo ""
  echo -e "  ${DIM}Monitor:${RESET} https://github.com/brianwestphal/kerf/actions"
}

# --- Argv parsing ---
# Supports: --version X.Y.Z (override the auto-derived target version),
# --skip-checks (bypass `npm run check`), --dry-run (everything except the tag),
# --notes <file> / --notes-stdin (supply pre-drafted notes and skip gitgist).
# All other args are rejected so a typo doesn't silently fall through into a
# default beta release.
OVERRIDE_VERSION=""
SKIP_CHECKS="false"
DRY_RUN="false"
NOTES_OVERRIDE=""
NOTES_SOURCE_LABEL=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      OVERRIDE_VERSION="${2:-}"
      if [[ -z "$OVERRIDE_VERSION" ]]; then
        error "--version requires a value (e.g. --version 4.2.0)"
        exit 1
      fi
      shift 2
      ;;
    --version=*)
      OVERRIDE_VERSION="${1#--version=}"
      shift
      ;;
    --skip-checks|--skip-tests)
      SKIP_CHECKS="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --notes)
      if [[ -z "${2:-}" ]]; then
        error "--notes requires a file path (e.g. --notes /tmp/notes.md). Use --notes-stdin to read from stdin."
        exit 1
      fi
      if [[ ! -f "$2" ]]; then
        error "--notes file not found: $2"
        exit 1
      fi
      NOTES_OVERRIDE=$(cat "$2")
      NOTES_SOURCE_LABEL="--notes $2"
      shift 2
      ;;
    --notes=*)
      notes_path="${1#--notes=}"
      if [[ ! -f "$notes_path" ]]; then
        error "--notes file not found: $notes_path"
        exit 1
      fi
      NOTES_OVERRIDE=$(cat "$notes_path")
      NOTES_SOURCE_LABEL="--notes=$notes_path"
      shift
      ;;
    --notes-stdin)
      NOTES_OVERRIDE=$(cat)
      NOTES_SOURCE_LABEL="--notes-stdin"
      shift
      ;;
    -h|--help)
      cat <<EOF
Usage: bash scripts/release-beta-auto.sh [--version X.Y.Z] [--skip-checks] [--dry-run] [--notes <file> | --notes-stdin]

Non-interactive beta release for kerf. Matches \`npm run release:beta\` without
prompts. By default targets the upcoming X.Y.0 (next minor from current
package.json) unless package.json is already ahead of the latest stable tag, in
which case the current version is used directly. Override with --version to
point at an explicit upcoming release.

The local gate is \`npm run check\` (the same pre-commit gate: lint, typecheck,
doc/coverage checks, unit + integration tests, build, bundle-size, both dist
suites, and the typing gates). Pass --skip-checks to bypass it after you've
validated the tree some other way. CI re-runs everything on tag-push regardless.

Release notes are drafted by gitgist (the tool the interactive release uses)
over <lastTag>..HEAD — AI draft, then gitgist --no-ai, then a git-log pointer.
Pass --notes <file> (or --notes-stdin) to supply pre-drafted notes and skip
gitgist entirely.

--dry-run does everything EXCEPT create and push the tag (preflight, version,
notes, checks) so you can verify a release before committing to it.

Examples:
  npm run release:beta:auto
  npm run release:beta:auto -- --version 4.2.0
  npm run release:beta:auto -- --version 4.2.0 --dry-run
  npm run release:beta:auto -- --skip-checks
  npm run release:beta:auto -- --notes /tmp/notes.md
  echo "- fix bug X" | npm run release:beta:auto -- --notes-stdin
EOF
      exit 0
      ;;
    *)
      error "Unrecognized arg: $1"
      error "Usage: bash scripts/release-beta-auto.sh [--version X.Y.Z] [--skip-checks] [--dry-run] [--notes <file> | --notes-stdin]"
      exit 1
      ;;
  esac
done

# --- Main ---
echo ""
echo -e "${BOLD}  kerf Beta — auto/non-interactive${RESET}"
[[ "${DRY_RUN:-false}" == "true" ]] && echo -e "  ${DIM}--dry-run: no tag will be created or pushed.${RESET}"
echo ""

preflight
read_version
draft_release_notes
run_local_checks
tag_and_push
