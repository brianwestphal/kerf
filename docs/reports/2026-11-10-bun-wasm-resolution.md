# Bun WASM dependency resolution (KF-BW0Q5W)

**Keep npm for production installation.** The missing Satteri WASI branch
is explained by architecture filtering, rather than evidence that Bun hides
its emnapi packages elsewhere. A minimal Bun 1.4.4 frozen install and an npm
control both omit that branch and render Markdown with the native binding.
Both fail strict WASI selection until the platform package is explicitly
installed. The published WASI renderer works when provisioned correctly.
This investigation does not qualify an installer switch.

## Locked graph and published loader

`site/package-lock.json` locks `satteri@0.10.5`. Its optional
`@bruits/satteri-wasm32-wasi@0.10.5` declares `cpu: ["wasm32"]` and depends
on `@emnapi/core@1.11.1`, `@emnapi/runtime@1.11.1`, and
`@napi-rs/wasm-runtime@^1.2.3`. Core requires
`@emnapi/wasi-threads@1.2.2`. The site locks WASM runtime 1.2.4.
The separately locked top-level core 1.11.3 and threads 1.2.3 are not
proof that Satteri's platform package is installed: the shared WASM runtime
also declares emnapi peers.

The exact published Satteri `index.js` first selects the native binding.
Its WASI branch tries `./satteri_napi.wasi.cjs`, then the separate
`@bruits/satteri-wasm32-wasi` package. `NAPI_RS_FORCE_WASI=error` requires
that branch to load and throws when it cannot; `true` can retain a native
binding after a failed attempt, so it is weaker correctness evidence.
The package's public Markdown API reaches this loader through
`dist/index.js` → `dist/compile.js` → `#binding` → `dist/binding.js`.

[NAPI-RS documents](https://napi.rs/docs/concepts/webassembly#install-the-webassembly-package)
the intentional `wasm32` architecture restriction and recommends strict
WASI selection for testing. [Bun's install documentation](https://bun.com/docs/pm/cli/install)
describes optional dependencies and its platform-selection controls.
These are packaging decisions; changing the installer does not enable an
absent WASI platform artifact.

## Executed probes

The isolated fixtures ran on macOS arm64 on 2026-11-10, with npm 11.20.0,
Node 26.13.0, and the official `@oven/bun-darwin-aarch64@1.4.4` executable
(`38afee6c8`). The positive WASI case also passed on Node 22.15.0.
They used published Satteri 0.10.5 packages and changed no repository
dependencies, locks, scripts, or workflow files. Installs disabled scripts.

| Fixture                             | Native Markdown | Strict WASI      | Resolution evidence                                                |
| ----------------------------------- | --------------- | ---------------- | ------------------------------------------------------------------ |
| npm native install                  | Passed          | Expected failure | WASI package, core, and threads unresolved                         |
| Bun migrated frozen install         | Passed          | Expected failure | Same missing packages; migrated lock records WASI `cpu: "none"`    |
| Explicit WASI fixture, Node 26.13.0 | Not needed      | Passed           | Platform 0.10.5, runtime 1.2.4, core/runtime 1.11.1, threads 1.2.2 |
| Same WASI fixture, Node 22.15.0     | Not needed      | Passed           | Same installed artifact; process exited normally                   |

The normal Bun fixture contained only `satteri: "0.10.5"`. Its npm lock was
generated first, followed by `bun pm migrate` and
`bun install --frozen-lockfile --ignore-scripts`. The minimal npm control
also installed the portable Bun executable, which has no emnapi dependency.
`createRequire(...).resolve()` checked the real installed package graph.
Satteri's failed strict loader reported both the absent local WASI loader
and absent platform package, ruling out an alternate resolvable WASI copy
for that fixture.

The public API probe awaited `markdownToHtml('# WASM probe\n\n**works**')`
and asserted `<h1>WASM probe</h1>` and `<strong>works</strong>` in the
returned `.html`. Strict runs set `NAPI_RS_FORCE_WASI=error` in a fresh
Node process. Without the platform package, both managers produced
`WASI binding not found and NAPI_RS_FORCE_WASI is set to error`, with
`MODULE_NOT_FOUND` causes. After explicit installation the same public API
passed, exercising the actual WASM parser and renderer, rather than only
importing its JavaScript glue.

In the disposable positive fixture, npm's `--cpu=wasm32` still rejected the
direct platform dependency with `EBADPLATFORM` on this npm version.
`npm install --force --ignore-scripts` bypassed that architecture check
only in the fixture; this is diagnostic setup, not a proposed production
installation recipe. Node emitted its normal experimental WASI warning.

## Qualification still required

The minimal reproduction establishes why a native installation can omit
the entire optional branch. It does not reconstruct every package in the
earlier Linux site tree, prove an installer-specific top-level peer
hoisting explanation, or establish Bun runtime WASI compatibility: every
rendering probe ran under Node, matching the installer-only trial scope.

No new Linux run, full three-engine browser matrix, or release/provenance
matrix ran in this investigation. The current checkout initially had no
installed dependencies or Bun; the previous Linux trial remains the
evidence for native Astro builds. The normal npm CI run for this report
cannot serve as evidence for Bun-installed trees.

- `KF-QN0NZ4`: qualify resolution from the real Satteri loader in an exact
  Linux site candidate, run strict positive/negative WASI probes, and decide
  whether native-only support suffices or explicit WASI provision is needed.
- `KF-ZVVQ0G`: before reconsidering adoption, run all seven candidate trees
  through the complete browser and package/release matrix; preserve npm
  publishing and distinguish dry-run checks from actual OIDC provenance.

Both are linked backlog follow-ups. No installer change is recommended.
The previous disk-cost and trust-policy findings in the
[Linux trial](2026-11-10-bun-linux-trial.md) and
[macOS trial](2026-11-09-bun-install-trial.md) still apply.
