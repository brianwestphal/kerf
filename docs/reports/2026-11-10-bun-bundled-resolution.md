# Bun bundled dependency resolution (KF-C6HCET)

Bun 1.4.4 requests the private `@domotion/text-engine@0.35.0` package from the public registry even though the locked `domotion-svg@0.35.0` tarball contains it as a bundled dependency. The failure reproduces without Satteri or a local-file parent: ordinary registry addition and the exact tarball URL both produce the same HTTP 404. This is an independent bundled-resolution limitation, not evidence about WASI CPU support.

## Evidence and cause boundary

The root npm lock declares `domotion-svg` as a development dependency, identifies its bundled text-engine package with `inBundle: true`, and pins the public tarball's SHA-512 integrity. The probe downloads that exact tarball, verifies the lock's integrity, extracts it, and records the publisher's real `bundledDependencies` metadata plus the nested text-engine manifest. The bundle is present at version 0.35.0. Tarball SHA-256 is `a242acd46feb81b389b9cb0caa314bc178b2e9f3408a4cb06fb523df42e49cb3`; nested manifest SHA-256 is `4ee4eae9020d5f0921815d4e2add1182f336231039b8f3f877010a047f4fbf9d`.

The canonical site uses `kerfjs: file:..`. Its npm-migrated frozen Bun lock installs successfully without traversing the parent's entire development graph. A non-frozen addition re-resolves that parent and reaches domotion-svg's development edge, then fails fetching the bundled private package. The direct registry/tarball controls isolate the second problem from the first. Exact implementation-level causation within Bun's resolver is not established; the observed package request and valid published bundle are established.

