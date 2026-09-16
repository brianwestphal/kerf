import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { Workbench } from '../../src/workbench.js';

const main = raw('<div class="editor">editor</div>');
const panel = (label: string) => raw(`<div>${label}</div>`);

describe('Workbench', () => {
  it('renders just the work area when no panels are given', () => {
    const html = String(Workbench({ id: 'wb', label: 'Studio', main }));
    expect(html).toContain('data-component="workbench"');
    expect(html).toContain('data-workbench-main');
    expect(html).not.toContain('data-workbench-rail');
    expect(html).not.toContain('data-workbench-drawer');
  });

  it('renders left rail, right rail, and bottom drawer with their collapsed state', () => {
    const html = String(Workbench({
      id: 'wb',
      label: 'Studio',
      main,
      leftRail: { content: panel('nav'), label: 'Navigator', collapsed: false },
      rightRail: { content: panel('inspector'), label: 'Inspector', collapsed: true },
      bottomDrawer: { content: panel('console'), label: 'Console', collapsed: true },
    }));
    expect(html).toContain('data-workbench-rail="left" data-collapsed="false"');
    expect(html).toContain('data-workbench-rail="right" data-collapsed="true"');
    expect(html).toContain('data-workbench-drawer data-collapsed="true"');
    expect(html).toContain('aria-label="Navigator"');
    expect(html).toContain('aria-label="Inspector"');
    expect(html).toContain('aria-label="Console"');
  });

  it('defaults collapsed to false and omits an unset size style', () => {
    const html = String(Workbench({ id: 'wb', label: 'Studio', main, leftRail: { content: panel('nav') } }));
    expect(html).toContain('data-collapsed="false"');
    expect(html).not.toContain('--kui-workbench-rail-width');
  });

  it('applies custom rail width and drawer height sizes', () => {
    const html = String(Workbench({
      id: 'wb',
      label: 'Studio',
      main,
      leftRail: { content: panel('nav'), size: 320 },
      rightRail: { content: panel('inspector'), size: 260 },
      bottomDrawer: { content: panel('console'), size: 180 },
    }));
    expect(html).toContain('data-workbench-rail="left" data-collapsed="false"');
    expect(html).toContain('data-workbench-rail="right" data-collapsed="false"');
    expect(html).toContain('--kui-workbench-rail-width: 320px');
    expect(html).toContain('--kui-workbench-rail-width: 260px');
    expect(html).toContain('--kui-workbench-drawer-height: 180px');
  });

  it('applies a custom className', () => {
    expect(String(Workbench({ id: 'wb', label: 'Studio', main, className: 'flush' }))).toContain('kui-workbench flush');
  });
});
