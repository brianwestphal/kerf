# 24. AI-first project setup

`npx kerfjs setup` installs Kerf's authoring contract into a project. It merges
guidance, TypeScript, ESLint, catalog, and doctor surfaces that give humans and
AI contributors immediate deterministic feedback. UI mode also creates a
runnable application and UX demo when the selected package has no app source.

## 24.1 Safe by default

The default is a bounded, value-level dry run:

```sh
npx kerfjs setup
npx kerfjs setup --package @acme/app
npx kerfjs setup --ui
npx kerfjs setup --root ../monorepo --package @acme/app
npx kerfjs setup --guidance-source AGENTS.md
```

`--root <path>` names the workspace root (default: the current directory);
workspace discovery, the lock, and `.kerf-ai-setup.json` are all relative to
it.
`--guidance-source <path>` selects an existing shared workspace document such as
`AGENTS.md`. Setup then writes an import-only Claude skill that points to that
document. The document must be inside the workspace and mention Kerf and either
`kerf:check` or the project's `npm run check` gate. The choice persists across setup runs. The lint rule
checks the import and its source; the shared document remains project-owned.
In UI mode, setup also installs `.claude/skills/kerf-ui/SKILL.md`. It directs
contributors to read the installed `node_modules/@kerfjs/ui/llms.txt` first,
then `node_modules/@kerfjs/ui/ai/skill.md` and the referenced component
contracts. With shared guidance, the UI skill imports that document and keeps
the same retrieval pointers. The dry-run summary prints these paths relative
to the selected package, including its workspace path when applicable, and
`kerfjs/ai-assistant-configs` checks the UI skill for missing or drifted content.

Nothing is written until both `--write` and `--yes` are present:

```sh
npx kerfjs setup --write --yes
```

The planner detects `kerfjs` and `@kerfjs/ui` from package declarations or
source imports. Multiple candidates require `--package <name-or-path>`; no
detected usage requires `--core` or `--ui`. Core setup never adds UI.
Workspace discovery evaluates npm/Yarn and `pnpm-workspace.yaml` patterns in
declaration order, including `**`, braces, exclusions, and later re-inclusions.
Results are deduplicated and sorted, symlink/path escapes are rejected, and a
duplicate package name must be selected by its unambiguous relative path.

Authored values are not silently overwritten. Every conflict has a stable id
and requires an explicit, repeatable choice:

```sh
npx kerfjs setup \
  --resolve 'package.json#scripts.kerf:check=keep' \
  --resolve 'tsconfig.json#compilerOptions.strict=kerf' \
  --write --yes
```

`keep` records the project decision; `kerf` applies the recommendation.
Unknown, stale, or invalid decisions fail. There is no blanket force flag.

Non-conflict value proposals print a `PROPOSAL <id>` line. A project can decline
an unused dependency, script, compiler option, or catalog/profile value with
`skip`, even when the value is missing:

```sh
npx kerfjs setup --ui \
  --resolve 'package.json#devDependencies.@stylistic/eslint-plugin=skip' \
  --resolve 'package.json#scripts.catalog:generate=skip' \
  --resolve 'package.json#scripts.catalog:check=skip' \
  --write --yes
```

The decision persists for the selected package; subsequent dry runs leave the
declined value alone. To adopt it later, use the same id with `=kerf`. `skip`
also holds an unchanged managed value at its current version instead of
upgrading it. An authored change that introduces a conflict still requires
`keep` or `kerf`; `skip` cannot conceal that conflict. Satisfied or no-longer-
applicable declines are removed from state on the next write. File creation
and canonical guidance merges do not expose value-proposal ids.

Declines are individual project decisions: setup does not rewrite the other
recommended scripts or ESLint configuration to compensate for omitted tools.
Keep or adapt those surfaces to the project's own gate. Setup does not run
catalog generation when its script, generator dependency, or catalog
configuration is absent after applying the plan.

One conflict id is not a path: **`kerfjs-version`** fires when the running
setup's version differs from the `kerfjs` already installed in the selected
package. Rerun with the matching `npx kerfjs@<installed>` setup, or resolve it —
`keep` retains the project's `kerfjs` declaration and `kerf` updates it to the
running setup's version (the choice carries over to the
`package.json#…kerfjs` dependency entry).

Existing `tsconfig.json` files are parsed as JSONC. Structural setup edits keep
comments, trailing commas, authored fields such as `extends` and `include`, and
the file's line endings while adding or updating only recommended compiler
options. Malformed JSONC fails closed. A non-object document root or
`compilerOptions` container is never guessed: it receives its own stable
conflict and must be resolved with `keep` or `kerf`.

## 24.2 Managed and authored content

`.kerf-ai-setup.json` schema v2 (its JSON Schema ships as the
`kerfjs/setup/state.schema.json` export) stores package-scoped hashes for managed fields
and files, the running Kerf version, package paths, package manager, and retained
`keep` and `skip` decisions. Schema-v1 state files (a single package's state at the top
level) are still read and are rewritten as v2 on the next write. An unchanged
managed value upgrades automatically. A value
changed after setup becomes a conflict. Guidance below
`<!-- KERF-APP-CANONICAL-END · your customizations below -->` stays app-owned
through upgrades.

Writes use a workspace lock, preimage checks, unique temporary files, and
atomic renames. Stale plans, symlink escapes, and paths outside the workspace
are rejected. Failed installation restores planned files, lockfiles, and
generated catalog output. `--offline` forbids registry access; `--no-install`
writes configuration when dependencies are provisioned separately.
npm and pnpm use their native offline mode. Yarn Classic uses its offline
workspace install, while Yarn Berry disables network access and requires an
unchanged project cache. When a Yarn lock/configuration cannot identify Classic
versus Berry, setup fails with guidance to declare `packageManager` as a numeric
`yarn@<version>` instead of guessing.

