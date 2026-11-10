# Bun frozen local-file peer mismatch (KF-0X25EY)

**The missing-selector failure is reproduced and explained by a local-file snapshot plus ancestor fallback.** Bun 1.4.4 installs the site's `file:..` Kerf peer before `dist` exists. Building the root afterward does not update that installed directory. TypeScript then selects the older transitive `kerfjs@4.4.1` declarations in the root `node_modules`, which do not export `selector`.

This is diagnosis and disposable candidate-policy evidence. Production remains npm. No canonical install/build reordering, production manifest/lock edit, npm fallback, global Bun link registration/config change, or installer adoption is part of this change. The exact Linux execution recorded below supplies the previously missing reproduction evidence; adoption remains a separate decision.

## Mechanism and minimal controls

[Bun documents](https://bun.com/docs/pm/global-cache) that ordinary local `file:` folders are copied/hardlinked, while [a path `link:` dependency](https://bun.com/docs/pm/cli/link#linking-a-directory-by-path) is a directory symlink and needs no global registration. [npm's default local-folder behavior](https://docs.npmjs.com/cli/v11/commands/npm-install/#install-links) is a symlink unless `install-links` is enabled.

The minimal fixtures use a hand-authored npm lock with a local link, Bun migration/frozen installation, or a separate offline npm `ci` control. They compare installing before `dist` exists and installing with an existing declaration, then create and atomically replace the source declaration:

| Installer / disposable policy                 | Installed directory | Source creates `selector: string` | Source atomically replaces it with `selector: number` |
| --------------------------------------------- | ------------------- | --------------------------------- | ----------------------------------------------------- |
| Bun `file:..`, no initial dist                | Copy                | Still no installed declaration    | Still no installed declaration                        |
| Bun `file:..`, prebuilt declaration           | Copy                | Still old `before` declaration    | Still old `before` declaration                        |
| npm local link, no initial dist               | Symlink             | Sees string declaration           | Sees number declaration                               |
| npm local link, prebuilt declaration          | Symlink             | Sees string declaration           | Sees number declaration                               |
| Bun explicit `link:..`, installed before dist | Symlink             | Sees string declaration           | Sees number declaration                               |

The minimal npm cases are independent controls, not a fallback for any Bun-installed repository tree. Each case records command output, manifest/declaration bytes and hashes, realpaths, symlink state and unchanged input hashes across source-output replacement.

## Actual archived repository case

The completed local run archived `9035cc7d850b10081fb059815ad29e16814353f9`. Toolchains: macOS arm64, Node **22.23.4**, npm **11.20.0**, Bun **1.4.4+38afee6c8**. The script preserves the relevant canonical order: root migrate/install → site migrate/install → root build → the real complete-example TypeScript gate. Root and site installs use migrated frozen Bun locks and the existing lifecycle policy; no build is inserted between the two installs.

| Observation                                                | Before root build                   | After root build                      |
| ---------------------------------------------------------- | ----------------------------------- | ------------------------------------- |
| Root package                                               | Kerf 5.0.0, no dist                 | Kerf 5.0.0, built dist                |
| Installed `site/node_modules/kerfjs`                       | Physical copy, not symlink; no dist | Same physical copy; still no dist     |
| Installed peer manifest                                    | Byte-identical to root manifest     | Still byte-identical to root manifest |
| Ancestor `node_modules/kerfjs`                             | Kerf 4.4.1, existing declarations   | Same Kerf 4.4.1 declarations          |
| Actual declaration selected from the row-selector consumer | Ancestor 4.4.1                      | Ancestor 4.4.1                        |

The root's locked `domotion-svg` dependency brings in `kerfjs@^4.4.0`, resolved as 4.4.1. The TypeScript 6 bridge resolver records the actual declaration path, package identity and raw declaration bytes. The independent native TypeScript 7 command used by the canonical gate then exits **1** with the exact original failure:

```text
site/src/examples/complete/row-selector/main.tsx(26,3): error TS2305: Module '"kerfjs"' has no exported member 'selector'.
```

Selected ancestor declaration SHA-256: `a6031546a72ce4efe6c6b0999ae241dd1d90532237db216494a2641c73608d97`.
Fresh root declaration SHA-256: `bbaab48f7f69cbf93f6287ec029b76c82f6ae8d789a691115fdec2f999d6732a`.
The installed file snapshot has no declaration to hash even after that fresh build.

The migrated site lock's dependency-metadata warning is also reproduced and retained. However, the installed peer's real `package.json` is identical to the root's 5.0.0 manifest, while its generated declarations are absent. The export error is therefore not explained by the installed manifest becoming version 4.4.1 or by a stale root build: the observed resolver selected the separate ancestor package. Original Linux artifacts lacked installed bytes, so this is an exact-failure reproduction from the same canonical inputs, not a claim to have recovered historical files that were never retained.

## Separate Bun-native link policy experiment

After retaining the failed baseline, the probe moves only its owned root build output aside. It explicitly changes the **disposable** site dependency to `link:..`, generates a new candidate Bun lock, and installs that frozen candidate while root `dist` is absent. No user/global Bun link registry is involved.

Before the fresh policy build, the peer is already a directory symlink but no declaration exists, and resolution still falls back to 4.4.1. After the ordinary root build, the same link exposes the new 5.0.0 declaration. Its bytes/hash equal the root output, resolution selects `dist/index.d.ts` from the root, and the unchanged complete-example typing command exits **0**.

Only the disposable site manifest and site Bun lock are allowed policy changes. Canonical root/site npm locks and root manifest remain unchanged; the policy's hashes remain unchanged across its fresh build. This demonstrates a supported candidate direction without silently repairing the baseline. Applying a production or qualification-wide link policy is a separate adoption decision; the broader Bun matrix remains required.

## Evidence and reproduction

```sh
BUN_QUALIFICATION_EVIDENCE=<outside-checkout-evidence-dir>   node scripts/bun-local-peer-probe.mjs .
```

The script requires exact Bun 1.4.4 on PATH (`BUN_BINARY` can override the executable), records Node/npm/Bun versions and revision, archives committed HEAD into an owned temporary repository, and uses an isolated Bun cache. Its minimal npm control is offline. All full-repository dependency installation is Bun-only. It retains raw commands, actual peer and resolver-selected package/declaration bytes, before/after hashes, canonical manifests/npm locks, both frozen Bun locks and the separate link-policy files. It removes its owned fixture after saving evidence.

Assertions require the original missing-selector failure, snapshot invisibility, live-link create/replace visibility, a clean successful candidate typing process, unchanged canonical/frozen inputs, and matching source/link declaration bytes. An unexecuted or changed diagnosis cannot silently count as the expected result.

`local-peer.json` SHA-256: `269ff102d2d45b12a7d3185fdeb8cdcd3f3c340301bc033a34fce01b9306b6cd`. The evidence bundle is attached to the ticket; it contains exact raw inputs and complete per-stage observations rather than only package counts.

Canonical root manifest/npm-lock hashes: `acca6cd5646cf25666ec561d35585f7f89f7d827e554099439526475718144c9` / `5e833638ed0529875f869a6499860107fd3158cfcee2a93a0247f97701ee39c8`.
Canonical site manifest/npm-lock hashes: `eed4e3acc0997daeb21942dadd15293858baeeed0f96de3670d0a0ec47cc3249` / `3d9f1d30172935aaeb2be7e85609bf4c517ea1287fa1f24e7210f6c6d78633e0`.

Three unit regressions exercise real compiler fallback and filesystem copy/symlink/atomic-replacement behavior. The full local script separately executed all five real-installer minimal cases, the exact repository-order baseline and the fresh-build link-policy counterfactual. At that initial local checkpoint, Linux execution remained unverified; these macOS results did not stand in for it. The following section records the subsequent exact-commit Linux run and artifact.

## Exact Linux reproduction and separate link candidate

[Run 42783619516](https://github.com/brianwestphal/kerf/actions/runs/42783619516)
passed its diagnostic assertions at exact source/workflow SHA
`d08decc8cfbf93a1ddbe1e3d8afb867fb38cf6a2`. Only `local-peer` ran; other job
groups were skipped. The asserted toolchain was Linux x64, Node **22.23.4**,
npm **10.9.9**, and Bun **1.4.4+38afee6c8**.

All five minimal cases reproduced the copy-versus-live-link table above,
including declaration creation and atomic replacement, with unchanged inputs.
The npm cases were independent offline controls. Every full-repository install
used Bun; npm only dispatched the existing root build script.

The canonical-order repository baseline reproduced the original warning and
exact native TypeScript 7 error:

```text
warn: dependencies in ../package.json changed since lockfile was saved (run 'bun install')
site/src/examples/complete/row-selector/main.tsx(26,3): error TS2305: Module '"kerfjs"' has no exported member 'selector'.
```

The installed site peer was a physical copy whose 5.0.0 manifest hash matched
the root, but whose declaration remained absent after the root build. The
TypeScript bridge resolver selected ancestor `kerfjs@4.4.1` at
`node_modules/kerfjs/dist/index.d.ts`; its declaration hash was
`a6031546a72ce4efe6c6b0999ae241dd1d90532237db216494a2641c73608d97`.
The fresh root declaration hash was
`bbaab48f7f69cbf93f6287ec029b76c82f6ae8d789a691115fdec2f999d6732a`.
The baseline native compiler exited **1**, cleanly, with all frozen inputs
unchanged. This establishes the observed missing-build-visibility and ancestor
fallback mechanism, rather than attributing the export failure to the metadata
warning alone.

The separate disposable `link:..` policy installed a live directory link while
root `dist` was absent. After the ordinary fresh root build, it exposed exactly
the root declaration bytes, resolved package 5.0.0 at `dist/index.d.ts`, and the
unchanged native TypeScript command exited **0** without a signal or timeout.
Only the declared disposable site manifest and site Bun lock changed policy;
canonical manifests/npm locks and all post-policy build input hashes stayed
within the recorded boundary.

The [portable Linux summary](2026-11-10-bun-local-peer-linux-results.json)
retains exact run/job/toolchain identity, all five minimal observations, actual
peer paths/manifests/declaration hashes, resolver identities, compiler output,
input boundaries, eleven raw-file hashes and the artifact digest. Artifact
`local-peer-d08decc8cfbf93a1ddbe1e3d8afb867fb38cf6a2` retains the full raw
bytes and commands. This is a later exact-input reproduction, not recovery of
historical installed files that the original d5 run did not retain.

The investigation now has real Linux evidence. The original frozen candidate
still fails; the link-policy candidate is separate and has not received the
full adoption matrix. Production npm remains unchanged and installer adoption
remains **NO GO**.
