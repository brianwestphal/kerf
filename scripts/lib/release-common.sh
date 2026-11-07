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
