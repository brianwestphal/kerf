import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

interface ClassOwner {
  className: string;
  render: string[];
  element?: string;
}

// The shared KUI-L103 rule both eslint-plugin-kerfjs and the generated
// ai/components pages consume; its agreement over the shipped catalog is
// pinned by eslint-plugin/tests/rules/ui-class-owners.test.js.
const owners = createRequire(import.meta.url)(
  '../../ai/component-class-owners.cjs',
) as {
  classRenderers(
    className: string,
    entryName: string,
    exports: readonly unknown[],
  ): string[];
  componentClassOwnership(entry: {
    name: string;
    exports?: readonly unknown[];
    publicClasses?: readonly string[];
    placeableClasses?: readonly string[];
    rootElement?: string;
  }): ClassOwner[];
  componentExportNames(exports?: readonly unknown[]): string[];
};

describe('component class ownership', () => {
  it('keeps only PascalCase render exports, once each', () => {
    expect(
      owners.componentExportNames([
        'Select',
        'uiColor',
        'SelectProps',
        'Select',
        undefined,
        'Option',
      ]),
    ).toEqual(['Select', 'Option']);
    expect(owners.componentExportNames()).toEqual([]);
  });

  it('names the export after the class block, longest block first', () => {
    const exports = ['Toolbar', 'ToolbarActionLink', 'Link'];
    expect(
      owners.classRenderers('kui-toolbar-action-link', 'Toolbar', exports),
    ).toEqual(['ToolbarActionLink']);
    expect(
      owners.classRenderers('kui-toolbar__leading', 'Toolbar', exports),
    ).toEqual(['Toolbar']);
    expect(
      owners.classRenderers('acme-meter__bar--hot', 'Meter', ['Meter']),
    ).toEqual(['Meter']);
  });

  it('falls back to the entry export, then to every component export', () => {
    expect(
      owners.classRenderers('kui-surface', 'Card', ['Card', 'CardHeader']),
    ).toEqual(['Card']);
    expect(
      owners.classRenderers('kui-surface', 'Layout', ['NavStack', 'px']),
    ).toEqual(['NavStack']);
    expect(
      owners.classRenderers('kui-surface', 'Layout', ['A', 'B', 'A']),
    ).toEqual(['A', 'B']);
  });

  it('owns anatomy, skips placeable classes, and keeps a rootElement carrier', () => {
    expect(
      owners.componentClassOwnership({
        name: 'Pane',
        exports: ['Pane', 'PaneProps'],
        publicClasses: ['kui-pane', 'kui-pane__content', 'kui-content'],
        placeableClasses: ['kui-content'],
      }),
    ).toEqual([
      { className: 'kui-pane', render: ['Pane'] },
      { className: 'kui-pane__content', render: ['Pane'] },
    ]);
    expect(
      owners.componentClassOwnership({
        name: 'ContentItem',
        exports: ['ContentItem'],
        publicClasses: ['kui-content-item', 'kui-content-item--framed'],
        placeableClasses: ['kui-content-item', 'kui-content-item--framed'],
        rootElement: 'div',
      }),
    ).toEqual([
      {
        className: 'kui-content-item',
        render: ['ContentItem'],
        element: 'div',
      },
      {
        className: 'kui-content-item--framed',
        render: ['ContentItem'],
        element: 'div',
      },
    ]);
  });

  it('owns nothing for an entry without a component export', () => {
    expect(
      owners.componentClassOwnership({
        name: 'Content',
        exports: ['px'],
        publicClasses: ['kui-content'],
      }),
    ).toEqual([]);
    expect(owners.componentClassOwnership({ name: 'Empty' })).toEqual([]);
  });
});
