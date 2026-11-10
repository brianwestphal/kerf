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

`BUN_BINARY` can identify the exact executable. The builtin-only script archives committed HEAD, gives every full-site control its own exact parent archive and private cache, and preserves source/canonical npm inputs. It retains full before/after installed manifests, dependency edges and symlink paths; each command's output/status; all manifest/npm/Bun-lock hashes; exact tool versions/help; and actual published bundle metadata. Expected failed adds must preserve their complete graphs and inputs. Only the explicit production add may change its disposable manifest/Bun lock; canonical npm locks never change.

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

Four focused regression tests cover real bundled/missing manifest contents, exact clean-404 classification versus hangs/unrelated errors, canonical input immutability, and real tooling resolution with rejection of missing or replaced packages. The combined related probe suites pass 12 tests. The earlier local matrix predates the additional tooling assertions; the Linux scope must execute those assertions before confirming restoration. Local lint, formatting, and typecheck are part of the handoff checks.

## Linux boundary

The [Linux pure-WASI job](https://github.com/brianwestphal/kerf/actions/runs/42783616290/job/129719329979) at source `d08decc8cfbf93a1ddbe1e3d8afb867fb38cf6a2` independently reproduces default-add HTTP 404 with 452 physical package nodes before/after and unchanged canonical inputs. Its eight native Markdown checks pass and strict WASI exits cleanly with exit 1. That green diagnostic job does not claim WASI support.

The new independent bundled-resolution scope must additionally execute the production-add/frozen-restore and minimal controls on Linux at its own exact source SHA. macOS results do not establish a Linux bypass. No production installer change follows from this investigation.
