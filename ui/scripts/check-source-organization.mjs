import { access, readFile, readdir } from 'node:fs/promises';
import { basename, extname, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = resolve(root, 'src');
const errors = [];
const globalRootStyles = new Set([
  'catalog.css',
  'document.css',
  'foundation.css',
  'layout.css',
  'styles.css',
  'webawesome.css',
]);
const specialRootSources = new Set(['catalog.tsx', 'css.d.ts', 'index.ts']);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const rootEntries = await readdir(sourceRoot, { withFileTypes: true });
for (const entry of rootEntries) {
  if (!entry.isFile()) continue;
  const path = resolve(sourceRoot, entry.name);
  const source = await readFile(path, 'utf8');
  if (/\.tsx?$/.test(entry.name) && !specialRootSources.has(entry.name)) {
    const match =
      /^\/\/ Public package entry; implementation is grouped by component ownership\.\nexport \* from '([^']+\.js)';\n$/.exec(
        source,
      );
    if (!match) {
      errors.push(
        `src/${entry.name} must be a thin public package facade; move implementation into an owned source folder`,
      );
      continue;
    }
    const target = resolve(sourceRoot, match[1].replace(/\.js$/, ''));
    if (!(await exists(`${target}.ts`)) && !(await exists(`${target}.tsx`)))
      errors.push(
        `src/${entry.name} points to missing implementation ${match[1]}`,
      );
  }
  if (
    entry.name.endsWith('.css') &&
    !globalRootStyles.has(entry.name) &&
    !source.includes(
      'Public stylesheet entry; implementation is colocated with the component.',
    )
  )
    errors.push(
      `src/${entry.name} must be a thin public stylesheet facade; colocate its rules with the component`,
    );
}

const componentRoot = resolve(sourceRoot, 'components');
for (const family of await readdir(componentRoot, { withFileTypes: true })) {
  if (!family.isDirectory()) {
    errors.push(
      `src/components/${family.name} must be a component family folder`,
    );
    continue;
  }
  const familyPath = resolve(componentRoot, family.name);
  for (const component of await readdir(familyPath, { withFileTypes: true })) {
    if (!component.isDirectory()) {
      errors.push(
        `src/components/${family.name}/${component.name} must live in a named component folder`,
      );
      continue;
    }
    const componentPath = resolve(familyPath, component.name);
    const primaryTsx = resolve(componentPath, `${component.name}.tsx`);
    if (!(await exists(primaryTsx)))
      errors.push(
        `src/components/${family.name}/${component.name} requires ${component.name}.tsx as its primary component module`,
      );
    for (const child of await readdir(componentPath, { withFileTypes: true })) {
      if (child.isDirectory()) {
        if (!['internal', 'model', 'register', 'wiring'].includes(child.name))
          errors.push(
            `${relative(root, resolve(componentPath, child.name)).split(sep).join('/')} must use internal, model, register, or wiring for component-local support code`,
          );
        continue;
      }
      if (
        ['.ts', '.tsx', '.css'].includes(extname(child.name)) &&
        basename(child.name, extname(child.name)) !== component.name
      )
        errors.push(
          `${relative(root, resolve(componentPath, child.name)).split(sep).join('/')} must be the primary ${component.name} module or move into a component-local support folder`,
        );
    }
  }
}

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

for (const file of await sourceFiles(componentRoot)) {
  const path = relative(sourceRoot, file).split(sep).join('/');
  const name = basename(file);
  if (name.startsWith('wire-') && !path.includes('/wiring/'))
    errors.push(
      `${path} is component-specific wiring and must live in wiring/`,
    );
  if (name.startsWith('install-') && !path.includes('/internal/'))
    errors.push(
      `${path} is component-specific installation code and must live in internal/`,
    );
  if (name.endsWith('-model.ts') && !path.includes('/model/'))
    errors.push(
      `${path} is a component-specific model and must live in model/`,
    );
}

if (errors.length) {
  console.error(`[check-source-organization] ${errors.length} violation(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    '[check-source-organization] OK — root files are public facades, components are grouped by family and owner, and local support code uses explicit subfolders.',
  );
}
