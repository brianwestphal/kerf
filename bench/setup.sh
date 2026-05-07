#!/usr/bin/env bash
#
# Bootstrap the local js-framework-benchmark cache.
#
# What this does:
#   1. Builds the local kerfjs and packs it into a tarball.
#   2. Shallow-clones krausest/js-framework-benchmark into bench/.bench-cache/
#      (or fast-forwards it if already present).
#   3. Copies bench/kerfjs-impl/ into the cache as
#      frameworks/keyed/kerfjs/, then rewrites the kerfjs dependency in
#      that copy to point at the local tarball (so we benchmark our
#      working tree, not whatever's on npm).
#   4. Runs `npm install` and the prod build for the kerfjs entry plus a
#      small set of reference frameworks to compare against.
#   5. Builds the webdriver-ts harness.
#
# After this finishes, run `bench/run.sh` to execute the benchmark.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BENCH_DIR="${REPO_ROOT}/bench"
CACHE_DIR="${BENCH_DIR}/.bench-cache"
UPSTREAM_DIR="${CACHE_DIR}/js-framework-benchmark"
UPSTREAM_REPO="https://github.com/krausest/js-framework-benchmark.git"

# Frameworks (besides kerfjs) to build for comparison. Edit as you like.
REFERENCE_FRAMEWORKS=(
  "non-keyed/vanillajs"
  "keyed/solid"
  "keyed/react-hooks"
  "keyed/vue"
)

echo "==> Building kerfjs and packing tarball"
cd "${REPO_ROOT}"
npm run build >/dev/null
TARBALL="$(npm pack  | tail -n1)"
TARBALL_ABS="${REPO_ROOT}/${TARBALL}"
echo "    packed: ${TARBALL_ABS}"

mkdir -p "${CACHE_DIR}"

if [[ ! -d "${UPSTREAM_DIR}/.git" ]]; then
  echo "==> Cloning js-framework-benchmark (shallow)"
  git clone --depth 1 "${UPSTREAM_REPO}" "${UPSTREAM_DIR}"
else
  echo "==> Updating js-framework-benchmark"
  git -C "${UPSTREAM_DIR}" fetch --depth 1 origin master
  git -C "${UPSTREAM_DIR}" reset --hard origin/master
fi

echo "==> Copying kerfjs entry into upstream tree"
DEST="${UPSTREAM_DIR}/frameworks/keyed/kerfjs"
rm -rf "${DEST}"
mkdir -p "${DEST}"
# Copy everything except node_modules / dist / lockfile.
rsync -a \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'package-lock.json' \
  "${BENCH_DIR}/kerfjs-impl/" "${DEST}/"

# Patch the dependency to point at our local tarball.
node - "$DEST/package.json" "$TARBALL_ABS" <<'NODE'
const fs = require('fs');
const [, , pkgPath, tarball] = process.argv;
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies.kerfjs = `file:${tarball}`;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
NODE

echo "==> Installing root + webdriver-ts deps"
(cd "${UPSTREAM_DIR}" && npm install )
(cd "${UPSTREAM_DIR}/webdriver-ts" && npm install && npm run compile)
(cd "${UPSTREAM_DIR}/webdriver-ts-results" && npm install )

echo "==> Building kerfjs framework entry"
(cd "${DEST}" && npm install  && npm run build-prod )

for fw in "${REFERENCE_FRAMEWORKS[@]}"; do
  FW_DIR="${UPSTREAM_DIR}/frameworks/${fw}"
  if [[ -d "${FW_DIR}" ]]; then
    echo "==> Building reference framework: ${fw}"
    (cd "${FW_DIR}" && npm install  && npm run build-prod )
  else
    echo "    skipping missing reference framework: ${fw}"
  fi
done

# Clean up the tarball — its absolute path is now baked into the cache's
# package-lock, so don't litter the repo root with it.
rm -f "${TARBALL_ABS}"

echo
echo "==> Setup complete."
echo "    Cache: ${UPSTREAM_DIR}"
echo "    Run benchmarks with: bench/run.sh"
