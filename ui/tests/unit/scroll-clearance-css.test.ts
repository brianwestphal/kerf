import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

// KF-ET0EX8 scroll clearance: overlaying chrome publishes the inherited
// `--kui-scroll-clearance-block-*` context, and a List or Pane consumes it
// only when its `scrollClearance` prop opts in.

const src = resolve(import.meta.dirname, '../../src/components');

function declarations(file: string) {
  const root = postcss.parse(readFileSync(resolve(src, file), 'utf8'));
  const found: { selector: string; prop: string; value: string }[] = [];
  root.walkDecls((decl) => {
    const parent = decl.parent as postcss.Rule;
    found.push({
      selector: parent.selector.replace(/\s+/g, ' '),
      prop: decl.prop,
      value: decl.value.replace(/\s+/g, ' '),
    });
  });
  return found;
}

function valueOf(
  file: string,
  selectorPart: string,
  prop: string,
): string | undefined {
  return declarations(file).find(
    (decl) => decl.selector.includes(selectorPart) && decl.prop === prop,
  )?.value;
}

describe('scroll clearance context', () => {
  it('List reads each edge only when it opts in, into padding and scroll padding', () => {
    const file = 'collections/list/list.css';
    expect(valueOf(file, '.kui-list', '--_kui-list-clearance-start')).toBe(
      '0px',
    );
    expect(
      valueOf(
        file,
        '[data-scroll-clearance="block-start"]',
        '--_kui-list-clearance-start',
      ),
    ).toBe('var(--kui-scroll-clearance-block-start, 0px)');
    expect(
      valueOf(
        file,
        '[data-scroll-clearance="block-end"]',
        '--_kui-list-clearance-end',
      ),
    ).toBe('var(--kui-scroll-clearance-block-end, 0px)');
    expect(
      valueOf(file, '.kui-list[data-scroll-clearance]', 'scroll-padding-block'),
    ).toBe('var(--_kui-list-clearance-start) var(--_kui-list-clearance-end)');
    expect(valueOf(file, '.kui-list', 'padding')).toContain(
      'var(--_kui-list-clearance-end)',
    );
  });

  it('Pane adds the opted-in clearance to its content block insets', () => {
    const file = 'layout/pane/pane.css';
    expect(
      valueOf(
        file,
        '[data-scroll-clearance="block-end"]',
        '--_kui-pane-clearance-block-end',
      ),
    ).toBe('var(--kui-scroll-clearance-block-end, 0px)');
    expect(
      valueOf(file, '.kui-pane__content', '--_kui-pane-content-block-end'),
    ).toContain('var(--_kui-pane-clearance-block-end)');
  });

  it('DialogSurface clears the context in its body and publishes the floating footer for an opted-in filling child', () => {
    const file = 'surfaces/surface-scaffold/surface-scaffold.css';
    const all = declarations(file);
    const reset = all.filter(
      (decl) =>
        decl.selector === '.kui-dialog-surface > wa-dialog::part(body)' &&
        decl.prop.startsWith('--kui-scroll-clearance-'),
    );
    expect(reset.map(({ prop, value }) => `${prop}:${value}`)).toEqual([
      '--kui-scroll-clearance-block-start:0px',
      '--kui-scroll-clearance-block-end:0px',
    ]);
    const published = all.filter((decl) => decl.selector.includes(':has('));
    expect(published.map(({ prop, value }) => `${prop}:${value}`)).toEqual([
      '--kui-scroll-clearance-block-end:var(--_kui-dialog-surface-footer-clearance)',
      'padding-block-end:0',
    ]);
    expect(published[0]!.selector).toContain(
      '[data-footer-presentation="floating"]',
    );
  });
});
