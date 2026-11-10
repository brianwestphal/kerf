# Linux Bun candidate execution

Candidate: `d5adc44f8aaf7e9a92261ea3cdfa036e46b3fdfa`,
[qualification run 42757076917](https://github.com/brianwestphal/kerf/actions/runs/42757076917).
The selected installer is Bun 1.4.4; Linux x64 probes used Node 22.23.4 and
npm 10.9.9. Production installation/publishing remains npm. This report describes
the executed candidate, not the later working tree.

**Result: NO GO for installer adoption.** The original full run finished with
32 successful jobs and two failures. A later, separate release-only run passed
35 tests and eight artifact dry-runs; it does not repair the original candidate.

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
Linked follow-up **KF-AT2EEZ** records the remaining pure-Bun provisioning or
explicit native-only support decision.

Downloaded artifacts `wasi-npm-<candidate-sha>` and `wasi-bun-<candidate-sha>`
retain `wasi-native.json` and `wasi-provisioned.json`; the Bun artifact also retains
the generated root/site locks and immutable input manifests. The portable
[downloaded evidence summary](2026-11-10-bun-linux-wasi-results.json) records raw
JSON SHA-256 hashes, input hashes, exact versions, statuses, inventories and loader
resolution results. Full stdout/stderr and command logs remain in the linked
Actions run. Absolute artifact paths are runner-local diagnostics only.

## KF-ZVVQ0G: final original matrix

All 34 jobs reached terminal results: **32 passed, two failed**. The Linux
Bun-installed cohort accounts for 30 passes and two failures across 32 jobs.
The Linux npm WASI control and macOS Bun design-template baseline each passed;
neither is counted as a Linux Bun candidate pass. Every root/UI/editor browser
lane passed, including all twelve editor engine/shard combinations.

All 32 candidate artifact directories were downloaded, plus the two WASI
artifacts. Input manifest/npm-lock hashes were consistent across observations
of each of the seven trees, and each tree had one unchanged migrated Bun-lock
hash, including repeated installs and the macOS baseline. The
[portable matrix summary](2026-11-10-bun-linux-matrix-results.json) records
toolchains, seven-tree hashes, job results/URLs, artifact archive digests and
the full raw-log SHA-256.

The `gates` job fails complete-example typing at
`site/src/examples/complete/row-selector/main.tsx:26`: TS2305, `kerfjs` has no
exported member `selector`. The frozen site install also warns that dependencies
in `../package.json` changed since the lock was saved. The migrated lock retains
`kerfjs@file:..` with truncated dependency metadata, whereas the source npm lock
represents the local package as a link. These original artifacts do not retain
installed peer realpaths/declaration bytes; separate reproductions and policy
controls are tracked by KF-0X25EY.

High-priority linked follow-up **KF-0X25EY** records the observed warning,
compiler failure, exact inputs and required local-file investigation. The
`candidate-gates-0-<candidate-sha>` artifact retains both generated locks and
input manifests. Canonical ordering and installer policy were preserved; no
npm fallback or build reordering was introduced to hide the failure.

Browser dependency installs took over an hour in some lanes, with similar
delays observed in the npm control. An initial live-log fetch returned HTTP
404/`BlobNotFound`; completed logs subsequently established that APT index and
package transfers dominated while Playwright CDN downloads finished in seconds.
The runner image was Ubuntu 24.04 `20261101.360.1`. Its
[tagged apt configuration](https://github.com/actions/runner-images/blob/ubuntu24/20261101.360/images/ubuntu/scripts/build/configure-apt-sources.sh)
points deb822 sources at `/etc/apt/apt-mirrors.txt`, so the canonical mirror-file
rewrite targeted the correct file but retained HTTP as the first mirror.
Repeated HTTP attempts were ignored before HTTPS fallback. WebKit shard 4
fetched 114 MB of APT packages in 1h27m14s, then downloaded WebKit/FFmpeg in
3.3s; Firefox shard 1 fetched 48.5 MB in 37m20s, then downloaded its browsers
in 2.7s. **KF-7RRYQ8** retains the three completed raw logs, timing comparison
and separate HTTPS/bounded-install mitigation. No original job was cancelled
or command reordered to bypass the delay.

The failing gates chain stopped at complete-example typing. Subsequent scaffold
typing/docs-example subchecks and the root dependency-audit step did not execute;
their success is not inferred from other jobs. The initial release test setup
also failed before the artifact probe could run.

The ESLint variation tests used the requested runtime versions: Node logged
9.39.5 and 10.8.0, and both suites passed. However, both retained `bun pm ls`
dumps and copied locks still describe ESLint 9.39.4 after `bun add --no-save`.
They are **pm/lock snapshots, not verified complete physical installed graphs**.
The same completeness limit applies to the Web Awesome variation snapshot.
Linked **KF-1EH00H** requires a filesystem-based inventory and rerun of all
three variation lanes. The portable summary distinguishes reported graph
versions from actual runtime evidence.

| Job                                                                                                                        | Platform / base install | Result  |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------- |
| [build](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633816785)                                   | Linux / Bun candidate   | success |
| [lint](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817039)                                    | Linux / Bun candidate   | success |
| [browser](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817062)                                 | Linux / Bun candidate   | success |
| [editor-browser (webkit, 1)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817119)              | Linux / Bun candidate   | success |
| [wasi-resolution / wasi-resolution (npm)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817149) | Linux / npm control     | success |
| [node-floor](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817151)                              | Linux / Bun candidate   | success |
| [test](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817158)                                    | Linux / Bun candidate   | success |
| [gates](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817190)                                   | Linux / Bun candidate   | failure |
| [editor-browser (webkit, 2)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817194)              | Linux / Bun candidate   | success |
| [editor-browser (webkit, 4)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817201)              | Linux / Bun candidate   | success |
| [editor-browser (webkit, 3)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817202)              | Linux / Bun candidate   | success |
| [wasi-resolution / wasi-resolution (bun)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817212) | Linux / Bun candidate   | success |
| [editor](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817246)                                  | Linux / Bun candidate   | success |
| [ui-browser (chromium)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817275)                   | Linux / Bun candidate   | success |
| [design-templates](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817302)                        | macOS / Bun candidate   | success |
| [ui-webawesome-latest](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817307)                    | Linux / Bun candidate   | success |
| [eslint-plugin (10.8.0)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817321)                  | Linux / Bun candidate   | success |
| [site](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817361)                                    | Linux / Bun candidate   | success |
| [eslint-plugin (9.39.5)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817381)                  | Linux / Bun candidate   | success |
| [ui-browser (webkit)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817406)                     | Linux / Bun candidate   | success |
| [create-kerf-component](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817436)                   | Linux / Bun candidate   | success |
| [ui](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817437)                                      | Linux / Bun candidate   | success |
| [ui-browser (firefox)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817439)                    | Linux / Bun candidate   | success |
| [release-artifacts](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817444)                       | Linux / Bun candidate   | failure |
| [editor-browser (firefox, 2)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817456)             | Linux / Bun candidate   | success |
| [editor-browser (firefox, 1)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817464)             | Linux / Bun candidate   | success |
| [typecheck](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817483)                               | Linux / Bun candidate   | success |
| [seventh-tree](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817488)                            | Linux / Bun candidate   | success |
| [editor-browser (chromium, 1)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817498)            | Linux / Bun candidate   | success |
| [editor-browser (firefox, 4)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817503)             | Linux / Bun candidate   | success |
| [editor-browser (chromium, 2)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817552)            | Linux / Bun candidate   | success |
| [editor-browser (firefox, 3)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817553)             | Linux / Bun candidate   | success |
| [editor-browser (chromium, 3)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817559)            | Linux / Bun candidate   | success |
| [editor-browser (chromium, 4)](https://github.com/brianwestphal/kerf/actions/runs/42757076917/job/129633817582)            | Linux / Bun candidate   | success |

Whole-stable-CLI dry-run was unavailable at this candidate SHA; later work is
tracked by **KF-Y9A9XE**. Real OIDC registry provenance is outside the authorized
scope. **NO GO for installer adoption.**

## KF-ZVVQ0G: separate release-only Linux result

[Run 42764691224](https://github.com/brianwestphal/kerf/actions/runs/42764691224)
completed successfully at **`b7273e3cbe92235597b68de2cfac2166da78a8b1`**.
Only the release-artifact job ran; the other 18 job groups were skipped before
matrix expansion. This is a different SHA and deliberately limited scope; it
does **not** qualify the original `d5adc44f` full matrix or establish adoption readiness.

The runner used Linux x64, Node 22.23.4, npm 10.9.9 and Bun 1.4.4. Root and UI
dependencies were migrated and installed frozen with Bun, then built with the
repository's normal Node/npm build commands. Input hashes, generated Bun locks
and default lifecycle-trust policy are retained. All **35 release tests passed**,
including real beta CLI dry-runs, four-package metadata/pack tests, release
ordering and pack/publish isolation checks.

The artifact probe then prepared versions `5.0.0` and `5.0.0-beta.999999` for
`kerfjs`, `@kerfjs/ui`, `eslint-plugin-kerfjs`, and `create-kerf-component` in
disposable fixtures. All **eight packs and offline publish dry-runs passed**.
The probe required one actual tarball per output directory, read its package
name/version and required emitted entries, computed SHA-256/SHA-512 from the
bytes, and verified the same bytes survived dry-run publishing unchanged.
Downloaded tarballs were independently re-hashed and their metadata re-read;
all eight matched the retained report. The
[portable release evidence summary](2026-11-10-bun-linux-release-results.json)
records sizes, hashes, integrity, package versions, peer ranges and input locks.
Raw tarballs and `release-artifacts.json` are retained in the run artifact
`candidate-release-artifacts-b7273e3cbe92235597b68de2cfac2166da78a8b1`.

Earlier scoped attempts are failures, not interchangeable proof:

| Run / SHA                                                                                | Actual result                                                               |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [42757076917 / d5adc44f](https://github.com/brianwestphal/kerf/actions/runs/42757076917) | Initial release test setup could not find Husky; artifact probe did not run |
| [42762611568 / 14c603b8](https://github.com/brianwestphal/kerf/actions/runs/42762611568) | 35 tests passed; separate probe lacked executable PATH setup                |
| [42763807614 / 0a11f5c6](https://github.com/brianwestphal/kerf/actions/runs/42763807614) | 35 tests passed; npm 10 lifecycle stdout broke pack JSON parsing            |
| [42764691224 / b7273e3c](https://github.com/brianwestphal/kerf/actions/runs/42764691224) | 35 tests and eight artifact dry-runs passed                                 |

The harness repairs supply fixture executable PATH and `HUSKY=0`, and inspect
tarball bytes instead of parsing lifecycle-contaminated npm stdout. Both exact
release commands were also verified serially on Node 22.23.4/npm 10.9.9 with a
restricted caller PATH before the successful Linux dispatch.

Release workflow inspection and passing tests confirm tokenless jobs build and
pack, while token-holding jobs download those tarballs and publish local paths
with scripts disabled. The qualification workflow has only contents-read
permission and never requests OIDC or a real registry publication. Successful
offline dry-runs do not prove registry provenance. This successful SHA did not
exercise the later stable CLI plan implemented under **KF-Y9A9XE**.
**NO GO for installer adoption.**
