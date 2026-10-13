import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

// KF-1N0S19 overlay NavStack chrome: the top chrome paints the shared chrome
// material, and once `wireNavStack` has measured it, lies over the viewport,
// which hands the measured size to its views as the block-start edge context.

const components = resolve(import.meta.dirname, '../../src/components');

function declarations(
  file = resolve(components, 'navigation/nav-stack/nav-stack.css'),
) {
  const root = postcss.parse(readFileSync(file, 'utf8'));
  const found: { media: string; selector: string; decl: string }[] = [];
  root.walkDecls((decl) => {
    const parent = decl.parent as postcss.Rule;
    const at = parent.parent as postcss.AtRule;
    found.push({
      media: at.type === 'atrule' ? `@${at.name} ${at.params}` : '',
      selector: parent.selector.replace(/\s+/g, ' '),
      decl: `${decl.prop}:${decl.value.replace(/\s+/g, ' ')}`,
    });
  });
  return found;
}

const OVERLAY = '.kui-nav-stack[data-chrome-presentation="overlay"]';
const MEASURED = `${OVERLAY}[data-chrome-overlay="measured"]`;

describe('NavStack overlay chrome CSS', () => {
  const all = declarations();
  const at = (selector: string, media = '') =>
    all
      .filter((entry) => entry.selector === selector && entry.media === media)
      .map(({ decl }) => decl);

  it('paints the chrome (and its cross-fading copies) with the chrome material', () => {
    expect(at(`${OVERLAY} > .kui-nav-stack__chrome`)).toEqual([
      '-webkit-backdrop-filter:var(--kui-chrome-material-filter)',
      'backdrop-filter:var(--kui-chrome-material-filter)',
      'background:var(--kui-chrome-material)',
    ]);
  });

  it('lays only the measured live chrome over the viewport', () => {
    expect(
      at(
        `${MEASURED} > .kui-nav-stack__chrome:not(.kui-nav-stack__chrome-copy)`,
      ),
    ).toEqual([
      'position:absolute',
      'z-index:2',
      'inset-block-start:0',
      'inset-inline:0 var(--_kui-nav-stack-scrollbar-inline-size, 0px)',
    ]);
  });

  it('hands the measured size to the views as the block-start edge context', () => {
    expect(at(`${MEASURED} > .kui-nav-stack__viewport`)).toEqual([
      '--kui-edge-inset-block-start:var(--_kui-nav-stack-chrome-block-size, 0px)',
    ]);
    // It outranks the docked rule that zeroes the edge below the chrome.
    expect(at('.kui-nav-stack__chrome ~ .kui-nav-stack__viewport')).toEqual([
      '--kui-edge-inset-block-start:0px',
    ]);
  });

  it('paints an opaque system surface with a visible edge in forced colors', () => {
    expect(
      at(
        `${OVERLAY} > .kui-nav-stack__chrome`,
        '@media (forced-colors: active)',
      ),
    ).toEqual([
      '-webkit-backdrop-filter:none',
      'backdrop-filter:none',
      'background:Canvas',
      'border-block-end:1px solid CanvasText',
    ]);
  });

  it('lifts an untoned ToolbarText in the chrome (and its copies) to AA, from its own stylesheet', () => {
    const text = declarations(
      resolve(components, 'actions/toolbar-text/toolbar-text.css'),
    );
    const chrome = `${OVERLAY} > .kui-nav-stack__chrome .kui-toolbar-text:not([data-tone])`;
    const of = (suffix: string) =>
      text
        .filter((entry) =>
          entry.selector.split(', ').includes(`${chrome}${suffix}`),
        )
        .map(({ decl }) => decl);
    expect(of('')).toEqual(['color:var(--kui-color-text)']);
    expect(of(' .kui-toolbar-text__description')).toEqual([
      'color:color-mix( in srgb, var(--kui-color-text-quiet), var(--kui-color-text) 50% )',
    ]);
  });
});
