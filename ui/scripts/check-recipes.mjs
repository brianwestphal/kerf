import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const [artifact, packageJson, loaders, docs, selection, skill, llms] = await Promise.all([
  readFile(resolve(root, 'ai/component-catalog.json'), 'utf8').then(JSON.parse),
  readFile(resolve(root, 'package.json'), 'utf8').then(JSON.parse),
  readFile(resolve(root, 'ux-demo/recipes/loaders.ts'), 'utf8'),
  readFile(resolve(root, 'docs/recipes.md'), 'utf8'),
  readFile(resolve(root, 'docs/component-selection.md'), 'utf8'),
  readFile(resolve(root, 'ai/skill.md'), 'utf8'),
  readFile(resolve(root, 'llms.txt'), 'utf8'),
]);
const expected = ['recipe-app-shell', 'recipe-navigation-sidebar', 'recipe-workspace-header', 'recipe-master-detail-dialog', 'recipe-composer-form', 'recipe-list-workspace-states', 'recipe-compact-toolbar'];
const recipes = artifact.entries.filter((entry) => entry.kind === 'recipe');
const failures = [];
const fail = (message) => failures.push(message);
if (JSON.stringify(recipes.map((entry) => entry.id)) !== JSON.stringify(expected)) fail('canonical catalog must contain the seven recipes in documented order');
const packageSubpath = (specifier) => `.${specifier.slice('@kerfjs/ui'.length)}`;
for (const entry of recipes) {
  const stem = entry.id.replace(/^recipe-/, '');
  const sourcePath = resolve(root, `ux-demo/recipes/${stem}.tsx`);
  let source = '';
  try { source = await readFile(sourcePath, 'utf8'); } catch { fail(`${entry.id} is missing source ${stem}.tsx`); continue; }
  if (!loaders.includes(`'${entry.id}': () => import('./${stem}.js')`)) fail(`${entry.id} is not a literal dynamic import`);
  if (!source.includes(`data-recipe="${entry.id}"`)) fail(`${entry.id} source is missing its stable marker`);
  if (!source.includes("@kerfjs/ui/layout.css")) fail(`${entry.id} must import the semantic layout layer`);
  for (const match of source.matchAll(/from '(@kerfjs\/ui(?:\/[a-z0-9-]+)?)'|import '(@kerfjs\/ui(?:\/[a-z0-9./-]+)?)'/g)) {
    const specifier = match[1] ?? match[2];
    if (!(packageSubpath(specifier) in packageJson.exports)) fail(`${entry.id} imports stale package subpath ${specifier}`);
  }
  for (const match of source.matchAll(/import '(@awesome\.me\/webawesome\/[^']+)'/g)) if (match[1].endsWith('/webawesome.js')) fail(`${entry.id} imports the full Web Awesome registration bundle`);
  if (!docs.includes(`?component=${entry.id}`)) fail(`recipes.md does not link ${entry.id}`);
  if (!selection.includes(`?component=${entry.id}`)) fail(`component-selection.md does not link ${entry.id}`);
}
for (const surface of [skill, llms]) if (!surface.includes('docs/recipes.md')) fail('AI guidance must link docs/recipes.md');
try { await access(resolve(root, 'ux-demo/recipes/recipes.css')); } catch { fail('shared recipe CSS is missing'); }
if (failures.length) { console.error('[check-recipes] Recipe catalog drifted:\n'); failures.forEach((failure) => console.error(`- ${failure}`)); process.exitCode = 1; }
else console.log('[check-recipes] OK — seven lazy production-backed recipes, routes, imports, and guidance are synchronized.');
