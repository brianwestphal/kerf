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
      valueOf(
        file,
        '[data-scroll-clearance], [data-frame',
        'scroll-padding-block',
      ),
    ).toBe(
      'calc( var(--_kui-list-clearance-start) + var(--_kui-list-ring-room) ) calc(var(--_kui-list-clearance-end) + var(--_kui-list-ring-room))',
    );
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

  it('Pane lays a measured overlay header over its content, which clears it automatically', () => {
    const file = 'layout/pane/pane.css';
    const all = declarations(file);
    const material = all.filter(
      (decl) =>
        decl.selector ===
        '.kui-pane[data-header-presentation="overlay"] > .kui-pane__header',
    );
    expect(material.map(({ prop, value }) => `${prop}:${value}`)).toEqual([
      '-webkit-backdrop-filter:var(--kui-chrome-material-filter)',
      'backdrop-filter:var(--kui-chrome-material-filter)',
      'background:var(--kui-chrome-material)',
      // Forced colors: an opaque system surface and a visible edge.
      '-webkit-backdrop-filter:none',
      'backdrop-filter:none',
      'background:Canvas',
      'border-block-end:1px solid CanvasText',
    ]);
    const measured = (suffix: string) =>
      all.filter(
        (decl) =>
          decl.selector.includes('[data-header-overlay="measured"]') &&
          decl.selector.includes(':not( [data-chrome-placement="auto"] )') &&
          decl.selector.endsWith(suffix),
      );
    expect(
      measured('> .kui-pane__header').map(
        ({ prop, value }) => `${prop}:${value}`,
      ),
    ).toEqual([
      'position:relative',
      'z-index:1',
      'align-self:start',
      'grid-area:content',
      // A classic scrollbar's strip stays uncovered (KF-ZZAVRW).
      'margin-inline-end:var(--kui-pane-scrollbar-inline-size, 0px)',
    ]);
    expect(
      measured('> .kui-pane__content').map(
        ({ prop, value }) => `${prop}:${value}`,
      ),
    ).toEqual([
      '--_kui-pane-clearance-block-start:var( --kui-scroll-clearance-block-start, 0px )',
    ]);
  });

  it('defines the chrome material, opaque without backdrop-filter or under reduced transparency and increased contrast', () => {
    const root = postcss.parse(
      readFileSync(resolve(src, '../foundation.css'), 'utf8'),
    );
    const found: string[] = [];
    root.walkDecls(/^--kui-chrome-material/, (decl) => {
      const parent = decl.parent as postcss.Rule;
      const at = parent.parent as postcss.AtRule;
      found.push(
        `${at.type === 'atrule' ? `@${at.name} ${at.params.replace(/\s+/g, ' ')} ` : ''}${parent.selector} ${decl.prop}:${decl.value.replace(/\s+/g, ' ')}`,
      );
    });
    expect(found).toEqual([
      ':root --kui-chrome-material:color-mix( in srgb, var(--kui-color-surface) 80%, transparent )',
      ':root --kui-chrome-material-filter:blur(20px) saturate(180%)',
      '@supports not ( (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) ) :root --kui-chrome-material:var(--kui-color-surface)',
      '@supports not ( (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) ) :root --kui-chrome-material-filter:none',
      '@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) :root --kui-chrome-material:var(--kui-color-surface)',
      '@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) :root --kui-chrome-material-filter:none',
    ]);
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