## 24.3 Installed surfaces

Core setup adds the shipped guidance, strict JSX-oriented TypeScript options,
the Kerf ESLint preset, and `kerf:check`. UI setup additionally adds a full
`check` gate, Prettier (120 columns and single quotes), typed strict ESLint,
`noUncheckedIndexedAccess`, a zero-warning doctor configuration, catalog scripts,
an empty schema-valid `kerf.components.json`, and a
package-qualified generated catalog in `.kerf-ui-profile.json`. The empty
metadata source is deliberate: app components are added as authored while its
empty composition catalog is already valid for discovery.
If `kerfComponentCatalog.selectionOutput` is configured, the metadata source
must already exist with an authored, nonempty `description`. Setup reports the
missing decision before writing a plan; it does not invent selection copy.

What gets written (each value is merged, never silently overwritten — an
authored difference becomes a conflict):

- **Guidance** — `.claude/skills/kerf-app/SKILL.md` always, and `.cursorrules`
  when the workspace root already has `.cursor/` or `.cursorrules`; the
  canonical section is merged and the append zone below the marker is kept.
- **`package.json` scripts** — core `kerf:check` runs `tsc --noEmit && eslint .`;
  UI `check` and `kerf:check` run Prettier, ESLint with zero warnings,
  TypeScript, `kerf-component-catalog --check`, and `kerf-ui-doctor --full`.
  The `lint` script runs Prettier before ESLint. A newly generated app also
  runs its structural test and Vite build in `check`. UI mode also adds `kerf:doctor` (`kerf-ui-doctor --full`), `kerf:doctor:changed`
  (`kerf-ui-doctor --changed`), `catalog:generate`
  (`kerf-component-catalog --write`), and `catalog:check`
  (`kerf-component-catalog --check`). In a workspace package the doctor
  scripts also carry `--root <root> --package <name>`. If the selected package
  already has `.kerf-ui-doctor.json`, setup passes its path with `--config` so
  the package's fail threshold, ownership rules, and enabled stages remain in
  force under the workspace root.
- **`package.json` devDependencies** — `eslint-plugin-kerfjs` (the setup
  version), `@typescript-eslint/parser` `^8.0.0`, `eslint` `^9.0.0`,
  `typescript` `^5.0.0 || ^6.0.0`, and, in UI mode, `create-kerf-component`
  (the setup version).
- **`package.json` dependencies** — `kerfjs` (and `@kerfjs/ui` in UI mode) at
  the setup version, unless the existing declaration already allows it; an
  existing entry in `devDependencies` / `peerDependencies` stays in that
  section.
- **`package.json#kerfComponentCatalog`** (UI mode) —
  `{ "source": "./kerf.components.json", "output": "./component-composition.json" }`;
  both paths must stay inside the selected package.
- **`tsconfig.json`** — `target: ES2022`, `module: ESNext`,
  `moduleResolution: Bundler`, `strict: true`, `jsx: react-jsx`,
  `jsxImportSource: kerfjs` (a new file also gets `include: ["src"]`). UI mode
  additionally enables `noUncheckedIndexedAccess`.
- **ESLint config** — core setup merges an existing
  `eslint.config.{js,mjs,cjs}`. UI setup requires an explicit `keep` or `kerf`
  choice for an authored config that differs from its full baseline; it never
  treats a preset-only merge as the complete gate. Otherwise
  `eslint.config.mjs` is generated. A fresh UI config uses
  `typescript-eslint` `strictTypeChecked`, the Kerf UI preset, strict boolean
  and exhaustive switch rules, sorted imports, self-closing JSX, unused-disable
  errors, and a ban on `prettier-ignore` comments.
- **UI formatter and doctor** — a missing `prettier.config.mjs` sets 120 columns
  and single quotes unless the package already has a Prettier config. A missing
  `.kerf-ui-doctor.json` sets `failOn: warning` and empty suppressions. Existing
  files are preserved.
- **Fresh UI app** — if no `src/`, root `index.html`, Vite config, or `app/`
  exists, setup adds `src/app`, `src/components`, `src/features`, `src/platform`,
  `src/shared`, `src/ux-demo/demos`, an ownership structure test, Vite entries,
  and a `/ux-demo/` page mounting the public Kerf `Catalog` with a Button
  specimen. Reruns update unchanged setup-managed files and require an explicit
  `keep` or `kerf` choice before replacing a customized scaffold file. Existing
  app routes and sources are left in place.
- **UI catalog files** — the resolved `kerfComponentCatalog.source` (only when
  absent) and the workspace-root `.kerf-ui-profile.json`. The profile points to
  the resolved `kerfComponentCatalog.output` in the selected package, including
  authored paths retained with a `keep` resolution. If `selectionOutput` is
  configured, the profile points to that resolved selection catalog too.
- **`.kerf-ai-setup.json`** — the state file described in §24.2.

## 24.4 Automation API

The pure planner/formatter and transactional applier ship at `kerfjs/setup`:

```js
import { applyKerfSetup, formatSetupPlan, planKerfSetup } from 'kerfjs/setup';

const plan = await planKerfSetup({ root, package: '@acme/app' });
console.log(formatSetupPlan(plan));
await applyKerfSetup(plan, { offline: true });
```

Automation should present the plan before applying it and re-plan after any
concurrent project change.

Related contracts: [AI-assistant configs](./12-ai-assistant-configs.md),
[component packages](./13-component-packages.md), and
[`@kerfjs/ui`](./21-ui-package.md).
