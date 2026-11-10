#!/usr/bin/env bash
set -euo pipefail

# Interactive release flow for kerf. Adapted from Hot Sheet's release script.
#
# Usage:
#   bash scripts/release.sh           — full stable release (bumps version,
#                                       updates changelog, commits, tags
#                                       v{ver}, pushes; CI publishes to npm).
#   bash scripts/release.sh --beta    — beta tag-only flow (does NOT bump
#                                       version files, does NOT update
#                                       changelog, does NOT commit; just
#                                       tags v{ver}-beta.{N} off HEAD; CI
#                                       publishes with --tag beta). The
#                                       version and N come from the same
#                                       plan release-beta-auto.sh uses:
#                                       continue the highest beta series,
#                                       N = highest + 1.
#   bash scripts/release.sh --dry-run --version X.Y.Z --notes <file>
#                                    — noninteractive stable plan + current-tree
#                                       checks; no release state or metadata writes,
#                                       tag creation/fetch, commits, or pushes.
#
# Editor guidance lines start with `%%`, which Markdown never uses, so the
# notes' own `##` headings survive. Shared helpers: scripts/lib/release-common.sh.

# --- Config ---
STATE_FILE=".release-state.json"

# --- Colors ---
BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
CYAN="\033[36m"
RESET="\033[0m"

# --- Helpers ---
info() { echo -e "${CYAN}${BOLD}>>>${RESET} $1"; }
success() { echo -e "${GREEN}${BOLD}>>>${RESET} $1"; }
warn() { echo -e "${YELLOW}${BOLD}>>>${RESET} $1"; }
error() { echo -e "${RED}${BOLD}>>>${RESET} $1" >&2; }

# shellcheck source=scripts/lib/release-common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/release-common.sh"

confirm() {
  local prompt="$1"
  local response
  echo -en "${CYAN}${BOLD}>>>${RESET} ${prompt} ${DIM}[y/N]${RESET} "
  read -r response
  [[ "$response" =~ ^[Yy]$ ]]
}

resolve_editor() {
  if [[ -n "${EDITOR:-}" ]]; then
    echo "$EDITOR"
    return
  fi
  if [[ -n "${VISUAL:-}" ]]; then
    echo "$VISUAL"
    return
  fi
  for cmd in nano vim vi; do
    if command -v "$cmd" &> /dev/null; then
      echo "$cmd"
      return
    fi
  done
  echo ""
}

ask_multiline() {
  local key="$1"
  local prompt="$2"
  local initial="${3:-}"
  local prev
  prev=$(get_state "$key")

  if [[ -n "$prev" ]]; then
    initial="$prev"
  fi

  local editor
  editor=$(resolve_editor)
  if [[ -z "$editor" ]]; then
    error "No editor found. Set \$EDITOR and try again."
    exit 1
  fi

  local tmpfile
  tmpfile=$(mktemp "${TMPDIR:-/tmp}/kerf-release-notes.XXXXXX")
  trap "rm -f '$tmpfile'" RETURN

  if [[ -n "$initial" ]]; then
    printf '%s\n' "$initial" > "$tmpfile"
  fi

  while true; do
    info "${prompt} ${DIM}(opening ${editor##*/})${RESET}"
    $editor "$tmpfile"

    # Strip guidance lines (`%%` prefix; Markdown `#` headings are notes
    # content and must survive), then trailing blanks. grep exits 1 when every
    # line was guidance, which must read as "empty", not abort under pipefail.
    REPLY=$({ grep -v '^%%' "$tmpfile" || true; } | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}')

    if [[ -z "$REPLY" ]]; then
      warn "Release notes are empty."
      if ! confirm "Open editor again?"; then
        error "Aborted — release notes are required."
        exit 1
      fi
      continue
    fi

    echo ""
    echo -e "    ${DIM}Release notes:${RESET}"
    printf '%s\n' "$REPLY" | sed 's/^/    /'
    echo ""

    if confirm "Use this text?"; then
      break
    fi
    printf '%s\n' "$REPLY" > "$tmpfile"
  done

  set_state "$key" "$REPLY"
}

# --- State management ---
init_state() {
  if [[ ! -f "$STATE_FILE" ]]; then
    echo '{}' > "$STATE_FILE"
  fi
}

get_state() {
  node -e "
    const s = JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));
    process.stdout.write(s[process.argv[1]] || '');
  " "$1" 2> /dev/null || echo ""
}

