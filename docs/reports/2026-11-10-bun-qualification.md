# Bun candidate qualification (KF-QN0NZ4, KF-ZVVQ0G)

Production installation and publishing remain npm. Qualification is an explicit
manual workflow, `bun-qualification.yml`, with read-only repository permissions
and no OIDC permission or publish step. Its checked-out commit is the exact
candidate; it does not reinterpret a normal npm CI run as Bun evidence.

## WASI evidence method

The `wasi-resolution` matrix compares npm with Bun 1.4.4 on Ubuntu 24.04 and Node 22. The Bun path migrates the candidate's exact npm locks with `bun pm migrate`,
then uses `bun install --frozen-lockfile`. Input manifest/npm-lock hashes and the
generated Bun lock are checked for mutation and retained in the run artifact.
Root is built before the site installs its local Kerf dependency.

`scripts/bun-wasi-probe.mjs` resolves Satteri's `#binding` entry from the real
installed consumer. It records package resolution from that native loader and
walks the full installed tree, including hidden Bun storage and linked packages,
to inventory WASI/emnapi dependencies. It executes real Markdown conversion in
fresh native and strict `NAPI_RS_FORCE_WASI=error` Node processes, with a bounded
timeout and clean exit assertions.

After preserving the native candidate evidence, a disposable positive phase
explicitly provisions Satteri's exact WASI platform package and locked WASM
runtime. The `npm --force` architecture exception applies only to this diagnostic
runner phase; it is not a production installation policy. A successful positive
probe must exercise the actual Markdown parser/renderer and exit normally.

Artifacts retain candidate commit/toolchain versions, input hashes, generated
Bun locks, resolved package paths/versions, complete matching-package inventories,
and process output/status. The corresponding Actions run retains raw command
logs. Absolute paths within those artifacts are runner-local diagnostic evidence.

## Local harness verification

Before Linux dispatch, the probe was exercised against existing disposable
Satteri 0.10.5 fixtures on macOS: native Markdown succeeded, the unprovisioned
strict case failed cleanly with the expected missing WASI binding, and explicit
WASI provisioning passed real rendering. These local checks validate the harness;
they do not establish Linux candidate qualification. The workflow and scripts
also passed JavaScript syntax, ESLint, Prettier, and manual trigger/permission
checks.

Linux run results and the complete matrix are recorded after execution; until
then neither ticket is qualified by this document alone.

## Complete candidate matrix

`scripts/sync-bun-qualification-workflow.mjs` derives the manual candidate job
graph from the current `ci.yml`, retaining every canonical test command and
browser/shard matrix. It replaces repository `npm ci` calls with the exact-lock
Bun helper. npm remains the Node-runtime script runner, auditor, packer, and
scratch tarball consumer; its only tool bootstrap installs the pinned Bun
executable. Intentional latest-ESLint/Web Awesome variants use Bun to apply their
post-frozen-install dependency variation. `npx --no-install` prevents silent
replacement of missing candidate tools.

The matrix covers root, UI, editor, plugin, scaffold, site, and the seventh
reactivity-example tree. Browser suites retain Chromium/Firefox/WebKit and all
four editor shards. Canonical Linux jobs use Ubuntu 24.04; the additional
design-template job retains canonical macOS because its rendering baseline is
platform-specific. That extra job is not represented as Linux evidence.

The graph has a checked-in source fingerprint and a unit guard against missing
canonical gates or unreviewed npm installation. Regenerate it after changing
`ci.yml`; its ordinary unit test rejects stale output. Per-job artifacts retain
input/generated lock hashes and tool versions, while Actions retains raw logs.

Manual dispatch defaults to `scope=full`. An explicit `scope=release-artifacts`
executes only the isolated release lane, allowing a harness repair to gather
missing release evidence without repeating the browser matrix. That run qualifies
only its own checked-out SHA and scope; results from different SHAs must remain
separate. The release tests receive npm-style executable PATH setup for their
fixture lifecycle commands. Once candidate builds succeed, the independent
artifact probe still runs if a release test fails, retaining useful evidence
without turning that failed job green.

Release coverage exercises real beta dry-run integration tests, shared release
helpers, changelog/version planning, exact four-package metadata preparation,
and tokenless pack-to-publish workflow isolation. An additional probe copies the
already-built candidate publish surfaces into disposable stable/beta fixtures,
packs all eight artifacts, asserts their versions and required emitted files,
runs offline `npm publish --dry-run --ignore-scripts` against those same bytes,
and verifies their SHA-256 identities did not change. No registry publication
or OIDC token is requested.

### Release qualification boundary

`KF-Y9A9XE` records a discovered pre-existing safety gap: the interactive stable
`release.sh` has no dry-run mode and ignores unrecognized arguments. It is never
invoked with `--dry-run` by this harness. Stable artifact/metadata dry runs and
helper tests can pass without proving the whole stable CLI dry-run path. Real
OIDC registry provenance likewise requires a separately authorized publish of a
Bun-built artifact. These limitations mean this work cannot by itself justify
installer adoption, even if every executable matrix gate passes.

Local harness checks additionally passed four matrix/parity/safety unit tests,
root TypeScript checking, a real Bun 1.4.4 migration/frozen install against an
isolated Satteri fixture, and all eight real stable/beta pack/offline-publish dry
runs. These are harness checks on macOS, not substitutes for the Linux run.
