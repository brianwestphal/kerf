import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SunkenPanel } from '../../src/components/surfaces/sunken-panel/sunken-panel.js';
import { flex } from '../../src/shared/styles/css-values.js';

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
    expect(html).toContain('data-flex="false"');
    expect(html).not.toContain('data-fill');
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

  it('fills a definite-height parent or grows inside a flex parent', () => {
    expect(String(SunkenPanel({ fill: true }))).toContain('data-fill="true"');
    expect(String(SunkenPanel({ flex: true }))).toContain(
      'data-flex="true" style="--_kui-sunken-panel-flex:1 1 auto"',
    );
    expect(String(SunkenPanel({ flex: flex(2) }))).toContain(
      'style="--_kui-sunken-panel-flex:2 1 auto"',
    );
    const css = readFileSync(
      resolve('src/components/surfaces/sunken-panel/sunken-panel.css'),
      'utf8',
    );
    expect(css).toContain('flex: var(--_kui-sunken-panel-flex, initial)');
    expect(css).toContain('.kui-sunken-panel[data-fill="true"]');
    expect(css).toContain('height: 100%');
  });

  it('demonstrates nested public components without per-depth CSS overrides', () => {
    const demo = readFileSync(
      resolve('ux-demo/demos/sunken-panel.tsx'),
      'utf8',
    );
    expect(demo).not.toContain('--kui-');
    expect(demo).not.toContain('sunken-prototype');
    expect(demo).toContain('ariaLabel="Third layer"');
    expect(demo).toContain('appearance="sunken"');
  });
});