The [supported Bun add flags](https://bun.com/docs/pm/cli/add) include production omission, isolated linker, no-cache, lock-only resolution, and tarball URLs. No supported full-development-graph fix was found in these controls. No metadata rewrites, private dependency peers, npm augmentation, or global configuration changes were used.

## Supported limited bypass

In an already migrated disposable full-site candidate:

```sh
bun add --exact --ignore-scripts --production @bruits/satteri-wasm32-wasi@0.10.5
bun install --frozen-lockfile --ignore-scripts
```

The production-only add bypasses parent development resolution and writes the exact requested dependency into the disposable site manifest/Bun lock. A subsequent ordinary frozen install succeeds. The probe resolves TypeScript, Vite, Playwright, and Astro from the site both before the add and after restore, recording entry paths, physical manifest paths, complete manifests, versions, and hashes; every restored identity must match the baseline. Both commands explicitly skip the WASI package as unsupported (`cpu: none`); it remains absent from the actual Satteri-loader resolution. Real Node Markdown succeeds natively and strict `NAPI_RS_FORCE_WASI=error` exits cleanly with exit 1. This is a resolver bypass with a deliberately restricted first command, **not successful WASI provisioning, a bundled-package fix, or installer adoption**. Lifecycle suppression is confined to these diagnostic fixtures.

## Reproducible probe and local results

With exact Bun 1.4.4 and Node 22 available:

```sh
BUN_QUALIFICATION_EVIDENCE=<outside-checkout-dir> node scripts/bun-bundled-resolution-probe.mjs .
```

`BUN_BINARY` can identify the exact executable. The builtin-only script archives committed HEAD and gives every full-site addition control an independent fixture with its own exact parent archive. The production add and subsequent restore share their declared policy fixture. All controls share one cache private to the entire probe; the explicit `--no-cache` control bypasses that cache. Source/canonical npm inputs remain unchanged. It retains full before/after installed manifests, dependency edges and symlink paths; each command's output/status; all manifest/npm/Bun-lock hashes; exact tool versions/help; and actual published bundle metadata. Expected failed adds must preserve their complete graphs and inputs. Only the explicit production add may change its disposable manifest/Bun lock; canonical npm locks never change.

The macOS arm64 run archived source `20c7c8ac99135cfd5b311813d91784a5ac425320` and used Node 22.23.4, npm 11.20.0, and Bun 1.4.4+38afee6c8. Its 43 evidence files include `bundled-resolution.json` (SHA-256 `92cc03141a81d6d64f4faeddda10a1d484b44131a9d9db0e7478e630d6bd6349`). The canonical root/site manifest and npm-lock digests match the [pure-WASI report](2026-11-10-bun-pure-wasi.md).

| Independent control                                  |            Exit | Installed package nodes before → after |
| ---------------------------------------------------- | --------------: | -------------------------------------: |
| Migrated native frozen baseline                      |               0 |                                0 → 367 |
| Default WASI add                                     |  1: bundled 404 |                              367 → 367 |
| Production-only WASI add                             | 0: WASI skipped |                              367 → 367 |
| Normal frozen restore after production add           | 0: WASI skipped |                              367 → 367 |
| Isolated linker add                                  |  1: bundled 404 |                              367 → 367 |
| No-cache add                                         |  1: bundled 404 |                              367 → 367 |
| Lock-only add                                        |  1: bundled 404 |                              367 → 367 |
| Direct registry domotion add, no file-parent/Satteri |  1: bundled 404 |                                  0 → 0 |
| Exact tarball domotion add, no file-parent/Satteri   |  1: bundled 404 |                                  0 → 0 |

The successful production commands can update copied local-parent metadata without changing package counts; full graph files retain those differences. Failed controls preserve byte-identical input hashes and identical graphs.

Four focused regression tests cover real bundled/missing manifest contents, exact clean-404 classification versus hangs/unrelated errors, canonical input immutability, and real tooling resolution with rejection of missing or replaced packages. The combined related probe suites pass 12 tests. The earlier local matrix predates the additional tooling assertions; the subsequent Linux run below executes them before confirming restoration. Local lint, formatting, and typecheck are part of the handoff checks.

## Initial Linux boundary

The [Linux pure-WASI job](https://github.com/brianwestphal/kerf/actions/runs/42783616290/job/129719329979) at source `d08decc8cfbf93a1ddbe1e3d8afb867fb38cf6a2` independently reproduces default-add HTTP 404 with 452 physical package nodes before/after and unchanged canonical inputs. Its eight native Markdown checks pass and strict WASI exits cleanly with exit 1. That green diagnostic job does not claim WASI support.

At that checkpoint, the independent production-add/frozen-restore and minimal controls still required Linux execution; macOS results did not establish a Linux bypass. The following section records that subsequent exact-source execution. No production installer change follows from this investigation.

## Executed Linux controls and tooling restoration

[Run 42787309811](https://github.com/brianwestphal/kerf/actions/runs/42787309811)
passed at exact source/workflow SHA
`feff2523c2105239eb9ff086923117b0fb1d8509`, including the additional real-tooling
assertions. Only `bundled-dependency` ran; all other scope groups were skipped.
The asserted Linux x64 toolchain was Node **22.23.4**, npm **10.9.9** and Bun
**1.4.4+38afee6c8**. Migration and the native frozen baseline each exited 0;
the subsequent full-site controls started with 372 physically inventoried
packages. Canonical root/site manifest/npm-lock hashes match the earlier
candidate inputs.

| Control                                          | Exit            | Physical nodes before → after |
| ------------------------------------------------ | --------------- | ----------------------------- |
| Default full-development WASI add                | 1: bundled 404  | 372 → 372                     |
| Production-only WASI add                         | 0: WASI skipped | 372 → 372                     |
| Normal frozen restore after production add       | 0: WASI skipped | 372 → 372                     |
| Isolated linker add                              | 1: bundled 404  | 372 → 372                     |
| No-cache add                                     | 1: bundled 404  | 372 → 372                     |
| Lock-only add                                    | 1: bundled 404  | 372 → 372                     |
| Direct registry domotion, no file-parent/Satteri | 1: bundled 404  | 0 → 0                         |
| Exact tarball domotion, no file-parent/Satteri   | 1: bundled 404  | 0 → 0                         |

All ten command processes exited without signals or process errors. Each of
the six expected 404 controls preserved identical complete physical graphs and
all input hashes. The production add changed its declared disposable site
manifest/Bun lock; normal frozen restoration left that policy's input hashes
unchanged. Canonical npm inputs were unchanged throughout. Equal package counts
alone are not graph-preservation evidence: retained full manifests show copied
local-parent metadata changes during the successful policy.

Actual site resolution before the add and after restore selected identical
entries, logical/physical manifest paths, full manifests and SHA-256 hashes for:

| Site tool         | Version |
| ----------------- | ------- |
| TypeScript JS API | 6.0.3   |
| Vite              | 8.3.4   |
| Playwright test   | 1.63.0  |
| Astro             | 7.3.2   |

These are the actual site versions, not the editor performance control's
separate Playwright revision. The published domotion tarball independently
matched the locked SHA-512 integrity, with SHA-256
`a242acd46feb81b389b9cb0caa314bc178b2e9f3408a4cb06fb523df42e49cb3`.
Its bundled private text-engine manifest was present at 0.35.0 and matched the
nested manifest hash recorded above.

Both successful commands explicitly skipped WASI as unsupported (`cpu: none`).
Fresh Node Markdown rendering passed natively; strict `NAPI_RS_FORCE_WASI=error`
exited cleanly with 1. The actual Satteri loader resolved none of the five
requested WASI/runtime packages. This verifies the **limited resolver bypass
and subsequent tooling restoration**, not successful WASI provisioning or a
full-development bundled-resolution fix.

The [portable Linux summary](2026-11-10-bun-bundled-resolution-linux-results.json)
retains all ten outcomes, eight complete before/after graph identities/counts,
input boundaries, full before/after tooling evidence, published bundle metadata,
raw-file/log hashes, exact run/job identity and artifact digest. All 44 raw files
remain in artifact
`bundled-dependency-feff2523c2105239eb9ff086923117b0fb1d8509`. Separate addition controls use independent fixtures and parent archives; the
production add and frozen restore share their policy fixture. One cache is
private to the probe and shared between controls. The explicit no-cache control still reproduces 404, so these
results do not imply independently cold caches for every case.

The underlying full-development resolver remedy remains actionable backlog
**KF-Z0FQZ2**, a verified typed follow-up of KF-C6HCET. Full end-to-end
qualification of a separately declared link/native-only adoption candidate is
tracked by **KF-477J4X**, a typed follow-up of KF-0X25EY; physical variation
inventories remain **KF-1EH00H**. Those tasks are backlog without Up Next and do
not authorize adoption or upstream messages. This completed investigation
leaves production npm unchanged and installer adoption **NO GO**.
