# Actual stable CLI Linux plan (KF-Y9A9XE)

[Run 42783623509](https://github.com/brianwestphal/kerf/actions/runs/42783623509)
passed at exact source/workflow SHA
`d08decc8cfbf93a1ddbe1e3d8afb867fb38cf6a2`. Only `stable-plan` ran; all other
job groups were skipped. The job asserted Linux x64, Node **22.23.4**,
npm **10.9.9**, Bun **1.4.4+38afee6c8** and exact checkout identity. Node and
npm executed the plan; Bun's presence is not a Bun-runtime qualification.

The self-contained probe archived that committed tree, created an isolated
clean `main` repository without a remote, and committed a nonempty notes file
before taking its initial snapshot. It then invoked the actual committed CLI:

```sh
bash scripts/release.sh --dry-run --version 999.0.0 --notes qualification-notes.md --skip-checks
```

The command exited **0** without a signal or process error. It printed the
stable operation plan, explicitly used local tags without fetching, explicitly
reported skipped current-tree checks, and reported no release mutation.
Independent before/after evidence confirms identical hashes for every tracked
file, identical HEAD and refs, identical root entries and clean Git status.
The complete hashes and raw stdout/stderr are retained in the artifact rather
than inferred from the CLI's success message.

The [portable evidence summary](2026-11-10-stable-cli-linux-results.json)
records the tracked-file count, fixture and source identities, raw-file/log
hashes, run/job identity, toolchain and artifact digest. Artifact
`stable-plan-d08decc8cfbf93a1ddbe1e3d8afb867fb38cf6a2` retains all four raw
files, including the full byte/ref snapshots.

This exercises the newly implemented stable **read-only plan**, closing the
previous actual-CLI exercise gap. Current-tree checks were deliberately skipped
in this bounded command; their default execution and failure propagation remain
covered by the separately tested guarded CLI suites. The command prepared no
versioned artifact. The eight earlier stable/beta actual-byte pack and offline
publish dry-runs at `b7273e3c` are separate evidence and are not relabeled as a
whole-script stable artifact release.

No real release, registry publication, tag, push or production installer change
occurred. This result does not requalify the original d5 seven-tree Bun candidate
or change the broader **NO GO** decision for installer adoption.