set_state() {
  node -e "
    const fs = require('fs');
    const s = JSON.parse(fs.readFileSync('$STATE_FILE','utf8'));
    s[process.argv[1]] = process.argv[2];
    fs.writeFileSync('$STATE_FILE', JSON.stringify(s, null, 2));
  " "$1" "$2"
}

get_step() { get_state "_step"; }
set_step() { set_state "_step" "$1"; }
past_step() {
  local current
  current=$(get_step)
  [[ -n "$current" ]] && [[ "$current" -gt "$1" ]]
}
cleanup_state() { rm -f "$STATE_FILE"; }

# --- Pre-flight ---
preflight() {
  info "Running pre-flight checks..."

  # Dirty tree, wrong branch, missing node, stale lockfile: refuse and print
  # the fix.
  release_preflight_repo

  if ! npm whoami &> /dev/null; then
    warn "Not logged in to npm locally — that's OK if you rely on CI's OIDC publish."
  else
    local npm_user
    npm_user=$(npm whoami)
    success "Logged in to npm as ${BOLD}${npm_user}${RESET}"
  fi
}

# --- Steps ---
step_beta_version() {
  release_plan_beta ""
  case "$RELEASE_BETA_SOURCE" in
    active-beta-series) info "Continuing prerelease series ${RELEASE_BETA_PREVIOUS}: ${BOLD}${RELEASE_BETA_VERSION}${RESET}" ;;
    next-minor) info "package.json is already a stable tag — targeting next minor: ${BOLD}${RELEASE_BETA_VERSION}${RESET}" ;;
    *) info "package.json is not yet a stable tag — targeting it directly: ${BOLD}${RELEASE_BETA_VERSION}${RESET}" ;;
  esac
  info "Next beta tag (re-planned at tag time): ${BOLD}${RELEASE_BETA_TAG}${RESET}"
  set_state "version" "$RELEASE_BETA_VERSION"
}

step_version() {
  local current_version
  current_version=$(node -p "require('./package.json').version")
  info "Current version: ${BOLD}${current_version}${RESET}"

  local major minor patch
  IFS='.' read -r major minor patch <<< "$current_version"
  local next_patch="${major}.${minor}.$((patch + 1))"
  local next_minor="${major}.$((minor + 1)).0"
  local next_major="$((major + 1)).0.0"

  echo ""
  echo -e "    ${DIM}Enter)${RESET} keep   ${BOLD}${current_version}${RESET} ${DIM}(no change)${RESET}"
  echo -e "    ${DIM}1)${RESET}     patch  ${BOLD}${next_patch}${RESET}"
  echo -e "    ${DIM}2)${RESET}     minor  ${BOLD}${next_minor}${RESET}"
  echo -e "    ${DIM}3)${RESET}     major  ${BOLD}${next_major}${RESET}"
  echo -e "    ${DIM}4)${RESET}     custom"
  echo ""

  local prev_version
  prev_version=$(get_state "version")
  if [[ -n "$prev_version" && "$prev_version" != "$current_version" ]]; then
    echo -e "    ${DIM}Previous selection:${RESET} ${prev_version}"
    if confirm "Keep ${prev_version}?"; then
      REPLY="$prev_version"
      release_refuse_existing_tag "v${REPLY}"
      set_state "version" "$REPLY"
      return
    fi
  fi

  echo -en "${CYAN}${BOLD}>>>${RESET} Choose version bump ${DIM}[Enter/1/2/3/4]${RESET} "
  local choice
  read -r choice
  case "$choice" in
    "") REPLY="$current_version" ;;
    1) REPLY="$next_patch" ;;
    2) REPLY="$next_minor" ;;
    3) REPLY="$next_major" ;;
    4)
      echo -en "${CYAN}${BOLD}>>>${RESET} Enter version: "
      read -r REPLY
      ;;
    *)
      error "Invalid choice"
      exit 1
      ;;
  esac

  release_refuse_existing_tag "v${REPLY}"
  set_state "version" "$REPLY"
}

