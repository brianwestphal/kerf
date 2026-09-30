import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { SunkenPanel } from '../../src/sunken-panel.js';

describe('SunkenPanel', () => {
  it('renders an unnamed vertical application surface by default', () => {
    const html = String(
      SunkenPanel({
        className: 'workspace',
        children: [<strong>Activity</strong>, <span>Ready</span>],
      }),
    );

    expect(html).toContain(
      'class="kui-sunken-panel workspace" data-component="sunken-panel" data-shape="rounded"',
    );
    expect(html).not.toContain('role=');
    expect(html).not.toContain('aria-label=');
    expect(html).toContain('<strong>Activity</strong><span>Ready</span>');
  });

  it('becomes a named region only when the application supplies a label', () => {
    expect(
      String(
        SunkenPanel({
          ariaLabel: 'Release workspace',
          children: <span>Ready</span>,
        }),
      ),
    ).toContain('role="region" aria-label="Release workspace"');
  });

  it('renders the explicit square-corner shape', () => {
    expect(String(SunkenPanel({ shape: 'square' }))).toContain(
      'data-shape="square"',
    );
  });

  it('keeps the bounded translucent prototype opt-in and caps its third layer', () => {
    const prototype = postcss.parse(
      readFileSync(resolve('ux-demo/sunken-prototype.css'), 'utf8'),
    );
    const component = readFileSync(resolve('src/sunken-panel.css'), 'utf8');
    const pane = readFileSync(resolve('src/pane.css'), 'utf8');
    const webAwesome = readFileSync(resolve('src/webawesome.css'), 'utf8');
    for (const depth of ['first', 'second', 'third']) {
      const rule = prototype.nodes.find(
        (node) =>
          node.type === 'rule' &&
          node.selector === `.demo-sunken-prototype__${depth}`,
      );
      expect(rule, `${depth} opt-in rule`).toBeDefined();
      const declarations = Object.fromEntries(
        (rule as postcss.Rule).nodes
          .filter((node): node is postcss.Declaration => node.type === 'decl')
          .map((node) => [node.prop, node.value]),
      );
      expect(declarations['--kui-sunken-panel-background']).toBeDefined();
      expect(declarations['--kui-wa-sunken-background']).toBeDefined();
      if (depth === 'third')
        expect(declarations['--kui-sunken-panel-background']).toBe(
          'transparent',
        );
    }
    for (const css of [component, pane, webAwesome])
      expect(css).not.toContain('demo-sunken-prototype');
  });
});
