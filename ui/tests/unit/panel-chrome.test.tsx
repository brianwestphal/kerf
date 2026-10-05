import { raw } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { CollapsiblePanel } from '../../src/components/layout/collapsible-panel/collapsible-panel.js';
import { Workbench } from '../../src/components/layout/workbench/workbench.js';

const chrome = (name: string) => raw(`<p data-chrome="${name}">${name}</p>`);
const panel = {
  label: 'Inspector',
  toolbar: { label: 'Inspector' },
  header: chrome('title-and-tabs'),
  headerList: { gap: 'xs' as const, textInsets: 'trbl' as const },
  footer: chrome('status'),
  footerList: { controlInsets: 'trbl' as const },
  bottomToolbar: { label: 'Inspector actions', trailing: chrome('actions') },
  content: chrome('body'),
};

function host(value: unknown) {
  const element = document.createElement('div');
  element.innerHTML = String(value);
  return element;
}

describe('panel fixed chrome', () => {
  it('keeps a Workbench panel header below its toolbar and footer above its bottom toolbar', () => {
    const root = host(
      Workbench({
        id: 'wb',
        label: 'Workspace',
        main: chrome('main'),
        rightRail: panel,
      }),
    );
    const pane = root.querySelector(
      '[data-workbench-rail="right"] [data-component="pane"]',
    )!;
    const header = pane.querySelector(':scope > .kui-pane__header')!;
    const footer = pane.querySelector(':scope > .kui-pane__footer')!;
    const content = pane.querySelector(':scope > .kui-pane__content')!;
    expect(header.querySelector('.kui-toolbar')).not.toBeNull();
    expect(
      header.querySelector('[data-chrome="title-and-tabs"]'),
    ).not.toBeNull();
    expect(
      header.querySelector('[data-component="list"]')?.getAttribute('style'),
    ).toContain('--_kui-list-gap:');
    expect(content.querySelector('[data-chrome="body"]')).not.toBeNull();
    expect(content.querySelector('[data-chrome="title-and-tabs"]')).toBeNull();
    expect(footer.querySelector('[data-chrome="status"]')).not.toBeNull();
    expect(footer.querySelector('[data-chrome="actions"]')).not.toBeNull();
    expect(footer.querySelector('.kui-toolbar')?.tagName).toBe('FOOTER');
    expect(footer.textContent?.indexOf('status')).toBeLessThan(
      footer.textContent?.indexOf('actions') ?? 0,
    );
  });

  it('places a CollapsiblePanel header and footer in the one Pane scroll owner on request', () => {
    const root = host(
      CollapsiblePanel({
        id: 'inspector',
        side: 'right',
        toolbar: panel.toolbar,
        header: panel.header,
        headerList: panel.headerList,
        headerPlacement: 'scroll',
        footer: panel.footer,
        footerList: panel.footerList,
        bottomToolbar: panel.bottomToolbar,
        footerPlacement: 'scroll',
        children: panel.content,
      }),
    );
    const pane = root.querySelector('[data-component="pane"]')!;
    const content = pane.querySelector(':scope > .kui-pane__content')!;
    expect(pane.querySelector(':scope > .kui-pane__header')).toBeNull();
    expect(pane.querySelector(':scope > .kui-pane__footer')).toBeNull();
    expect(
      content.querySelector('[data-chrome="title-and-tabs"]'),
    ).not.toBeNull();
    expect(content.querySelector('[data-chrome="body"]')).not.toBeNull();
    expect(content.querySelector('[data-chrome="status"]')).not.toBeNull();
    expect(content.querySelector('.kui-toolbar')?.tagName).toBe('HEADER');
    expect(content.querySelectorAll('.kui-toolbar')[1]?.tagName).toBe('FOOTER');
  });

  it('forwards auto placement to Pane while retaining pinned chrome', () => {
    const root = host(
      Workbench({
        id: 'wb',
        label: 'Workspace',
        main: chrome('main'),
        leftRail: {
          ...panel,
          headerPlacement: 'auto',
          footerPlacement: 'auto',
        },
      }),
    );
    const pane = root.querySelector(
      '[data-workbench-rail="left"] [data-component="pane"]',
    )!;
    expect(pane.getAttribute('data-chrome-placement')).toBe('auto');
    expect(pane.querySelector(':scope > .kui-pane__header')).not.toBeNull();
    expect(pane.querySelector(':scope > .kui-pane__footer')).not.toBeNull();
  });
});
