import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Circle } from 'lucide';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { ToolbarControlGroup } from '../../src/components/actions/toolbar-control-group/toolbar-control-group.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';

const button = (
  <button type="button" aria-label="Share">
    <LucideIcon icon={Circle} name="circle" />
  </button>
);

const cssFile = resolve(
  import.meta.dirname,
  '../../src/components/actions/toolbar-control-group/toolbar-control-group.css',
);

/** Declarations of every rule (at any nesting) whose selector matches. */
async function glassRules() {
  const root = postcss.parse(await readFile(cssFile, 'utf8'), {
    from: cssFile,
  });
  const rules: {
    selector: string;
    context: string;
    decls: Record<string, string>;
  }[] = [];
  root.walkRules((rule) => {
    if (!rule.selector.includes('[data-material="glass"]')) return;
    const parent = rule.parent;
    rules.push({
      selector: rule.selector.replace(/\s+/g, ' '),
      context:
        parent?.type === 'atrule'
          ? `@${(parent as postcss.AtRule).name} ${(parent as postcss.AtRule).params}`.replace(
              /\s+/g,
              ' ',
            )
          : '',
      decls: Object.fromEntries(
        rule.nodes
          .filter((node): node is postcss.Declaration => node.type === 'decl')
          .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
      ),
    });
  });
  return rules;
}

describe('ToolbarControlGroup glass material', () => {
  it('marks only a glass group, so solid markup is unchanged', () => {
    const solid = String(ToolbarControlGroup({ children: button }));
    const glass = String(
      ToolbarControlGroup({ children: button, material: 'glass' }),
    );
    expect(solid).not.toContain('data-material');
    expect(
      String(ToolbarControlGroup({ children: button, material: 'solid' })),
    ).toBe(solid);
    expect(glass).toContain('data-material="glass"');
  });

  it('paints the shared chrome material and filter with the text color', async () => {
    const rules = await glassRules();
    const base = rules.find(
      (rule) =>
        !rule.context &&
        rule.decls['backdrop-filter'] === 'var(--kui-chrome-material-filter)',
    );
    expect(base?.decls['-webkit-backdrop-filter']).toBe(
      'var(--kui-chrome-material-filter)',
    );
    expect(base?.decls['box-shadow']).toBeTruthy();
    // The specular edge replaces the gray border rather than stacking on it.
    expect(base?.decls['--kui-toolbar-control-border']).toContain(
      'rgb(255 255 255',
    );
    expect(base?.decls.border).toBeUndefined();
    const fill = rules.find(
      (rule) =>
        !rule.context &&
        rule.decls['--kui-toolbar-control-background'] ===
          'var(--kui-chrome-material)',
    );
    expect(fill?.selector).toContain('[data-tone="dark"]');
    expect(fill?.decls['--kui-toolbar-control-color']).toBe(
      'var(--kui-color-text)',
    );
    expect(fill?.decls['--kui-toolbar-control-hover-background']).toContain(
      'var(--kui-chrome-material)',
    );
  });

  it('turns a dark glass group opaque wherever the chrome material does', async () => {
    const rules = await glassRules();
    const opaqueDark = rules.filter(
      (rule) =>
        rule.selector.includes('[data-tone="dark"]') &&
        rule.decls['--kui-toolbar-control-background'] ===
          'var(--kui-color-neutral-fill-loud)',
    );
    const contexts = opaqueDark.map((rule) => rule.context || rule.selector);
    expect(contexts.some((where) => where.startsWith('@supports not'))).toBe(
      true,
    );
    const media = contexts.find((where) => where.startsWith('@media'));
    expect(media).toContain('prefers-reduced-transparency: reduce');
    expect(media).toContain('prefers-contrast: more');
    expect(media).toContain('update: slow');
    expect(
      contexts.some((where) =>
        where.includes(':root[data-kui-effects="static"]'),
      ),
    ).toBe(true);
  });

  it('uses system colors and drops the filter and shadow in forced colors', async () => {
    const forced = (await glassRules()).find((rule) =>
      rule.context.includes('forced-colors: active'),
    );
    expect(forced?.decls).toMatchObject({
      'backdrop-filter': 'none',
      '-webkit-backdrop-filter': 'none',
      'background-color': 'Canvas',
      'border-color': 'CanvasText',
      color: 'CanvasText',
      'box-shadow': 'none',
    });
  });
});
