import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { paneConfigProps } from '../../src/components/layout/pane/internal/pane-config-props.js';
import { Pane } from '../../src/components/layout/pane/pane.js';
import { NavStack } from '../../src/components/navigation/nav-stack/nav-stack.js';
import { TabNavigator } from '../../src/components/navigation/tab-navigator/tab-navigator.js';

// KF-TQ3NHD clear chrome: `clear` is an overlay presentation (same measuring
// and clearance) with a transparent fill, and `scrollEdge="material"` fades the
// chrome material in on a ::before pseudo-element (opacity only) from the
// scroll state the wiring already publishes.

const components = resolve(import.meta.dirname, '../../src/components');

function declarations(file: string) {
  const root = postcss.parse(readFileSync(resolve(components, file), 'utf8'));
  const found: { selector: string; media: string; decl: string }[] = [];
  root.walkDecls((decl) => {
    const rule = decl.parent as postcss.Rule;
    const at =
      rule.parent?.type === 'atrule'
        ? (rule.parent as postcss.AtRule).params
        : '';
    found.push({
      selector: rule.selector.replace(/\s+/g, ' '),
      media: at,
      decl: `${decl.prop}:${decl.value.replace(/\s+/g, ' ')}`,
    });
  });
  return found;
}

const header = <span>Title</span>;

