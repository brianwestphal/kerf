# shellcheck shell=bash
#
# Shared helpers for scripts/release.sh and scripts/release-beta-auto.sh.
# Source this file; do not execute it. Callers define info/success/warn/error
# before sourcing (both scripts print through them).

# Pre-flight refusals shared by every release path (the Release Scripts rule:
# refuse a dirty tree, the wrong branch, or a missing tool, and print the fix).
# Also fetches tags so tag-existence checks and beta numbering see the remote.
release_preflight_repo() {
  if [[ ! -f "package.json" ]]; then
    error "No package.json — run from the project root."
    exit 1
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    error "Working tree is dirty. Commit or remove these changes, then re-run:"
    git status --short >&2
    exit 1
  fi

  local branch
  branch=$(git branch --show-current)
  if [[ "$branch" != "main" && "$branch" != "master" ]]; then
    error "Current branch is '${branch:-detached HEAD}', not main/master. Check out main and re-run."
    exit 1
  fi

  if ! command -v node > /dev/null; then
    error "node not found on PATH. Install Node.js 22.12+ and re-run."
    exit 1
  fi

  # Intentionally NOT --prune-tags (would delete local-only unpushed tags).
  # Failure is non-fatal (offline): proceed with the local tag list and let the
  # push surface any conflict.
  info "Fetching tags from origin..."
  if ! git fetch --tags origin 2> /dev/null; then
    warn "git fetch --tags failed (offline?) — proceeding with the local tag list."
  fi
}

# Refuse a release whose tag already exists locally (after the fetch above,
# that includes origin's tags).
release_refuse_existing_tag() {
  local tag="$1"
  if git rev-parse -q --verify "refs/tags/${tag}" > /dev/null; then
    error "Tag ${tag} already exists. Choose another version, or delete an unpublished tag (git tag -d ${tag}; git push origin :refs/tags/${tag}) and re-run."
    exit 1
  fi
}

RELEASE_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create an annotated tag whose message is the notes, byte for byte.
# - printf, not `echo -e`: notes are user text, and a literal `\n` or `\t` in
#   a code span must not turn into a control character.
# - `--cleanup=verbatim` is REQUIRED: git tag defaults to `--cleanup=strip`,
#   which drops every line beginning with `#` — the `##`/`###` Markdown
#   headings gitgist emits. The GitHub Release body is built from the tag
#   message, so a stripped heading is a lost section label.
release_tag_with_notes() {
  local tag="$1" notes="$2"
  printf '%s\n' "$notes" | git tag -a "$tag" --cleanup=verbatim -F -
}

# Prefer the locally-installed binary (devDependency), then a PATH gitgist.
# Echoes the resolved command, or nothing if gitgist isn't available.
release_resolve_gitgist() {
  if [[ -x "node_modules/.bin/gitgist" ]]; then
    echo "node_modules/.bin/gitgist"
  elif command -v gitgist > /dev/null; then
    echo "gitgist"
  fi
}

# Draft release notes for a commit range (empty = gitgist's default, latest
# tag to HEAD) and print them on stdout. Chain: gitgist AI draft, then gitgist
# `--no-ai` deterministic grouping. Prints nothing when gitgist is missing or
# both rungs fail; the caller picks the final fallback. Diagnostics go to
# stderr so a command substitution captures only the notes.
release_gitgist_draft() {
  local range="${1:-}" gitgist errfile generated
  gitgist=$(release_resolve_gitgist)
  if [[ -z "$gitgist" ]]; then
    warn "'gitgist' not found (run 'npm install' — it's a devDependency)." >&2
    return 0
  fi

  errfile=$(mktemp "${TMPDIR:-/tmp}/kerf-gitgist.XXXXXX")
  generated=$("$gitgist" ${range:+"$range"} 2> "$errfile" || true)
  # Guard against gitgist's "_No commits…_" sentinel becoming the notes.
  [[ "$generated" == _No\ * ]] && generated=""
  if [[ -z "$generated" ]]; then
    warn "gitgist AI draft empty/failed — trying deterministic (--no-ai) grouping." >&2
    if [[ -s "$errfile" ]]; then
      warn "  $(tail -1 "$errfile" 2> /dev/null)" >&2
    fi
    generated=$("$gitgist" ${range:+"$range"} --no-ai 2> /dev/null || true)
    [[ "$generated" == _No\ * ]] && generated=""
  fi
  rm -f "$errfile"
  printf '%s' "$generated"
}

# Plan the next beta with scripts/lib/release-beta-plan.mjs: continue the
# highest active prerelease series at or beyond the package-derived target and
# take one more than its highest beta number. With an explicit version, plan
# that version's next beta. Sets RELEASE_BETA_VERSION, RELEASE_BETA_TAG,
# RELEASE_BETA_SOURCE, and RELEASE_BETA_PREVIOUS.
release_plan_beta() {
  local override="${1:-}" current current_is_stable="false" plan
  current=$(node -p "require('./package.json').version")
  if git rev-parse -q --verify "refs/tags/v${current}" > /dev/null; then
    current_is_stable="true"
  fi
  plan=$(git tag --list 'v*-beta.*' | node "${RELEASE_LIB_DIR}/release-beta-plan.mjs" "$current" "$current_is_stable" "$override")
  IFS=$'\t' read -r RELEASE_BETA_VERSION RELEASE_BETA_TAG RELEASE_BETA_SOURCE RELEASE_BETA_PREVIOUS <<< "$plan"
}
