# Pure Bun WASI provisioning (KF-AT2EEZ)

**Support decision: native-only experimental Linux x64 candidate, with Node 22 executing Satteri.** Forced-WASI support is not claimed. This does not adopt Bun for production installation or establish Bun-runtime compatibility. Production installation remains npm; the broader browser/release/provenance qualification gates still apply.

The previous exact Linux probe already rendered native Markdown and failed strict WASI cleanly. This investigation adds supported pure-Bun provisioning attempts with complete installed graphs and immutable canonical inputs. No npm augmentation, unrelated production peer, package-metadata rewrite, global configuration change, or production manifest/lock edit is part of the policy.

## Supported mechanism boundary

[Bun's install documentation](https://bun.com/docs/pm/cli/install#platform-specific-dependencies) describes CPU/OS selection, including wildcard selectors. The exact Bun 1.4.4 help describes `--force` as reinstalling dependencies; it is not an architecture-validation bypass. The actual `--cpu=wasm32` command rejects that architecture, listing recognized CPUs instead. The migrated Satteri WASI package is represented as `cpu: none`; all/any selectors do not make it installable in the tested graph.

A supported direct Bun addition was also attempted. In the full site fixture, that command instead fails while re-resolving the file-parent graph's bundled `@domotion/text-engine@0.35.0` from the registry. This independent issue is tracked by `KF-C6HCET`; it must not be papered over with a production peer or npm installation.

## Reproducible disposable probe

From a checkout of the commit being qualified, with exact Bun 1.4.4 and Node on PATH:

```sh
BUN_QUALIFICATION_EVIDENCE=<outside-checkout-evidence-dir>   node scripts/bun-pure-wasi-probe.mjs .
```

`BUN_BINARY` may identify the exact Bun executable. The script records both Bun version and revision, Node/npm versions, platform/architecture, actual Satteri public entry and `#binding` loader, and loader-relative package locations without relying on exported `package.json` subpaths.

The probe archives committed HEAD into an owned temporary repository copy, uses a private cache, migrates the canonical site npm lock with Bun, and suppresses lifecycle scripts only in that disposable fixture. Each attempt retains full before/after installed package manifests, dependency edges and symlink locations, command status/output, input hashes, and actual fresh-process native/strict Markdown results. Frozen attempts must preserve all input hashes. Only the direct platform addition may change the disposable site manifest/Bun lock; it may never change the canonical npm lock. Root manifest/lock hashes are checked throughout. The owned fixture is removed on exit; evidence remains outside the checkout.

Both runtime modes await real `markdownToHtml` output and check the heading and strong element. Strict mode sets `NAPI_RS_FORCE_WASI=error`, never the weaker fallback-preserving `true`. A missing WASI binding is recorded as a clean exit 1; timeouts, killed processes, unrelated failures, or native rendering failures fail the probe.

## Executed macOS full-site results

The local run archived `de53ce5fcf6363fdaad27633202377bd8f549b5e` and used macOS arm64, Node **22.23.4**, npm **11.20.0**, and Bun **1.4.4+38afee6c8**. This is installer-only evidence under Node, not Bun runtime evidence. No local Linux run is implied.

| Attempt                                   | Bun exit                        | Package nodes before → after | Native / strict Markdown |
| ----------------------------------------- | ------------------------------- | ---------------------------- | ------------------------ |
| Native frozen install                     | 0                               | 0 → 367                      | 0 / clean 1              |
| `--cpu=*` frozen                          | 0                               | 367 → 375                    | 0 / clean 1              |
| `--cpu=any` frozen                        | 0                               | 375 → 375                    | 0 / clean 1              |
| `--cpu=* --os=*` frozen                   | 0                               | 375 → 452                    | 0 / clean 1              |
| `--cpu=wasm32`                            | 1: invalid CPU                  | 452 → 452                    | 0 / clean 1              |
| `bun add --exact ...@0.10.5`              | 1: bundled-package registry 404 | 452 → 452                    | 0 / clean 1              |
| Direct-add follow-up, all-platform frozen | 0                               | 452 → 452                    | 0 / clean 1              |
| `--force` frozen reinstall                | 0                               | 452 → 452                    | 0 / clean 1              |

Every attempt left the site manifest, canonical npm lock, and migrated Bun lock byte-identical. The direct add failed before writing its allowed disposable changes. All sixteen Markdown processes exited without a signal or timeout. The actual loader could not locate `@bruits/satteri-wasm32-wasi` in any stage. The last two stages therefore remain checks of the unchanged native candidate, not a successfully provisioned direct dependency.

Canonical SHA-256 inputs:

| Input                    | SHA-256                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| Root `package.json`      | `acca6cd5646cf25666ec561d35585f7f89f7d827e554099439526475718144c9` |
| Root `package-lock.json` | `5e833638ed0529875f869a6499860107fd3158cfcee2a93a0247f97701ee39c8` |
| Site `package.json`      | `eed4e3acc0997daeb21942dadd15293858baeeed0f96de3670d0a0ec47cc3249` |
| Site `package-lock.json` | `3d9f1d30172935aaeb2be7e85609bf4c517ea1287fa1f24e7210f6c6d78633e0` |

The raw `pure-bun-wasi.json` SHA-256 is `246c0eaa41846d1d05a6dc87f0ea87f1aa5d716e9022a7535218f569fd4202bd`. Forty-seven raw files retain the complete before/after graph, each attempted manifest/npm/Bun lock, canonical root/site inputs, migration output, exact help, and runtime results. They are attached to the ticket as a compressed evidence bundle; Linux qualification must retain its own exact-commit artifact rather than reuse the macOS run.

## Linux boundary and remaining work

The [earlier Linux result](2026-11-10-bun-linux-results.md) at `d5adc44f8aaf7e9a92261ea3cdfa036e46b3fdfa` used Node 22.23.4, npm 10.9.9 and Bun 1.4.4, with the same canonical site input hashes. Native rendering passed and unmodified strict WASI exited 1. Its positive WASI control was npm-augmented and remains excluded from pure-Bun support evidence.

The new supported-mechanism probe must also run through its isolated Linux manual qualification job, retaining all raw evidence at that job's exact SHA. Do not describe an unexecuted Linux mechanism matrix as passed. `KF-C6HCET` tracks the independently observed direct-add registry failure. No adoption follows from this native-only support boundary.

## Executed Linux mechanism matrix

[Run 42783616290](https://github.com/brianwestphal/kerf/actions/runs/42783616290)
completed successfully at exact source/workflow SHA
`d08decc8cfbf93a1ddbe1e3d8afb867fb38cf6a2`. Only `pure-wasi` ran;
all other job groups were skipped. The job asserted and recorded Linux x64,
Node **22.23.4**, npm **10.9.9**, Bun **1.4.4+38afee6c8**, and checkout identity.
The canonical root/site manifest and npm-lock hashes match the local table above
and the original Linux candidate inputs.

| Sequential attempt             | Bun exit | Physical package nodes before → after | Native / strict Markdown |
| ------------------------------ | -------- | ------------------------------------- | ------------------------ |
| Native frozen                  | 0        | 0 → 372                               | 0 / clean 1              |
| All CPUs                       | 0        | 372 → 400                             | 0 / clean 1              |
| Any CPU                        | 0        | 400 → 400                             | 0 / clean 1              |
| All CPUs and OSes              | 0        | 400 → 452                             | 0 / clean 1              |
| Unsupported wasm32             | 1        | 452 → 452                             | 0 / clean 1              |
| Direct platform addition       | 1        | 452 → 452                             | 0 / clean 1              |
| Subsequent all-platform frozen | 0        | 452 → 452                             | 0 / clean 1              |
| Force reinstall                | 0        | 452 → 452                             | 0 / clean 1              |

All sixteen fresh Node Markdown processes exited without a signal or timeout;
all eight before/after manifest, npm-lock and Bun-lock hash sets are identical.
Every strict process reported the expected missing WASI binding. The actual
Satteri loader resolved none of the five requested WASI/runtime packages.
The complete physical graph does contain `@emnapi/runtime@1.11.3` nested below
Sharp after wildcard provisioning; that copy is unreachable from Satteri's
loader and supplies no forced-WASI support proof.

The direct addition independently reproduced
`GET https://registry.npmjs.org/@domotion%2ftext-engine - 404`, followed by
`@domotion/text-engine@0.35.0 failed to resolve` (KF-C6HCET). It failed before
changing inputs. The final two stages therefore inspect the retained graph,
not a successfully installed direct WASI dependency. Attempts are sequential;
the retained before/after graphs make that cumulative policy explicit.

The [portable Linux summary](2026-11-10-bun-pure-wasi-linux-results.json)
records every attempt, toolchain, actual loader resolution, complete-graph
counts, immutable inputs, all 48 raw-file hashes, raw-log hash, run/job identity
and artifact digest. Artifact
`pure-wasi-d08decc8cfbf93a1ddbe1e3d8afb867fb38cf6a2` retains the underlying
physical graphs, manifests, locks, help and command/runtime output.

This closes the missing Linux execution evidence for the tested mechanisms.
The support decision remains **native-only experimental Linux x64 under Node
22**, with strict WASI unsupported by these attempts. There is no production
installer adoption, Bun-runtime claim, npm augmentation, or requalification of
the original seven-tree candidate. The broader qualification result remains
**NO GO** for adoption and its separately tracked gaps still apply.