describe('clear chrome', () => {
  it('Pane renders clear as an overlay header with a clear material and an opt-in scroll edge', () => {
    const html = String(
      Pane({
        header,
        headerPresentation: 'clear',
        scrollEdge: 'material',
        children: <span>Rows</span>,
      }),
    );
    expect(html).toContain('data-header-presentation="overlay"');
    expect(html).toContain('data-header-material="clear"');
    expect(html).toContain('data-scroll-edge="material"');
    expect(html).not.toContain('data-scroll-edge-distance');
    expect(
      String(
        Pane({
          header,
          headerPresentation: 'clear',
          scrollEdge: 'surface',
          scrollEdgeDistance: 120,
          children: <span>Rows</span>,
        }),
      ),
    ).toContain('data-scroll-edge="surface" data-scroll-edge-distance="120"');

    const overlay = String(
      Pane({
        header,
        headerPresentation: 'overlay',
        scrollEdge: 'material',
        children: <span>Rows</span>,
      }),
    );
    expect(overlay).not.toContain('data-header-material');
    // A scroll edge means nothing without clear chrome.
    expect(overlay).not.toContain('data-scroll-edge');
    // No header, no chrome.
    expect(
      String(
        Pane({ headerPresentation: 'clear', children: <span>Rows</span> }),
      ),
    ).not.toContain('data-header-material');
    expect(paneConfigProps({ scrollEdge: 'material' }).scrollEdge).toBe(
      'material',
    );
  });

  it('NavStack and TabNavigator render clear bars and the scroll edge', () => {
    const stack = String(
      NavStack({
        id: 'stack',
        label: 'Music',
        chromePresentation: 'clear',
        bottomToolbarPresentation: 'clear',
        scrollEdge: 'material',
        views: [{ key: 'home', content: <span>Home</span> }],
      }),
    );
    expect(stack).toContain('data-chrome-presentation="overlay"');
    expect(stack).toContain('data-chrome-material="clear"');
    expect(stack).toContain('data-bottom-toolbar-presentation="overlay"');
    expect(stack).toContain('data-bottom-toolbar-material="clear"');
    expect(stack).toContain('data-scroll-edge="material"');

    // Over imagery the stack's own back control rides on a glass group.
    const pushed = String(
      NavStack({
        id: 'stack',
        label: 'Music',
        chromePresentation: 'clear',
        views: [
          { key: 'home', content: <span>Home</span> },
          { key: 'album', content: <span>Album</span> },
        ],
      }),
    );
    expect(pushed).toMatch(
      /<div class="kui-toolbar-control-group[^"]*"[^>]*data-material="glass"[^>]*>\s*<button[^>]*data-nav-back/,
    );

    const hidden = String(
      NavStack({
        id: 'stack',
        label: 'Music',
        chromePresentation: 'clear',
        hideToolbar: true,
        scrollEdge: 'material',
        views: [{ key: 'home', content: <span>Home</span> }],
      }),
    );
    expect(hidden).not.toContain('data-chrome-material');
    expect(hidden).not.toContain('data-scroll-edge');

    const tabs = String(
      TabNavigator({
        id: 'tabs',
        label: 'Sections',
        active: 'a',
        barPresentation: 'clear',
        scrollEdge: 'material',
        tabs: [{ id: 'a', label: 'A', content: <span>A</span> }],
      }),
    );
    expect(tabs).toContain('data-bar-presentation="overlay"');
    expect(tabs).toContain('data-bar-material="clear"');
    expect(tabs).toContain('data-scroll-edge="material"');
  });

  for (const [file, bar, state] of [
    ['layout/pane/pane.css', '.kui-pane__header', 'b'],
    ['navigation/nav-stack/nav-stack.css', '.kui-nav-stack__chrome', 'b'],
    ['navigation/nav-stack/nav-stack.css', '.kui-nav-stack__bottom', 't'],
    [
      'navigation/tab-navigator/tab-navigator.css',
      '.kui-tab-scaffold__bar',
      't',
    ],
  ] as const)
    it(`${bar} is transparent and fades the material by opacity only`, () => {
      const decls = declarations(file).filter((entry) =>
        entry.selector.includes(bar),
      );
      const clear = decls.filter(
        (entry) =>
          entry.media === '' &&
          entry.selector.endsWith(`> ${bar}`) &&
          /^\.kui-[\w-]+\[data-[\w-]+-material="clear"\] > /.test(
            entry.selector,
          ) &&
          !entry.selector.includes('data-scroll-edge'),
      );
      expect(clear.map((entry) => entry.decl)).toEqual([
        '-webkit-backdrop-filter:none',
        'backdrop-filter:none',
        'background:transparent',
      ]);
      const rule = (suffix: string) =>
        decls
          .filter(
            (entry) =>
              entry.media === '' &&
              !entry.selector.startsWith(':root') &&
              entry.selector.endsWith(suffix),
          )
          .map((entry) => entry.decl);
      // The layer follows the published progress; only its opacity changes.
      expect(rule(`[data-scroll-edge] > ${bar}::before`)).toContain(
        'opacity:var(--kui-scroll-edge-progress, 0)',
      );
      expect(rule(`[data-scroll-edge="material"] > ${bar}::before`)).toEqual([
        '-webkit-backdrop-filter:var(--kui-chrome-material-filter)',
        'backdrop-filter:var(--kui-chrome-material-filter)',
        'background:var(--kui-chrome-material)',
      ]);
      expect(rule(`[data-scroll-edge="surface"] > ${bar}::before`)).toEqual([
        'background:var(--kui-color-surface)',
      ]);
      expect(
        decls.some(
          (entry) =>
            entry.selector.includes('data-scroll-edge') &&
            entry.decl.startsWith('transition:'),
        ),
      ).toBe(false);
      // Static effects and slow displays snap on the scroll state instead.
      for (const scope of [
        (entry: (typeof decls)[number]) =>
          entry.selector.startsWith(':root[data-kui-effects="static"]'),
        (entry: (typeof decls)[number]) => entry.media === '(update: slow)',
      ])
        expect(
          decls.some(
            (entry) =>
              scope(entry) &&
              entry.selector.includes(`[data-scroll-divider*="${state}"]`) &&
              entry.decl === 'opacity:1',
          ),
        ).toBe(true);
      expect(
        decls.some(
          (entry) =>
            entry.media ===
              '(prefers-reduced-transparency: reduce), (prefers-contrast: more)' &&
            entry.decl === 'background:var(--kui-chrome-material)',
        ),
      ).toBe(true);
      expect(
        decls.some(
          (entry) =>
            entry.media === '(forced-colors: active)' &&
            entry.decl === 'content:none',
        ),
      ).toBe(true);
    });
});
