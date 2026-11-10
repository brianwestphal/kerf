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
