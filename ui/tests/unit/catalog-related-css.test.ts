import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss, { type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

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
      '"./catalog/components/catalog-sidebar.css"',
      '"./catalog/components/catalog-section-list.css"',
      '"./catalog/components/catalog-secondary-sections.css"',
      '"./catalog/components/catalog-detail.css"',
      '"./catalog/components/catalog-stage.css"',
      '"./catalog/components/catalog-resource-footer.css"',
      '"./catalog/components/catalog-example.css"',
      '"./catalog/components/catalog-example-stack.css"',
    ]);
  });

  it('leaves trigger and popup geometry to the toolbar and dropdown contracts', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/catalog/components/catalog-resource-footer.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const matchingRules = root.nodes.filter(
      (node): node is Rule =>
        node.type === 'rule' && node.selector.includes('related-menu'),
    );
    expect(matchingRules).toEqual([]);
  });

  it('lets the desktop detail row shrink while preserving narrow document flow', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/catalog/components/catalog-detail.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const declarations = (rule: Rule) =>
      Object.fromEntries(
        rule.nodes
          .filter((node) => node.type === 'decl')
          .map((node) => [node.prop, node.value]),
      );
    const detail = root.nodes.find(
      (node): node is Rule =>
        node.type === 'rule' && node.selector === '.kui-catalog__detail',
    );
    if (!detail) throw new Error('Missing catalog detail rule');
    expect(declarations(detail)).toMatchObject({
      'min-height': '0',
      height: '100%',
    });

    const narrow = root.nodes.find(
      (node) =>
        node.type === 'atrule' &&
        node.name === 'media' &&
        node.params === '(max-width: remify(832px))',
    );
    if (!narrow || narrow.type !== 'atrule')
      throw new Error('Missing narrow catalog detail rules');
    const narrowDetail = narrow.nodes?.find(
      (node): node is Rule =>
        node.type === 'rule' && node.selector === '.kui-catalog__detail',
    );
    if (!narrowDetail) throw new Error('Missing narrow catalog detail rule');
    expect(declarations(narrowDetail)).toMatchObject({
      'min-height': 'auto',
      height: 'auto',
    });
  });

  it('lets the preview scroll owner tile below the content-sized stage', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/catalog/components/catalog-stage.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const detailFile = resolve(
      import.meta.dirname,
      '../../src/catalog/components/catalog-detail.css',
    );
    const detailRoot = postcss.parse(await readFile(detailFile, 'utf8'), {
      from: detailFile,
    });
    const preview = detailRoot.nodes.find(
      (node): node is Rule =>
        node.type === 'rule' &&
        node.selector === '.kui-catalog__detail-preview',
    );
    const stage = root.nodes.find(
      (node): node is Rule =>
        node.type === 'rule' && node.selector === '.kui-catalog__stage',
    );
    if (!preview) throw new Error('Missing catalog preview rule');
    if (!stage) throw new Error('Missing catalog stage rule');
    const declarations = (rule: Rule) =>
      Object.fromEntries(
        rule.nodes
          .filter((node) => node.type === 'decl')
          .map((node) => [node.prop, node.value]),
      );

    expect(declarations(preview)['background-image']).toContain(
      'data:image/svg+xml',
    );
    expect(declarations(preview)['background-image']).not.toContain(
      'linear-gradient',
    );
    expect(declarations(preview)).toMatchObject({
      'background-position': '0 0',
      'background-repeat': 'repeat',
      'background-size': 'remify(24px) remify(24px)',
    });
    expect(declarations(stage)).toMatchObject({
      'min-height': '0',
      flex: '1 0 auto',
    });
    expect(declarations(stage)).not.toHaveProperty('background-image');
  });
});
