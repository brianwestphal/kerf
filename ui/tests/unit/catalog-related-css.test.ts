import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss, { type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

const components = resolve(import.meta.dirname, '../../src/catalog/components');

describe('Catalog related selector CSS', () => {
  it('keeps the public stylesheet as import-only compatibility surface', async () => {
    const file = resolve(import.meta.dirname, '../../src/catalog.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const nodes = root.nodes.filter((node) => node.type !== 'comment');
    expect(nodes.every((node) => node.type === 'atrule')).toBe(true);
    expect(
      nodes.map((node) => (node.type === 'atrule' ? node.params : undefined)),
    ).toEqual([
      '"./catalog/components/catalog.css"',
      '"./catalog/components/catalog-stage.css"',
      '"./catalog/components/catalog-example.css"',
      '"./catalog/components/catalog-example-stack.css"',
    ]);
  });

  it('builds the sidebar, navigation, and resource footer from kerf ui components with no stylesheet of their own', async () => {
    for (const name of [
      'catalog-sidebar.css',
      'catalog-section-list.css',
      'catalog-secondary-sections.css',
      'catalog-resource-footer.css',
      'catalog-detail.css',
    ])
      await expect(access(resolve(components, name))).rejects.toThrow();
  });

  it('tiles the transparency checkerboard on the stage, which fills the preview scroller', async () => {
    const file = resolve(components, 'catalog-stage.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const stage = root.nodes.find(
      (node): node is Rule =>
        node.type === 'rule' && node.selector === '.kui-catalog__stage',
    );
    if (!stage) throw new Error('Missing catalog stage rule');
    const declarations = Object.fromEntries(
      stage.nodes
        .filter((node) => node.type === 'decl')
        .map((node) => [node.prop, node.value]),
    );
    expect(declarations['background-image']).toContain('data:image/svg+xml');
    expect(declarations['background-image']).not.toContain('linear-gradient');
    expect(declarations).toMatchObject({
      flex: '1 0 auto',
      'background-color': 'transparent',
      'background-size': 'remify(16px) remify(16px)',
    });
  });

  it('lets the sunken Pane paint through the sunken stage without stacking alpha', async () => {
    const file = resolve(components, 'catalog-stage.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const sunken = root.nodes.find(
      (node): node is Rule =>
        node.type === 'rule' &&
        node.selector === '.kui-catalog__stage[data-background-style="sunken"]',
    );
    if (!sunken) throw new Error('Missing sunken catalog stage rule');
    expect(
      sunken.nodes.find(
        (node) => node.type === 'decl' && node.prop === 'background-color',
      ),
    ).toMatchObject({ value: 'transparent' });
  });
});
