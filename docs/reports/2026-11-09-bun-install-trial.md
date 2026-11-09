# Bun dependency-install trial (KF-61KFXW)

**Decision: keep npm for dependency installation.** Bun 1.4.4 passed the
existing Node-run gates in a disposable checkout, but the seven-package cold
install total was slightly slower than npm on this machine (20.8 versus 19.7
seconds). Warm installs saved about 5.2 seconds in total. Bun used about 895
MiB more across the seven `node_modules` trees, mostly because the site and
reactivity example copy their local `file:` Kerf dependency. That gain does not
currently justify a second set of seven production lockfiles, changes to six
CI/release workflows, and a different dependency-script trust policy.

## Scope and method

The trial ran on macOS 27.2 arm64 with Node 22.23.2, npm 10.9.8, and the
official portable Bun **1.4.4** binary (`38afee6c8`). The repository's installed
Bun 1.3.10 was also checked to distinguish a version-specific install defect.
All lock migration and installs occurred in a disposable worktree. No
production `package.json`, `package-lock.json`, or CI install command changed.

Each package got a fresh, separate cache for each manager. A **cold** run had
no `node_modules` and an empty cache; a **warm** run removed only
`node_modules` and reused that manager's cache. Runs were sequential on the
same Mac. After `bun pm migrate` created `bun.lock` from each npm lock, the
commands were:

```sh
npm ci --no-audit --no-fund --cache <package-npm-cache>
BUN_INSTALL_CACHE_DIR=<package-bun-cache> bun install --frozen-lockfile
```

Times are one wall-clock observation per state, not
medians. Disk figures are warm-state `du -sk` results rounded to MiB, with the
cache measured separately. These isolated per-package caches are useful for a
fair cold comparison; their sum is not a prediction for one shared global
cache.

| Package                    |     npm cold / warm | Bun 1.4.4 cold / warm | npm modules / cache |   Bun modules / cache |
| -------------------------- | ------------------: | --------------------: | ------------------: | --------------------: |
| Root                       |       6.07 / 3.19 s |         3.39 / 0.60 s |        393 / 99 MiB |         401 / 399 MiB |
| `ui`                       |       3.98 / 3.27 s |         4.67 / 0.47 s |        408 / 94 MiB |         417 / 417 MiB |
| `site`                     |       4.20 / 2.28 s |         6.77 / 2.98 s |       275 / 108 MiB |         708 / 263 MiB |
| `editor`                   |       2.42 / 1.90 s |         1.13 / 0.19 s |        168 / 34 MiB |         168 / 168 MiB |
| `eslint-plugin`            |       0.94 / 0.53 s |         0.43 / 0.04 s |          41 / 8 MiB |           41 / 41 MiB |
| `create-kerf-component`    |       0.75 / 0.49 s |         0.48 / 0.03 s |          37 / 7 MiB |           37 / 37 MiB |
| `examples/reactivity-demo` |       1.34 / 0.69 s |         3.93 / 2.81 s |         41 / 10 MiB |          486 / 41 MiB |
| **Sum**                    | **19.70 / 12.35 s** |    **20.80 / 7.12 s** | **1,363 / 360 MiB** | **2,258 / 1,366 MiB** |

The site and reactivity example declare `kerfjs` as `file:..` and `file:../..`
respectively. Bun 1.4.4 installs a copy of the parent repository in each
package rather than npm's compact local layout. In Bun 1.3.10, those installs
even copied nested `node_modules/kerfjs` paths recursively: both install
commands reported success, but disk traversal reached `ENAMETOOLONG` and the
trees had to be cleared. Bun 1.4.4 avoids that recursion; using 1.3.10 for a
switch would be unsafe. Even with a fresh 1.4.4 migration, frozen installs of
`site` and the example warned that dependencies in the parent `package.json`
had changed since the lock was saved; the installs still exited successfully.

## Lockfiles, scripts, and workflows

There are seven independent npm lockfiles: root (505 package entries), `ui`
(445), `site` (464), `editor` (221), `eslint-plugin` (112),
`create-kerf-component` (88), and `examples/reactivity-demo` (67). Bun 1.4.4
migrated all seven to its text `bun.lock` format without changing the npm
lockfiles. All **77 directly declared registry dependencies** resolved to the
same versions. The remaining graph comparison differs in representation:
`typescript7` is an npm alias for `typescript@7.0.2`; Bun records the package
name in the lock entry. The site Bun lock omits npm's extra nested optional
`@emnapi/core@1.11.3` and `@emnapi/wasi-threads@1.2.3` variants while retaining
the other versions. The platform-specific optional paths were not exercised
on this Mac. See the [Bun lockfile documentation](https://bun.com/docs/pm/lockfile)
for migration and frozen-install behavior.

The root's `prepare: husky` and the site's
`preinstall: node scripts/check-install-script-policy.mjs` both ran under Bun;
the site policy check passed. Native build tools also worked through the gates
below. Bun's [dependency-script policy](https://bun.com/docs/pm/lifecycle)
blocked `domotion-svg@0.35.0`'s `postinstall` in root and UI (`bun pm untrusted`
reported it). That script only copies a private workspace from `assets/git-install`
when that source exists; it is a no-op for the registry tarball used here. A
switch would still require an explicit review of this trust difference and of
the site's npm `allowScripts` policy.

All six relevant workflow files use npm: `ci.yml`, `pages.yml`, `release.yml`,
`release-ui.yml`, `release-eslint-plugin.yml`, and
`release-create-kerf-component.yml`. CI installs each package with `npm ci`;
release jobs use npm for installs, `pack`, and provenance publishing. The root
has 23 package scripts invoking `npm`/`npx`, UI has 16, site five, and the
editor, plugin, and scaffold each have one. This trial changes only the
installer in the candidate, so those scripts continued to run through Node
and npm. Adopting Bun for installs would leave npm present for those scripts
and release publishing unless those paths were separately redesigned.

## Gate results with Bun-installed dependencies

- `npm run check:core` passed with Bun 1.4.4-installed trees. Its package-gate
  selection ran `ui:check`, `eslint-plugin:check`,
  `create-kerf-component:check`, and `editor:check`; root lint, typecheck,
  coverage, build, dist typing, package, and documentation checks passed.
- Site `npm run typecheck`, `npm run build`, and `npm run check:audit` passed.
  The audit needed network access to return a complete report and found no
  high or critical findings.
- Root `npm pack --dry-run` passed. Chromium passed all 22 complete example-app
  browser tests and all seven `ui/tests/browser/paged-view.spec.ts` tests.

The full three-engine browser matrix and Linux install performance were not
measured locally. Existing CI and release workflows still install with npm,
so a future switch would need its own Linux matrix and a rollback to these npm
lockfiles and install commands. For now the measured warm speed saving is too
small against the local-copy disk cost and migration scope to replace npm.
`KF-24ZZVB` tracks the Linux and optional-dependency validation if adoption is
reconsidered.
