# Sketch job runner

The repository's native Sketch jobs reuse the running app. They never launch
another instance to work around a slow or failed command. The host runner and
native session adapter are under `ui/scripts/sketch/`.

This is maintenance infrastructure for the Sketch export pipeline, not a runtime
dependency of `@kerfjs/ui`. It requires macOS, Sketch with a valid license, and the
repository's Node toolchain. Run Node commands through the configured login shell.

## Run a task

From `ui/`:

```sh
node scripts/sketch/runner.mjs run scripts/sketch/runner.sketchplugin/Contents/Sketch/check-task.js
node scripts/sketch/check-runner.mjs
```

The second command verifies repeated success, deliberate failure, cancellation,
and deadline runs. It compares app process IDs and native document/Library
inventories, and writes a report in the runner's temporary state directory.
Native verification is a separate explicit command: an unavailable Sketch
installation or blocked app access is an error, never an automatic pass in CI.

## Task contract

Tasks export `run(session, parameters, done)` through CommonJS for Sketch's plugin
loader. Finish with `done(error, result)` exactly once; repeated calls are harmless.
Keep native asynchronous document operations in the session wrappers:

- `createDocument()` creates and tracks an owned document.
- `openDocument(path, callback)` tracks newly opened documents and preserves ones
  that were already open.
- `saveDocument(document, path, callback)` waits for the native save callback.
- `closeDocument(document)` permits early close/reopen verification only for a
  document owned by the session.
- `library(path)` records only newly registered Libraries for later removal.
- `check()` checks cancellation/deadline state before synchronous work.
- `dom` provides Sketch's JavaScript API for trusted repository tasks. It is not a
  sandbox: tasks must not modify user documents or register untracked resources.

The session retains a Sketch fiber until pending document operations settle.
Fiber teardown closes owned documents and removes owned temporary registrations;
it preserves existing documents, unsaved user work, existing Library registrations,
and the application itself. Do not call application-wide quit/kill or cleanup all
open documents. Resource acquisition during a job must use these wrappers.

## Serialization, cancellation, and recovery

The shared per-user temporary state directory uses an OS advisory `host.lock`
(macOS `lockf`, Linux `flock` for host tests) to serialize metadata changes and
complete native jobs. It also has one `active` cleanup journal and a unique
job directory containing `job.json`, `resources.json`, and `status.json`.
Production commands must use this shared state directory. An additional native
session reservation rejects overlapping jobs inside the app.

SIGINT/SIGTERM or an expired deadline writes `cancel.json`. The native timer
observes it and waits for pending native callbacks before releasing its fiber.
The host releases the lock only after native cleanup acknowledges completion.
If Sketch is nonresponsive or cleanup fails, the host reports a bounded failure
and keeps the lock, rather than launch another app or kill the existing one.

After the owning runner exits, request recovery with:

```sh
node scripts/sketch/runner.mjs recover
```

A live native job must acknowledge cancellation itself. A terminal cleanup
failure can retry only the journaled owned resources, excluding protected IDs.
If Sketch crashed, recovery acknowledges that the old process and its resources
are gone. Another running Sketch process cannot clean up a live owner's resources.
Do not manually delete an active lock to force another job through.

An existing modal file dialog in Sketch can prevent plugin dispatch. A bounded
launch failure retains the cleanup journal because delivery may be ambiguous.
Finish or dismiss that dialog yourself, run `recover`, and wait for cleanup
acknowledgement before retrying. The runner must not dismiss user dialogs.

The export pipeline and generated Symbols are tracked separately in KF-MKW7QZ;
this runner alone does not generate the component catalog.
