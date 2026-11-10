# Linux Bun candidate execution

Candidate: `d5adc44f8aaf7e9a92261ea3cdfa036e46b3fdfa`,
[qualification run 42757076917](https://github.com/brianwestphal/kerf/actions/runs/42757076917).
The selected installer is Bun 1.4.4; Linux x64 probes used Node 22.23.4 and
npm 10.9.9. Production installation/publishing remains npm. This report describes
the executed candidate, not the later working tree.

## KF-QN0NZ4: actual native and WASI resolution

Both Ubuntu 24.04 jobs completed successfully:
[npm control](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817149)
and [Bun candidate](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817212).
The success means their assertions matched the expected outcomes below; it does
not mean an unmodified candidate supports forced WASI.

| Installed tree                                    | Native Markdown | Strict forced WASI           | Interpretation                                                |
| ------------------------------------------------- | --------------- | ---------------------------- | ------------------------------------------------------------- |
| Exact npm site lock                               | exit 0          | exit 1, missing WASI binding | Native works; strict failure exits cleanly                    |
| Migrated frozen Bun site lock                     | exit 0          | exit 1, missing WASI binding | Native works; strict failure exits cleanly                    |
| npm tree plus explicit npm provisioning           | exit 0          | exit 0                       | Diagnostic positive control                                   |
| Bun tree subsequently reified by npm provisioning | exit 0          | exit 0                       | npm-augmented diagnostic control; **not pure Bun WASI proof** |

Each positive/negative child rendered real Markdown and checked its output; no
process timed out or exited by signal. Probes resolved `#binding` from the actual
Satteri consumer, and traversed the entire installed tree, including hidden
storage and links. The original Bun inventory contained none of the five
investigated WASI/emnapi packages. The original npm inventory contained
`@emnapi/core`/`runtime` 1.11.3, `@emnapi/wasi-threads` 1.2.3, and
`@napi-rs/wasm-runtime` 1.2.4, but no Satteri WASI platform binding. Package JSON
subpaths rejected by `exports` are recorded as resolution failures, not evidence
that an inventoried package is physically absent.

The positive phase ran
`npm install --force --ignore-scripts --no-audit --no-fund @bruits/satteri-wasm32-wasi@0.10.5 @napi-rs/wasm-runtime@1.2.4`.
On the Bun tree npm reported **13 added, two removed, two changed packages**.
Both manifest and npm-lock hashes changed; the retained Bun lock did not. The
positive inventory includes additional 1.11.1 emnapi packages and wasi-threads
1.2.2 alongside the newer versions. Thus npm changed the base graph beyond
adding a single binding. Artifacts do not retain a complete before/after
inventory of unrelated packages, so their identities cannot be reconstructed
from this evidence. Successful rendering cannot be attributed to an unchanged
Bun graph.

The native-only candidate is experimentally viable for this Markdown operation.
Adoption remains **NO GO**: the broader matrix has a failure, and forced WASI
requires an explicitly qualified installation policy if it is a requirement.
No production WASI provisioning or native-only policy was selected here.

Downloaded artifacts `wasi-npm-<candidate-sha>` and `wasi-bun-<candidate-sha>`
retain `wasi-native.json` and `wasi-provisioned.json`; the Bun artifact also retains
the generated root/site locks and immutable input manifests. The portable
[downloaded evidence summary](2026-11-10-bun-linux-wasi-results.json) records raw
JSON SHA-256 hashes, input hashes, exact versions, statuses, inventories and loader
resolution results. Full stdout/stderr and command logs remain in the linked
Actions run. Absolute artifact paths are runner-local diagnostics only.

## KF-ZVVQ0G: initial matrix finding

The `gates` job fails complete-example typing at
`site/src/examples/complete/row-selector/main.tsx:26`: TS2305, `kerfjs` has no
exported member `selector`. The frozen site install also warns that dependencies
in `../package.json` changed since the lock was saved. The migrated lock retains
`kerfjs@file:..` with truncated dependency metadata, whereas the source npm lock
represents the local package as a link. The precise cause remains unproven;
the job does not retain installed peer realpaths/declaration bytes.

High-priority linked follow-up **KF-0X25EY** records the observed warning,
compiler failure, exact inputs and required local-file investigation. The
`candidate-gates-0-<candidate-sha>` artifact retains both generated locks and
input manifests. Canonical ordering and installer policy were preserved; no
npm fallback or build reordering was introduced to hide the failure.

The remaining matrix is still running at this report's initial evidence commit.
Final matrix/artifact results will be appended after execution. Stable whole-CLI
dry-run remains unavailable (**KF-Y9A9XE**); real OIDC registry provenance is
outside the authorized scope. **NO GO for installer adoption.**