step_release_notes() {
  echo ""

  local prev
  prev=$(get_state "release_notes")
  if [[ -n "$prev" ]]; then
    ask_multiline "release_notes" "Release notes" ""
    return
  fi

  local last_tag
  last_tag=$(git describe --tags --abbrev=0 2> /dev/null || echo "")
  local log_range="${last_tag:+${last_tag}..HEAD}"

  # gitgist (https://github.com/brianwestphal/gitgist) turns the commit range
  # into themed release notes: the shared chain tries its AI draft (the
  # signed-in `claude` CLI by default), then its deterministic `--no-ai`
  # grouping, preferring the local devDependency binary. We pass the explicit
  # range when a tag exists so the boundary is unambiguous.
  info "Drafting release notes with gitgist (commits since ${last_tag:-the start})..."
  local generated
  generated=$(release_gitgist_draft "$log_range")

  local initial
  if [[ -n "$generated" ]]; then
    success "Draft ready — review and edit in the editor."
    initial="%% Release notes — gitgist draft below. Edit freely.
%% Lines starting with '%%' are removed on save; Markdown headings are kept.

${generated}"
  else
    initial="%% Release notes — keep it SHORT and USER-FACING.
%% Skip ticket IDs, refactors, tests, docs, internals.
%% Lines starting with '%%' are removed on save; Markdown headings are kept.

- "
  fi

  # Surface hand-curated `## [Unreleased]` bullets in the editor for context.
  # step_update_changelog preserves the full section in the stable entry even
  # if these bullets are omitted from the curated release notes.
  local carried
  carried=$(node -e "
    const fs = require('fs');
    const c = fs.readFileSync('CHANGELOG.md', 'utf8');
    const m = c.match(/## \[Unreleased\]([\s\S]*?)(?=\n## \[)/);
    if (m === null) process.exit(0);
    const body = m[1].split('\n').filter((l) => l.trim().startsWith('- ')).join('\n');
    process.stdout.write(body);
  " 2> /dev/null || true)
  if [[ -n "$carried" ]]; then
    initial="${initial}

%% Carried over from [Unreleased] — dedupe against the draft above:
${carried}"
  fi

  ask_multiline "release_notes" "Release notes" "$initial"
}

step_update_changelog() {
  local version notes date
  version=$(get_state "version")
  notes=$(get_state "release_notes")
  date=$(date +%Y-%m-%d)

  info "Updating CHANGELOG.md..."

  node scripts/update-release-changelog.mjs "$version" "$notes" "$date"
  npx prettier --write CHANGELOG.md

  success "CHANGELOG.md updated"
}

step_review() {
  local version notes
  version=$(get_state "version")
  notes=$(get_state "release_notes")

  echo ""
  echo -e "${BOLD}━━━ Release Summary ━━━${RESET}"
  echo ""
  echo -e "  ${DIM}Version:${RESET}  ${BOLD}${version}${RESET}"
  echo -e "  ${DIM}Notes:${RESET}"
  printf '%s\n' "$notes" | sed 's/^/    /'
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
}

step_local_checks() {
  info "Running local checks..."
  echo ""
  info "Type checking..."
  npm run typecheck
  echo ""
  info "Lint..."
  npm run lint
  echo ""
  info "Tests..."
  npm test
  echo ""
  info "Build..."
  npm run build
  echo ""
  info "UI package..."
  (cd ui && npm run check)
  echo ""
  info "ESLint plugin..."
  (cd eslint-plugin && npm test)
  echo ""
  info "Component scaffold..."
  npm run check:scaffold-catalog-schema
  (cd create-kerf-component && npm test)
  success "All local checks passed"
}

step_update_version() {
  local version
  version=$(get_state "version")
  info "Updating version to ${BOLD}v${version}${RESET}..."
  npm version "$version" --no-git-tag-version --allow-same-version
  # eslint-plugin-kerfjs releases in lockstep with kerfjs — the npm Trusted
  # Publisher rule for every package is `v*`, so a single `v{X}.{Y}.{Z}` tag
  # triggers every release workflow and every package.json version must match
  # the tag for `npm publish` to accept the OIDC token.
  (cd eslint-plugin && npm version "$version" --no-git-tag-version --allow-same-version)
  # create-kerf-component also releases in lockstep on the same `v*` tag, so its
  # package.json must match the tag for `npm publish`'s OIDC token to be accepted.
  (cd create-kerf-component && npm version "$version" --no-git-tag-version --allow-same-version)
  # @kerfjs/ui is the fourth lockstep package. Stable releases commit this
  # version; beta releases rewrite it ephemerally in the publish workflow.
  (cd ui && npm version "$version" --no-git-tag-version --allow-same-version)
  # Derive the plugin-reported version and the component-scaffold/docs ranges
  # from the new root version so these secondary surfaces cannot drift.
  node scripts/sync-lockstep-versions.mjs --write
  # The bundled AI configs at `ai/manifest.json` embed `kerfjsVersion` — re-sync
  # so the in-sync gate (which the pre-push hook runs) sees a current bundle
  # after the version bump. See docs/12-ai-assistant-configs.md §12.2.2.
  node scripts/sync-ai-bundle.mjs > /dev/null
  success "package versions and companion metadata updated; ai/ bundle re-synced"
}

step_git_commit() {
  local version
  version=$(get_state "version")
  info "Creating git commit..."
  git add package.json package-lock.json CHANGELOG.md \
    eslint-plugin/package.json eslint-plugin/package-lock.json \
    eslint-plugin/index.js \
    create-kerf-component/package.json create-kerf-component/package-lock.json \
    create-kerf-component/template/package.json \
    ui/package.json ui/package-lock.json \
    docs/13-component-packages.md site/src/content/docs/docs/component-packages.md \
    examples/reactivity-demo/package-lock.json site/package-lock.json \
    bench/kerfjs-impl/package.json \
    ai/manifest.json
  # Idempotent: if a previous run already absorbed these files into a manual
  # commit (e.g. recovery after an interrupted release commit), there's nothing
  # left to stage. Skip rather than fail under `set -e` so the tag-and-push
  # step still gets to run against the existing HEAD.
  if git diff --cached --quiet; then
    info "No staged changes — release commit already exists; skipping."
  else
    git commit -m "release: v${version}"
    success "Created release commit"
  fi
}

step_stable_tag_and_push() {
  local version
  version=$(get_state "version")
  local notes
  notes=$(get_state "release_notes")
  local tag="v${version}"

  info "Creating annotated tag ${BOLD}${tag}${RESET}..."
  release_tag_with_notes "$tag" "$notes"

  info "Pushing commit and tag to origin..."
  git push
  git push origin "$tag"

  echo ""
  success "Stable tag ${tag} pushed!"
  echo ""
  echo -e "  ${DIM}CI will:${RESET}"
  echo -e "    1. Run tests / lint / typecheck / build"
  echo -e "    2. Create a GitHub Release for ${tag}"
  echo -e "    3. Publish to npm with --provenance"
  echo ""
  echo -e "  ${DIM}Monitor:${RESET} https://github.com/brianwestphal/kerf/actions"
}

step_beta_tag_and_push() {
  local version
  version=$(get_state "version")
  local notes
  notes=$(get_state "release_notes")

  # Highest existing beta of this version + 1 (never fills a gap), planned
  # now so tags fetched since the version step count.
  release_plan_beta "$version"
  local beta_tag="$RELEASE_BETA_TAG"
  release_refuse_existing_tag "$beta_tag"

  info "Creating beta tag ${BOLD}${beta_tag}${RESET}..."
  release_tag_with_notes "$beta_tag" "$notes"

  info "Pushing beta tag to origin..."
  git push origin "$beta_tag"

  echo ""
  success "Beta tag ${beta_tag} pushed!"
  echo ""
  echo -e "  ${DIM}CI will:${RESET}"
  echo -e "    1. Run tests / lint / typecheck / build"
  echo -e "    2. Create a GitHub Release flagged ${BOLD}prerelease: true${RESET}"
  echo -e "    3. Publish to npm with --tag beta --provenance"
  echo ""
  echo -e "  ${DIM}This is a beta — there is no auto-promote.${RESET}"
  echo -e "  ${DIM}Users get it via:${RESET}  npm install kerfjs@beta"
  echo ""
  echo -e "  ${DIM}Monitor:${RESET} https://github.com/brianwestphal/kerf/actions"
}

# KF-Y9A9XE: parse before init_state so a typo cannot enter a real release.
parse_args() {
  BETA_MODE=false
  DRY_RUN=false
  SKIP_CHECKS=false
  DRY_VERSION=""
  NOTES_FILE=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --beta) BETA_MODE=true; shift ;;
      --dry-run) DRY_RUN=true; shift ;;
      --skip-checks) SKIP_CHECKS=true; shift ;;
      --version | --notes)
        if [[ -z "${2:-}" || "$2" == --* ]]; then
          error "$1 requires a value. See --help."
          exit 1
        fi
        if [[ "$1" == "--version" ]]; then DRY_VERSION="$2"; else NOTES_FILE="$2"; fi
        shift 2
        ;;
      --version=*) DRY_VERSION="${1#--version=}"; shift ;;
      --notes=*) NOTES_FILE="${1#--notes=}"; shift ;;
      -h | --help)
        cat <<'EOF'
