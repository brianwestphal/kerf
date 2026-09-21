import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const uiRoot = resolve(import.meta.dirname, '../..');
const repoRoot = resolve(uiRoot, '..');

const readUi = (path: string) => readFile(resolve(uiRoot, path), 'utf8');

function githubSlug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function expectUiLink(link: string): Promise<void> {
  const [path, fragment] = link.split('#');
  const source = await readUi(path);
  if (!fragment || !['.md', '.txt'].includes(extname(path))) return;
  const headings = [...source.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) =>
    githubSlug(match[1]!),
  );
  expect(headings, link).toContain(fragment);
}

async function expectMarkdownLink(
  sourcePath: string,
  link: string,
): Promise<void> {
  const source = await readFile(resolve(repoRoot, sourcePath), 'utf8');
  expect(source, sourcePath).toContain(`](${link})`);
  const [target, fragment] = link.split('#');
  const targetPath = resolve(repoRoot, sourcePath, '..', target);
  const targetSource = await readFile(targetPath, 'utf8');
  if (!fragment || !['.md', '.txt'].includes(extname(targetPath))) return;
  const headings = [...targetSource.matchAll(/^#{1,6}\s+(.+)$/gm)].map(
    (match) => githubSlug(match[1]!),
  );
  expect(headings, `${sourcePath} -> ${link}`).toContain(fragment);
}

describe('Catalog demo authoring guidance', () => {
  it('ships a separate machine-readable discovery artifact with live links', async () => {
    const artifact = JSON.parse(await readUi('ai/catalog-authoring.json')) as {
      schemaVersion: number;
      package: string;
      scope: string;
      authoritativeGuide: string;
      apiSignatures: string;
      imports: { layout: string; wiring: string };
      helpers: string[];
      metadata: Record<string, string>;
    };

    expect(artifact).toMatchObject({
      schemaVersion: 1,
      package: '@kerfjs/ui',
      scope: 'catalog-demo-authoring',
      imports: {
        layout: '@kerfjs/ui/catalog',
        wiring: '@kerfjs/ui/wire-catalog',
      },
      metadata: {
        slot: 'rootAttributes',
        demo: 'data-demo',
        geometryOverlaySkip: 'data-catalog-geometry-overlay-skip',
      },
    });
    expect(artifact.helpers).toEqual([
      'Catalog',
      'CatalogExample',
      'CatalogExampleStack',
      'wireCatalog',
      'wireCatalogGeometryOverlay',
      'revealCatalogEntry',
    ]);
    await expectUiLink(artifact.authoritativeGuide);
    await expectUiLink(artifact.apiSignatures);
  });

  it('routes every AI discovery surface to the one authoritative contract', async () => {
    await Promise.all([
      expectMarkdownLink(
        'ui/README.md',
        './docs/catalog.md#catalog-demo-authoring-contract',
      ),
      expectMarkdownLink(
        'ui/llms.txt',
        './docs/catalog.md#catalog-demo-authoring-contract',
      ),
      expectMarkdownLink(
        'ui/ai/skill.md',
        '../docs/catalog.md#catalog-demo-authoring-contract',
      ),
      expectMarkdownLink(
        'ui/docs/component-selection.md',
        './catalog.md#catalog-demo-authoring-contract',
      ),
      expectMarkdownLink(
        'docs/ai/usage-guide.md',
        '../../ui/docs/catalog.md#catalog-demo-authoring-contract',
      ),
      expectMarkdownLink(
        'docs/21-ui-package.md',
        '../ui/docs/catalog.md#catalog-demo-authoring-contract',
      ),
    ]);
  });

  it('pins mode, nesting, selection, overlay legend, exclusions, and ownership', async () => {
    const guide = await readUi('docs/catalog.md');
    for (const required of [
      'Focused component',
      'Composition or recipe',
      '`CatalogExampleStack` is the group',
      '`CatalogExample` is one row',
      'immediate child of `CatalogExample`',
      'positive computed margin',
      'border-box outer bound',
      'does not visualize padding, borders, gaps, negative/zero margins',
      'every descendant from selection',
      '### Metadata ownership',
    ])
      expect(guide, required).toContain(required);
    expect(guide).toContain(
      'geometryOverlay={activeEntry().kind === "component"}',
    );
    expect(guide).not.toContain('geometryOverlay={true}');
  });

  it('keeps the browser consumer fixture on public helpers and metadata slots', async () => {
    const fixture = await readUi(
      'tests/browser/fixtures/catalog-authoring-consumer.tsx',
    );
    expect(fixture).toContain("from '@kerfjs/ui/catalog'");
    expect(fixture).toContain('CatalogExampleStack({');
    expect(fixture).toContain('CatalogExample({');
    expect(fixture).toContain("rootAttributes: { 'data-demo':");
    expect(fixture).toContain(
      "rootAttributes: { 'data-catalog-geometry-overlay-skip': '' }",
    );
    expect(fixture).toContain("geometryOverlay: mode === 'component'");
    expect(fixture).not.toMatch(/class(?:Name)?=["'][^"']*kui-catalog-/);
  });
});
