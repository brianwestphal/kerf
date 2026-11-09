# Bun Linux installation follow-up (KF-24ZZVB)

**Decision: keep npm for installs.** Bun 1.4.4 completed frozen-lockfile
installs for all seven packages on Linux and the site built, but its `file:`
copies add about 863 MiB across the two consumers, and its site tree resolves
the optional WASM dependencies differently from npm. The existing
[macOS trial](2026-11-09-bun-install-trial.md) also favored npm. No production
lockfile, installer command, or release workflow changed.

## Linux CI method and results

The disposable [trial PR](https://github.com/brianwestphal/kerf/pull/12)
carried seven Bun locks migrated from the npm locks. Its final
[green Linux run](https://github.com/brianwestphal/kerf/actions/runs/42714891408)
used Ubuntu `x86_64`, Node 22.23.4, npm 10.9.9, and Bun 1.4.4. Each matrix
job ran `npm ci --no-audit --no-fund`, removed that package's `node_modules`,
then ran `bun install --frozen-lockfile`. The site and reactivity example
first installed root dependencies because their local `file:` dependency
executes root's `prepare` script. The site job built root before installing
site dependencies, matching normal site CI. All seven jobs passed.

The times below are single, concurrent CI-job observations of the package
install command only; root prerequisites and Bun setup are excluded. Their
sum is **not** elapsed pipeline time or a stable speed benchmark. Sizes are
`du -sk node_modules` after each install, rounded to MiB.

| Package                    |    npm / Bun install |         npm / Bun modules |
| -------------------------- | -------------------: | ------------------------: |
| Root                       |     13.890 / 3.531 s |         464.3 / 469.5 MiB |
| `ui`                       |     12.359 / 2.768 s |         441.5 / 448.8 MiB |
| `site`                     |      6.089 / 1.495 s |         347.1 / 766.4 MiB |
| `editor`                   |      2.758 / 0.365 s |         176.6 / 176.4 MiB |
| `eslint-plugin`            |      1.127 / 0.238 s |           42.2 / 41.9 MiB |
| `create-kerf-component`    |      0.852 / 0.184 s |           38.0 / 38.0 MiB |
| `examples/reactivity-demo` |      0.671 / 0.200 s |          43.4 / 475.1 MiB |
| **Sum of observations**    | **37.746 / 8.781 s** | **1,553.1 / 2,416.1 MiB** |

The `site` Bun tree contained a 433.1 MiB copy of local Kerf, while npm's
`node_modules/kerfjs` was a compact local link (`du` reported 0 KiB).
The example showed the same pattern: 431.7 MiB under Bun and 0 KiB under
npm. Together these account for almost all of Bun's 863.0 MiB aggregate
module-tree increase. The site and example frozen installs both exited zero
while warning that the parent `package.json` changed after their Bun locks
were saved.

## Optional WASM resolution

On Linux, npm's site tree installed top-level `@emnapi/core@1.11.3` and
`@emnapi/wasi-threads@1.2.3`. The Bun tree had neither at the top level nor
under `@bruits/satteri-wasm32-wasi/node_modules`. The migrated Bun lock names
`@emnapi/core@1.11.1` and `@emnapi/wasi-threads@1.2.2`, but those versions
were also absent at the probed installed paths. The other six packages had
neither package at those paths with either installer. This is an observed
installation difference, not proof that the site's runtime WASM path fails.

After the Bun install, the Linux site job passed `npm run typecheck` and
`npm run build`; Astro built 54 pages. The trial did not execute the full
three-engine browser or release/provenance matrix against Bun-installed
trees. That gate belongs to a separate adoption decision. `KF-BW0Q5W`
tracks the unresolved optional-dependency path and qualification work if
the installer switch is reconsidered.
