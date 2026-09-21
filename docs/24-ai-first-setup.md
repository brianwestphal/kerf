# 24. AI-first project setup

`npx kerfjs setup` installs Kerf's authoring contract into an existing project.
It is a project configurator, not an application generator: it merges the
guidance, TypeScript, ESLint, catalog, and doctor surfaces that give humans and
AI contributors immediate deterministic feedback.

## 24.1 Safe by default

The default is a bounded, value-level dry run:

```sh
npx kerfjs setup
npx kerfjs setup --package @acme/app
npx kerfjs setup --ui
```

Nothing is written until both `--write` and `--yes` are present:

```sh
npx kerfjs setup --write --yes
```

The planner detects `kerfjs` and `@kerfjs/ui` from package declarations or
source imports. Multiple candidates require `--package <name-or-path>`; no
detected usage requires `--core` or `--ui`. Core setup never adds UI.

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

Existing `tsconfig.json` files are parsed as JSONC. Structural setup edits keep
comments, trailing commas, authored fields such as `extends` and `include`, and
the file's line endings while adding or updating only recommended compiler
options. Malformed JSONC fails closed. A non-object document root or
`compilerOptions` container is never guessed: it receives its own stable
conflict and must be resolved with `keep` or `kerf`.

## 24.2 Managed and authored content

`.kerf-ai-setup.json` schema v2 stores package-scoped hashes for managed fields
and files, the running Kerf version, package paths, package manager, and retained
`keep` decisions. An unchanged managed value upgrades automatically. A value
changed after setup becomes a conflict. Guidance below
`<!-- KERF-APP-CANONICAL-END · your customizations below -->` stays app-owned
through upgrades.

Writes use a workspace lock, preimage checks, unique temporary files, and
atomic renames. Stale plans, symlink escapes, and paths outside the workspace
are rejected. Failed installation restores planned files, lockfiles, and
generated catalog output. `--offline` forbids registry access; `--no-install`
writes configuration when dependencies are provisioned separately.

## 24.3 Installed surfaces

Core setup adds the shipped guidance, strict JSX-oriented TypeScript options,
the Kerf ESLint preset, and `kerf:check`. UI setup additionally adds doctor and
catalog scripts, an empty schema-valid `kerf.components.json`, and a
package-qualified generated catalog in `.kerf-ui-profile.json`. The empty
metadata source is deliberate: app components are added as authored while its
empty v2 catalog is already valid for discovery.

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
