# Upgrading Kerf in an application

`kerfjs`, `@kerfjs/ui`, `eslint-plugin-kerfjs`, and `create-kerf-component` release in lockstep. Keep all four at **one exact version** in the consuming package (in the dependency section appropriate to each package), commit the lockfile, and assert the four declarations are equal in a small manifest test. Do not let a caret range quietly upgrade one member ahead of the others. Check the installed tree with your package manager after installation as well as the declarations.

For example, a Node test in `tests/kerf-versions.test.mjs` can read `package.json`, collect those four names from `dependencies` and `devDependencies`, assert that all four exist, match an exact semver string, and form a set of size one. Put that test in the application's normal check gate.

## Upgrade sequence

1. Choose a released version and update all four declarations together. Install with the project's package manager and inspect the resulting lockfile and `npm ls kerfjs @kerfjs/ui eslint-plugin-kerfjs create-kerf-component --depth=0` (or its pnpm/Yarn equivalent). Keep the package-version assertion in the regular check gate.
2. Run `npx kerfjs@<version> setup --ui` as a dry run for the selected application package. Review every proposed change and resolve authored conflicts deliberately. Then apply with `npx kerfjs@<version> setup --ui --write --yes`, retaining any required `--package` and `--resolve` options. The running setup version must match the installed `kerfjs`; a `kerfjs-version` conflict means the versions differ.
3. Regenerate the consuming application's catalog with `npm run catalog:generate` and check it with `npm run catalog:check`. Review generated changes rather than editing the projection by hand. Run `npm run kerf:check`, the application's own lint, type, unit, and browser suites, and inspect affected screens in both wide and narrow layouts.
4. Re-read the installed [`ai/skill.md`](../ai/skill.md), [`llms.txt`](../llms.txt), [component selection](./component-selection.md), and the release changelog. Check whether new Kerf primitives replace local code or newly `Discouraged` Web Awesome elements. Remove workarounds, CSS overrides, doctor suppressions, and profile exceptions made obsolete by this version; rerun the gate after each cleanup.

For a workspace, run setup and checks against each consuming package, using `--package` where discovery finds more than one candidate. Record any remaining exception with its owner and removal condition.
