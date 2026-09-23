import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss, { type Root, type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

function declarations(rule: Rule): Record<string, string> {
  return Object.fromEntries(
    rule.nodes
      .filter((node) => node.type === 'decl')
      .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
  );
}

function findRule(root: Root, includes: string): Rule {
  const rule = [...root.nodes]
    .reverse()
    .find(
      (node): node is Rule =>
        node.type === 'rule' && node.selector.includes(includes),
    );
  if (!rule) throw new Error(`Missing avatar rule containing ${includes}`);
  return rule;
}

function findExactRule(root: Root, selector: string): Rule {
  const rule = root.nodes.find(
    (node): node is Rule => node.type === 'rule' && node.selector === selector,
  );
  if (!rule) throw new Error(`Missing ${selector}`);
  return rule;
}

function findRuleWithDeclaration(
  root: Root,
  selectorIncludes: string,
  property: string,
): Rule {
  const rule = root.nodes.find(
    (node): node is Rule =>
      node.type === 'rule' &&
      node.selector.includes(selectorIncludes) &&
      node.nodes.some(
        (child) => child.type === 'decl' && child.prop === property,
      ),
  );
  if (!rule)
    throw new Error(`Missing ${selectorIncludes} rule declaring ${property}`);
  return rule;
}

describe('ToolbarControlGroup avatar image ownership', () => {
  it('uses contain fitting on the single group and multi-button selection', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/toolbar-control-group.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const base = declarations(
      findExactRule(root, '.kui-toolbar-control-group[data-content="avatar"]'),
    );
    expect(base).toMatchObject({
      'background-position': 'center',
      'background-repeat': 'no-repeat',
      'background-size': 'contain',
    });

    const single = declarations(
      findRuleWithDeclaration(root, '[data-single="true"]', 'background-image'),
    );
    expect(single['background-image']).toBe('var(--kui-toolbar-avatar-image)');

    const selected = declarations(
      findRule(root, '> button[aria-pressed="true"]'),
    );
    expect(selected).toMatchObject({
      'background-image': 'var(--kui-toolbar-avatar-image)',
      'background-position': 'center',
      'background-repeat': 'no-repeat',
      'background-size': 'contain',
    });
  });

  it('changes only the group color on hover so avatar fitting stays stable', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/toolbar-control-group.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    for (const selector of [
      '[data-single="true"]:has',
      ':not([data-single="true"]):has',
    ]) {
      const hover = declarations(
        findRuleWithDeclaration(root, selector, 'background-color'),
      );
      expect(hover['background-color']).toBe(
        'var(--kui-toolbar-control-hover-background)',
      );
      expect(hover).not.toHaveProperty('background');
    }
  });
});

describe('ToolbarControlGroup compact mixed selection', () => {
  it('keeps standard padding and overlays the outer border without a separator', async () => {
    const file = resolve(
      import.meta.dirname,
      '../../src/toolbar-control-group.css',
    );
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const compact = declarations(
      findExactRule(
        root,
        '.kui-toolbar-control-group[data-size="compact"][data-content="mixed"]',
      ),
    );
    expect(compact['--kui-layout-item-padding']).toBe('remify(8px)');

    const selected = declarations(
      findRuleWithDeclaration(
        root,
        '[data-size="compact"][data-content="mixed"]',
        'margin',
      ),
    );
    expect(selected).toMatchObject({
      height: 'var(--kui-toolbar-group-size)',
      margin: '-2px',
      'border-radius': 'var(--kui-toolbar-group-radius)',
      'z-index': '1',
    });

    const separator = root.nodes.find(
      (node): node is Rule =>
        node.type === 'rule' &&
        node.selector.includes('[data-content="mixed"] > wa-dropdown'),
    );
    expect(separator).toBeUndefined();
  });
});
