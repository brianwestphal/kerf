# HTTPS browser dependency installation (KF-7RRYQ8)

[Linux probe 42777529099](https://github.com/brianwestphal/kerf/actions/runs/42777529099)
passed at exact SHA `56e4394d992a1ab27d4cfde47676720a7ba3a352`.
Only the explicit `browser-apt` scope ran; nineteen other job groups were skipped.
This proves the dependency setup and smoke controls below, not Bun adoption or
the full application matrix.

The runner used Ubuntu 24.04 image `20261101.360.1`, Node 22.23.4,
npm 10.9.9 and Bun 1.4.4. Root dependencies were installed from the migrated
frozen candidate. Its manifest, npm-lock and Bun-lock hashes match the original
root-browser control. The retained configuration shows HTTPS for every recognized
Ubuntu endpoint and effective `Acquire::Retries=1`, HTTP timeout 15 seconds and
HTTPS timeout 15 seconds. No HTTP Ubuntu fetch/ignore line appears after setup.

| Observation                                  | Original root-browser control | HTTPS probe                                |
| -------------------------------------------- | ----------------------------- | ------------------------------------------ |
| APT index                                    | 13.0 MB in 1 second           | 13.0 MB in 5 seconds                       |
| APT packages                                 | 114 MB in 13m04s              | 114 MB in 32 seconds                       |
| Combined three-browser install               | about 13m25s, cached binaries | 65 seconds, fresh browser downloads        |
| Chromium/Firefox/WebKit launch and rendering | covered by application tests  | all three smoke checks passed in 7 seconds |

The comparison is a single-run observation, not a guaranteed speedup or a
statistical benchmark. The same runner image and root dependency inputs were
used; network conditions may differ. Earlier editor WebKit/Firefox controls
also showed repeated HTTP-to-HTTPS fallback and much longer APT transfers, but
used a different leaf Playwright revision and are not treated as identical
browser-binary controls here.

The probe downloaded Chrome for Testing 153.0.8010.12 (Chromium build 1243),
Firefox 155.0 (build 1543) and WebKit 26.6 (build 2359). Each engine launched,
rendered a real page and exited normally. The install step retained its
15-minute failure bound; the job retained its 20-minute bound.

`scripts/configure-browser-apt.mjs` changes only recognized Ubuntu endpoints in
mirror/direct/deb822 source files, preserves unrelated repositories and records
effective settings. Unknown layouts fail before writing acquire configuration;
comments cannot masquerade as active Ubuntu sources. Existing install/test
commands and publication permissions are unchanged. Canonical CI and the UI
release validation job use the same setup and bounds.

The [portable evidence summary](2026-11-10-browser-apt-results.json) retains
input/configuration/log hashes, tool versions, timings and exact run identity.
Raw configuration, effective APT settings and frozen input locks are in artifact
`browser-apt-56e4394d992a1ab27d4cfde47676720a7ba3a352`; raw command logs remain
in the linked run. Covering main CI is separately tracked by the integrator.