Usage: bash scripts/release.sh [--beta]
       bash scripts/release.sh --dry-run --version X.Y.Z --notes <file> [--skip-checks]

Without --dry-run, run the existing interactive, resumable release flow.
Stable --dry-run requires an explicit version and nonempty notes file; it
validates the clean shipping checkout, lockfiles, and local tag availability,
prints the release plan, and runs current-tree local checks unless skipped.
It never writes release state or metadata, fetches/creates tags, commits,
pushes, or publishes. It does not simulate versioned package artifacts.
For a beta dry-run use scripts/release-beta-auto.sh --dry-run instead.
EOF
        exit 0
        ;;
      *) error "Unrecognized arg: $1. See --help."; exit 1 ;;
    esac
  done
  if [[ "$DRY_RUN" == "true" ]]; then
    if [[ "$BETA_MODE" == "true" ]]; then
      error "--beta --dry-run is unsupported; use scripts/release-beta-auto.sh --dry-run."
      exit 1
    fi
    if [[ ! "$DRY_VERSION" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
      error "Stable --dry-run requires --version X.Y.Z (no prerelease suffix)."
      exit 1
    fi
    if [[ -z "$NOTES_FILE" || ! -f "$NOTES_FILE" ]]; then
      error "Stable --dry-run requires --notes <file> pointing to an existing file."
      exit 1
    fi
    DRY_NOTES=$(cat "$NOTES_FILE")
    if [[ ! "$DRY_NOTES" =~ [^[:space:]] ]]; then
      error "Release notes are empty. Supply nonempty --notes <file>."
      exit 1
    fi
  elif [[ -n "$DRY_VERSION" || -n "$NOTES_FILE" || "$SKIP_CHECKS" == "true" ]]; then
    error "--version, --notes, and --skip-checks require --dry-run; real releases remain interactive."
    exit 1
  fi
}

stable_dry_run() {
  info "Stable release dry-run: plan and current-tree validation only."
  release_preflight_repo --local-tags
  release_refuse_existing_tag "v${DRY_VERSION}"
  info "Would release v${DRY_VERSION} from $(git rev-parse --short HEAD)."
  printf '%s\n' "$DRY_NOTES"
  info "Would update four lockstep versions and companion metadata, preserve Unreleased history in CHANGELOG.md, then check, commit, tag, and push."
  if [[ "$SKIP_CHECKS" == "true" ]]; then
    warn "Skipping current-tree local checks (--skip-checks)."
  else
    step_local_checks
  fi
  success "Dry run complete: no release state, version files, changelog, commits, tags, pushes, or publications changed."
}

# --- Main ---
main() {
  parse_args "$@"
  if [[ "$DRY_RUN" == "true" ]]; then
    stable_dry_run
    return
  fi

  echo ""
  if [[ "$BETA_MODE" == "true" ]]; then
    echo -e "${BOLD}  kerf Beta Release${RESET}"
    echo -e "  ${DIM}--beta mode: tag-only, no version-file bump.${RESET}"
  else
    echo -e "${BOLD}  kerf Release${RESET}"
  fi
  echo ""

  init_state

  local resume_step
  resume_step=$(get_step)
  if [[ -n "$resume_step" && "$resume_step" -gt 0 ]]; then
    warn "Found saved progress (step ${resume_step}/8)."
    if confirm "Resume from where you left off?"; then
      echo ""
    else
      if confirm "Start over from scratch?"; then
        cleanup_state
        init_state
        resume_step=""
      else
        exit 0
      fi
    fi
  fi

  if ! past_step 1; then
    preflight
    set_step 1
  fi
  if ! past_step 2; then
    step_release_notes
    set_step 2
  fi
  if ! past_step 3; then
    echo ""
    if [[ "$BETA_MODE" == "true" ]]; then
      step_beta_version
    else
      step_version
    fi
    set_step 3
  fi
  if ! past_step 4; then
    step_review
    if [[ "$BETA_MODE" == "true" ]]; then
      if ! confirm "Proceed with this BETA release?"; then
        warn "Aborted. State saved — run again to resume or edit."
        exit 0
      fi
    else
      if ! confirm "Proceed with this release?"; then
        warn "Aborted. State saved — run again to resume or edit."
        exit 0
      fi
    fi
    set_step 4
  fi

  if [[ "$BETA_MODE" == "true" ]]; then
    if ! past_step 7; then
      echo ""
      step_local_checks
      set_step 7
    fi
    if ! past_step 8; then
      step_beta_tag_and_push
      set_step 8
    fi
  else
    if ! past_step 5; then
      echo ""
      step_update_version
      set_step 5
    fi
    if ! past_step 6; then
      step_update_changelog
      set_step 6
    fi
    if ! past_step 7; then
      echo ""
      step_local_checks
      set_step 7
    fi
    if ! past_step 8; then
      step_git_commit
      step_stable_tag_and_push
      set_step 8
    fi
  fi

  echo ""
  cleanup_state
}

main "$@"
