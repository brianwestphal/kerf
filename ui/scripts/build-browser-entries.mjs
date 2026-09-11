import { access, mkdir, readFile, writeFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const components = Object.entries(packageJson.exports)
  .filter(([, target]) => typeof target === 'object' && target !== null && 'browser' in target)
  .map(([subpath]) => subpath.slice(2));

const browserDirectory = new URL('../dist/browser/', import.meta.url);

await mkdir(browserDirectory, { recursive: true });

async function sourceFor(moduleName) {
  for (const extension of ['tsx', 'ts']) {
    const source = new URL(`../src/${moduleName}.${extension}`, import.meta.url);
    try {
      await access(source);
      return source;
    } catch {
      // Try the other supported source extension.
    }
  }
  throw new Error(`Could not find source for browser component ${moduleName}`);
}

async function hasStyle(moduleName) {
  try {
    await access(new URL(`../src/${moduleName}.css`, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

async function reachableStyles(moduleName, seen = new Set()) {
  if (seen.has(moduleName)) return [];
  seen.add(moduleName);

  const source = await readFile(await sourceFor(moduleName), 'utf8');
  const dependencies = [...source.matchAll(/import\s+(?!type\b)[^'"]*from\s+['"]\.\/([^'"]+)\.js['"]/g)]
    .map((match) => match[1]);
  const styles = [];
  for (const dependency of dependencies) {
    styles.push(...await reachableStyles(dependency, seen));
  }
  if (await hasStyle(moduleName)) styles.push(moduleName);
  return styles;
}

for (const component of components) {
  const imports = ['foundation', ...await reachableStyles(component)]
    .map((style) => `import '../../src/${style}.css';`)
    .join('\n');
  await writeFile(
    new URL(`${component}.js`, browserDirectory),
    `${imports}\nexport * from '../${component}.js';\n`,
  );
}
