import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyzeRecipeSource,
  recipeClassVocabulary,
} from './lib/catalog-demo-conformance.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const [
  artifact,
  packageJson,
  loaders,
  docs,
  selection,
  skill,
  llms,
  adapter,
  shellStyles,
] = await Promise.all([
  readFile(resolve(root, 'ai/component-catalog.json'), 'utf8').then(JSON.parse),
  readFile(resolve(root, 'package.json'), 'utf8').then(JSON.parse),
  readFile(resolve(root, 'ux-demo/recipes/loaders.ts'), 'utf8'),
  readFile(resolve(root, 'docs/recipes.md'), 'utf8'),
  readFile(resolve(root, 'docs/component-selection.md'), 'utf8'),
  readFile(resolve(root, 'ai/skill.md'), 'utf8'),
  readFile(resolve(root, 'llms.txt'), 'utf8'),
  readFile(resolve(root, 'ux-demo/recipes/mount-recipe.ts'), 'utf8'),
  readFile(resolve(root, 'ux-demo/style.css'), 'utf8'),
]);
const packageExports = new Set(Object.keys(packageJson.exports));
const allowedClasses = recipeClassVocabulary(artifact);
const expected = [
  'recipe-app-shell',
  'recipe-navigation-sidebar',
  'recipe-workspace-header',
  'recipe-list-detail-dialog',
  'recipe-composer-form',
  'recipe-list-workspace-states',
  'recipe-compact-toolbar',
  'recipe-navigation-stack',
  'recipe-loading-inspector',
  'recipe-collapsible-sidebar',
];
const recipes = artifact.entries.filter((entry) => entry.kind === 'recipe');
const failures = [];
const fail = (message) => failures.push(message);
if (
  JSON.stringify(recipes.map((entry) => entry.id)) !== JSON.stringify(expected)
)
  fail('canonical catalog must contain the ten recipes in documented order');
const packageSubpath = (specifier) =>
  `.${specifier.slice('@kerfjs/ui'.length)}`;
const hasStableRecipeMarker = (source, id) =>
  source.includes(`data-recipe="${id}"`) ||
  source.includes(`'data-recipe': '${id}'`) ||
  source.includes(`recipe="${id}"`);
for (const entry of recipes) {
  const stem = entry.id.replace(/^recipe-/, '');
  const sourcePath = resolve(root, `ux-demo/recipes/${stem}.tsx`);
  let source = '';
  try {
    source = await readFile(sourcePath, 'utf8');
  } catch {
    fail(`${entry.id} is missing source ${stem}.tsx`);
    continue;
  }
  if (!loaders.includes(`'${entry.id}': () => import('./${stem}.js')`))
    fail(`${entry.id} is not a literal dynamic import`);
  if (!hasStableRecipeMarker(source, entry.id))
    fail(`${entry.id} source is missing its stable marker`);
  if (!/^export const presentation: RecipePresentation = \{/m.test(source))
    fail(
      `${entry.id} must export its catalog presentation (viewport and ownership note)`,
    );
  for (const problem of analyzeRecipeSource({
    route: entry.id,
    filePath: `ux-demo/recipes/${stem}.tsx`,
    absoluteFilePath: sourcePath,
    source,
    uiRoot: root,
    packageExports,
    allowedClasses,
  }))
    fail(
      `ux-demo/recipes/${stem}.tsx:${problem.line}:${problem.column} [${problem.rule}] ${problem.message}`,
    );
  if (!source.includes('@kerfjs/ui/layout.css'))
    fail(`${entry.id} must import the semantic layout layer`);
  if (
    entry.id === 'recipe-navigation-sidebar' &&
    !(source.includes('<Pane') && source.includes('footer={'))
  )
    fail(
      'recipe-navigation-sidebar must place its footer toolbar in the shared pane footer',
    );
  for (const match of source.matchAll(
    /from '(@kerfjs\/ui(?:\/[a-z0-9-]+)?)'|import '(@kerfjs\/ui(?:\/[a-z0-9./-]+)?)'/g,
  )) {
    const specifier = match[1] ?? match[2];
    if (!(packageSubpath(specifier) in packageJson.exports))
      fail(`${entry.id} imports stale package subpath ${specifier}`);
  }
  for (const match of source.matchAll(
    /import '(@awesome\.me\/webawesome\/[^']+)'/g,
  ))
    if (match[1].endsWith('/webawesome.js'))
      fail(`${entry.id} imports the full Web Awesome registration bundle`);
  if (!docs.includes(`?component=${entry.id}`))
    fail(`recipes.md does not link ${entry.id}`);
  if (!selection.includes(`?component=${entry.id}`))
    fail(`component-selection.md does not link ${entry.id}`);
}
for (const surface of [skill, llms])
  if (!surface.includes('docs/recipes.md'))
    fail('AI guidance must link docs/recipes.md');
for (const required of [
  'delegateActions(',
  'wireResizableRegions(',
  'onCommit:',
  'let disposed = false',
  'stopMount()',
]) {
  if (!adapter.includes(required))
    fail(`copyable recipe mount adapter is missing ${required}`);
}
if (!docs.includes('[`mount-recipe.ts`](../ux-demo/recipes/mount-recipe.ts)'))
  fail('recipes.md must link the copyable mount adapter');
if (!packageJson.files.includes('ux-demo/recipes'))
  fail('package must deliver recipe source and its mount adapter');
// Recipes compose components through configuration: no route stylesheet may
// exist beside them, the shared adapter files obey the same source rules, and
// the catalog shell stylesheet carries no recipe-specific rules.
const recipeFiles = await readdir(resolve(root, 'ux-demo/recipes'));
for (const name of recipeFiles.filter((file) => /\.css$/i.test(file)))
  fail(
    `ux-demo/recipes/${name} must not exist; recipes compose Kerf components, layouts, and Web Awesome surfaces through their public configuration`,
  );
for (const name of recipeFiles.filter(
  (file) =>
    /\.tsx?$/.test(file) &&
    !recipes.some(({ id }) => `${id.replace(/^recipe-/, '')}.tsx` === file),
)) {
  const sourcePath = resolve(root, `ux-demo/recipes/${name}`);
  for (const problem of analyzeRecipeSource({
    route: '@recipes',
    filePath: `ux-demo/recipes/${name}`,
    absoluteFilePath: sourcePath,
    source: await readFile(sourcePath, 'utf8'),
    uiRoot: root,
    packageExports,
    allowedClasses,
  }))
    fail(
      `ux-demo/recipes/${name}:${problem.line}:${problem.column} [${problem.rule}] ${problem.message}`,
    );
}
if (/recipe/i.test(shellStyles))
  fail(
    'ux-demo/style.css must not carry recipe-specific rules; the catalog frames recipes through CatalogExample',
  );
if (failures.length) {
  console.error('[check-recipes] Recipe catalog drifted:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else
  console.log(
    '[check-recipes] OK — ten lazy production-backed recipes, routes, imports, and guidance are synchronized.',
  );
