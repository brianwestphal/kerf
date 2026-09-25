import { execFile } from 'node:child_process';
import { access, readdir, readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { execPath } from 'node:process';
import { promisify } from 'node:util';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const uiRoot = resolve(import.meta.dirname, '../..');

async function cssFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return cssFiles(path);
      return entry.name.endsWith('.css') ? [path] : [];
    }),
  );
  return files.flat();
}

function ownsClass(rootClass: string, candidate: string) {
  return (
    candidate === rootClass ||
    candidate.startsWith(`${rootClass}__`) ||
    candidate.startsWith(`${rootClass}--`)
  );
}

function ownedMarkupClasses(source: string) {
  const owned = new Set<string>();
  for (const match of source.matchAll(
    /<([a-z][a-z0-9-]*)\b[^>]*?\bclass\s*=\s*(?:["']([^"']+)["']|\{`([^`]+)`[^}]*\})/gi,
  )) {
    if (match[1].startsWith('wa-')) continue;
    for (const classMatch of (match[2] ?? match[3] ?? '').matchAll(
      /\b(kui-catalog[a-z0-9_-]*)\b/gi,
    ))
      owned.add(classMatch[1]);
  }
  return owned;
}

describe('CSS ownership gate', () => {
  it('keeps application styles out of package component internals', async () => {
    const script = resolve(
      import.meta.dirname,
      '../../scripts/check-css-ownership.mjs',
    );
    const { stdout } = await execFileAsync(execPath, [script]);

    expect(stdout).toContain('[check-css-ownership] OK');
  });

  it('keeps catalog entrypoints thin and visual component styles one-to-one', async () => {
    const entrypoint = await readFile(
      resolve(uiRoot, 'src/catalog.tsx'),
      'utf8',
    );
    const statements = entrypoint
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);
    expect(statements.length).toBeGreaterThan(0);
    expect(
      statements.every((statement) =>
        /^export\s+(?:type\s+)?(?:\*|\{[\s\S]*\})\s+from\s+['"]\.\/catalog\/[a-z0-9./-]+\.js['"]$/i.test(
          statement,
        ),
      ),
    ).toBe(true);

    const compatibilityCss = postcss.parse(
      await readFile(resolve(uiRoot, 'src/catalog.css'), 'utf8'),
    );
    expect(
      compatibilityCss.nodes
        .filter((node) => node.type !== 'comment')
        .every((node) => node.type === 'atrule' && node.name === 'import'),
    ).toBe(true);

    await expect(
      access(resolve(uiRoot, 'src/catalog-component.css')),
    ).rejects.toThrow();

    const componentDirectory = resolve(uiRoot, 'src/catalog/components');
    const entries = await readdir(componentDirectory, { withFileTypes: true });
    const componentNames = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
      .map((entry) => basename(entry.name, '.tsx'));
    const stylesheetNames = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
      .map((entry) => basename(entry.name, '.css'));
    expect(componentNames.length).toBeGreaterThan(0);
    expect(stylesheetNames.sort()).toEqual(componentNames.sort());
    for (const componentName of componentNames) {
      const expectedComponent = componentName
        .split('-')
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join('');
      const source = await readFile(
        resolve(componentDirectory, `${componentName}.tsx`),
        'utf8',
      );
      const declaredComponents = [
        ...source.matchAll(/\bfunction\s+([A-Z][A-Za-z0-9]*)\s*\(/g),
      ].map(([, name]) => name);
      expect(
        declaredComponents.filter((name) => name !== expectedComponent),
      ).toEqual([]);
    }
  });

  it('keeps demo and recipe styles with their same-basename owners', async () => {
    for (const aggregate of [
      'demos/demo-components.css',
      'recipes/recipe-components.css',
      'recipes/recipes.css',
    ]) {
      await expect(
        access(resolve(uiRoot, 'ux-demo', aggregate)),
      ).rejects.toThrow();
    }

    for (const stylesheet of await cssFiles(resolve(uiRoot, 'ux-demo'))) {
      if (stylesheet === resolve(uiRoot, 'ux-demo/style.css')) continue;
      const componentSource = stylesheet.replace(/\.css$/, '.tsx');
      const source = await readFile(componentSource, 'utf8');
      const stylesheetName = basename(stylesheet);
      expect(source).toMatch(
        new RegExp(
          `import\\s+["']\\./${stylesheetName.replace('.', '\\.')}["']`,
        ),
      );
    }
  });

  it('limits each catalog component stylesheet to its same-name class root', async () => {
    const componentDirectory = resolve(uiRoot, 'src/catalog/components');
    const entries = await readdir(componentDirectory, { withFileTypes: true });
    const stylesheets = entries
      .filter((entry) => entry.isFile() && extname(entry.name) === '.css')
      .map((entry) => resolve(componentDirectory, entry.name));
    const claimedRoots = new Set<string>();

    for (const stylesheet of stylesheets) {
      const componentName = basename(stylesheet, '.css');
      const componentSource = await readFile(
        resolve(componentDirectory, `${componentName}.tsx`),
        'utf8',
      );
      const markupRoots = ownedMarkupClasses(componentSource);
      const source = await readFile(stylesheet, 'utf8');
      const allowedRoots = new Set(markupRoots);
      for (const match of source.matchAll(
        /css-ownership:\s*allow-root\s+\.?((?:kui)-[a-z0-9_-]+)\s+--\s+([^*\n]{20,})/gi,
      ))
        allowedRoots.add(match[1]);

      for (const rootClass of allowedRoots) {
        expect(claimedRoots.has(rootClass)).toBe(false);
        claimedRoots.add(rootClass);
      }

      const selectors: string[] = [];
      postcss.parse(source).walkRules((rule) => {
        selectors.push(rule.selector);
      });
      expect(
        selectors.some((selector) =>
          [...allowedRoots].some((rootClass) =>
            selector.includes(`.${rootClass}`),
          ),
        ),
      ).toBe(true);
      const selectedClasses = selectors.flatMap((selector) =>
        [...selector.matchAll(/\.([a-z][a-z0-9_-]*)/gi)].map(
          ([, name]) => name,
        ),
      );
      expect(
        selectedClasses.every((name) =>
          [...allowedRoots].some((rootClass) => ownsClass(rootClass, name)),
        ),
      ).toBe(true);
    }
  });
});
