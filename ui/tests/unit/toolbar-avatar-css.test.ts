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
});
