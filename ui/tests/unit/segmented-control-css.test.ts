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

  it('shares the toolbar group highlight radius with a collapsible search', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/token-search-field.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const rule = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector ===
          '.kui-token-search[data-presentation="toolbar-group"][data-collapsible="true"]',
    );

    if (!rule || rule.type !== 'rule')
      throw new Error('Missing grouped collapsible search rule');

    const radius = rule.nodes.find(
      (node) => node.type === 'decl' && node.prop === 'border-radius',
    );
    if (!radius || radius.type !== 'decl')
      throw new Error('Missing grouped collapsible search radius');
    expect(radius.value).toBe('var(--kui-control-highlight-radius)');
  });

  it('lets nested dropdown shadow bases own intrinsic label, icon, and caret width', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/toolbar-control-group.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const rule = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector.includes('[data-content="mixed"]') &&
        node.selector.includes('[data-nested-dropdown="true"]') &&
        node.selector.includes('wa-button::part(base)'),
    );

    if (!rule || rule.type !== 'rule')
      throw new Error('Missing mixed nested dropdown sizing rule');
    const minWidth = rule.nodes.find(
      (node) => node.type === 'decl' && node.prop === 'min-width',
    );
    if (!minWidth || minWidth.type !== 'decl')
      throw new Error('Missing mixed nested dropdown minimum width');
    expect(minWidth.value).toBe('max-content');

    const widthRule = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector.includes('[data-content="mixed"]') &&
        node.selector.includes('[data-nested-dropdown="true"]') &&
        node.selector.includes('wa-button::part(base)') &&
        node.nodes.some(
          (child) => child.type === 'decl' && child.prop === 'width',
        ),
    );
    if (!widthRule || widthRule.type !== 'rule')
      throw new Error('Missing mixed nested dropdown base-width rule');
    const width = widthRule.nodes.find(
      (node) => node.type === 'decl' && node.prop === 'width',
    );
    if (!width || width.type !== 'decl')
      throw new Error('Missing mixed nested dropdown base width');
    expect(width.value).toBe('max-content');

    const fixedHostWidth = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector.includes('wa-button') &&
        !node.selector.includes('::part(base)') &&
        (node.selector.includes('[data-single="true"]') ||
          (node.selector.includes('[data-content="mixed"]') &&
            node.selector.includes('[data-nested-dropdown="true"]'))) &&
        node.nodes.some(
          (child) => child.type === 'decl' && child.prop === 'width',
        ),
    );
    expect(fixedHostWidth).toBeUndefined();

    const mixedTextRule = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector ===
          '.kui-toolbar-control-group[data-content="mixed"] wa-button',
    );
    if (!mixedTextRule || mixedTextRule.type !== 'rule')
      throw new Error('Missing mixed dropdown text line-height rule');
    const lineHeight = mixedTextRule.nodes.find(
      (node) => node.type === 'decl' && node.prop === 'line-height',
    );
    if (!lineHeight || lineHeight.type !== 'decl')
      throw new Error('Missing mixed dropdown text line height');
    expect(lineHeight.value).toBe('normal');
  });
});
