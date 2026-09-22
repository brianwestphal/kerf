import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

describe('SegmentedControl corner geometry', () => {
  it('subtracts the shared full inset from the item radius', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/segmented-control.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const control = root.nodes.find(
      (node) =>
        node.type === 'rule' && node.selector === '.kui-segmented-control',
    );

    if (!control || control.type !== 'rule')
      throw new Error('Missing SegmentedControl rule');

    const declarations = new Map(
      control.nodes
        .filter((node) => node.type === 'decl')
        .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
    );
    expect(declarations.get('border')).toBe(
      '1px solid var(--kui-segmented-border)',
    );
    expect(declarations.get('padding')).toBe('1px');
    expect(declarations.get('--kui-segmented-item-radius')).toBe(
      'max( 0px, calc(var(--kui-segmented-radius) - var(--kui-layout-highlight-inset, 2px)) )',
    );
  });

  it('shares the toolbar group highlight radius with nested choices', async () => {
    const segmentedFile = resolve(
      import.meta.dirname,
      '../../src/segmented-control.css',
    );
    const toolbarFile = resolve(
      import.meta.dirname,
      '../../src/toolbar-control-group.css',
    );
    const segmented = postcss.parse(await readFile(segmentedFile, 'utf8'), {
      from: segmentedFile,
    });
    const toolbar = postcss.parse(await readFile(toolbarFile, 'utf8'), {
      from: toolbarFile,
    });
    const declarations = (root: postcss.Root, selector: string) => {
      const rule = root.nodes.find(
        (node) => node.type === 'rule' && node.selector === selector,
      );
      if (!rule || rule.type !== 'rule')
        throw new Error(`Missing ${selector} rule`);
      return new Map(
        rule.nodes
          .filter((node) => node.type === 'decl')
          .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
      );
    };

    expect(
      declarations(toolbar, '.kui-toolbar-control-group').get(
        '--kui-control-highlight-radius',
      ),
    ).toBe(
      'max( 0px, calc( var(--kui-toolbar-group-radius) - var(--kui-layout-highlight-inset, 2px) ) )',
    );
    expect(
      declarations(
        segmented,
        '.kui-segmented-control[data-appearance="toolbar"]',
      ).get('--kui-segmented-item-radius'),
    ).toContain('--kui-control-highlight-radius');
    expect(
      declarations(
        toolbar,
        '.kui-toolbar-control-group[data-shape="rounded"]',
      ).has('--kui-toolbar-item-radius'),
    ).toBe(false);
  });
});
