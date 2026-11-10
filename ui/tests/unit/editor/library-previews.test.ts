import type { ViewDocument } from '@kerfjs/ui/view';
import { mount, raw } from 'kerfjs';
import { describe, expect, it, vi } from 'vitest';

import selection from '../../../ai/component-catalog.json';
import composition from '../../../ai/component-composition.json';
import props from '../../../ai/component-props.json';
import {
  defineLibraryPreviews,
  type LibraryPreviewContext,
  type LibraryPreviews,
  libraryPreviewSamples,
  mergeLibraryPreviews,
} from '../../../src/editor/library-previews.js';
import { createLibraryThumbnails } from '../../../src/editor/library-thumbnail-renderer.js';
import {
  componentFunctions,
  createEditor,
  createEditorCatalog,
  defaultCatalog,
} from './kerf-catalog.js';
const previewCatalog = (libraryPreviews?: LibraryPreviews) =>
  createEditorCatalog({
    props: [props],
    composition: [
      {
        ...composition,
        libraryPreviews: {
          [key]: { props: { children: 'Metadata sample' } },
          '@kerfjs/ui:workbench': {},
        },
      },
    ],
    selection: [selection],
    components: componentFunctions(),
    libraryPreviews,
  });

const key = '@kerfjs/ui:button';
const doc = (): ViewDocument => ({
  schema: 'kerf-ui-document/v1',
  name: 'Thumbnail',
  catalogs: ['@kerfjs/ui'],
  root: {
    id: '01JB8Z1M6Q8E1X9V4S7K2R3T8A',
    type: key,
    props: { children: 'Default' },
  },
});
const component = () =>
  vi.fn((props: never) =>
    raw(
      `<button>${String((props as { children: unknown }).children)}</button>`,
    ),
  );
function thumbnails(previews: LibraryPreviews = {}, render = component()) {
  const catalog = {
    ...defaultCatalog,
    components: { ...defaultCatalog.components, [key]: render },
  };
  const documentOf = vi.fn(doc);
  return {
    ...createLibraryThumbnails(catalog, previews, documentOf),
    render,
    catalog,
    documentOf,
  };
}

describe('Library preview registration', () => {
  it('keeps typed registrations intact and replaces whole entries in order', () => {
    const entry = { [key]: { sampleProps: () => ({ children: 'Example' }) } };
    expect(
      defineLibraryPreviews(
        { [key]: (_props: { children: string }) => raw('') },
        entry,
      ),
    ).toBe(entry);
    const base = {
      [key]: { render: () => raw('<svg/>'), fit: 'fill' as const },
    };
    expect(mergeLibraryPreviews(undefined, base, entry)[key]).toBe(entry[key]);
    expect(mergeLibraryPreviews(base, { [key]: {} })).toEqual({ [key]: {} });
    expect(
      mergeLibraryPreviews(base, { [key]: null, bad: [], ignored: 1 } as never),
    ).toEqual(base);
  });

  it('copies literal JSON samples freshly without evaluating view-shaped data', () => {
    const props = {
      children: 'Sample',
      count: 2,
      enabled: true,
      absent: null,
      nested: [{ id: 1 }],
      expression: { $css: 'literal' },
      binding: { $param: 'literal' },
      icon: { $icon: 'literal' },
    };
    const previews = libraryPreviewSamples([
      { libraryPreviews: { [key]: { props } } },
    ]);
    const first = previews[key].sampleProps!() as typeof props;
    first.nested[0].id = 999;
    props.children = 'Changed after registration';
    const second = previews[key].sampleProps!() as typeof props;
    expect(second.nested[0].id).toBe(1);
    expect(second.children).toBe('Sample');
    expect(second.expression).toEqual({ $css: 'literal' });
    expect(second.binding).toEqual({ $param: 'literal' });
    expect(second.icon).toEqual({ $icon: 'literal' });
    const plain = Object.assign(Object.create(null), {
      children: 'Null prototype',
    });
    expect(
      libraryPreviewSamples([{ libraryPreviews: { [key]: { props: plain } } }])[
        key
      ].sampleProps!(),
    ).toEqual({ children: 'Null prototype' });
  });

  it('rejects non-JSON metadata and ignores unknown metadata fields', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    const symbolKey = { [Symbol('hidden')]: 1 };
    for (const props of [
      null,
      [],
      { value: undefined },
      { value: NaN },
      { value: Infinity },
      { value: () => 1 },
      { value: Symbol('x') },
      { value: 1n },
      { value: new Date() },
      cycle,
      symbolKey,
    ]) {
      expect(
        libraryPreviewSamples([{ libraryPreviews: { [key]: { props } } }]),
      ).toEqual({});
    }
    expect(
      libraryPreviewSamples([
        null,
        [],
        {},
        { libraryPreviews: [] },
        {
          libraryPreviews: {
            bad: null,
            executable: { render: 'not code' },
            [key]: {},
          },
        },
      ]),
    ).toEqual({ [key]: {} });
  });
});

describe('Library-only renderer', () => {
  it('renders ordinary seeded props once and leaves the canonical registry intact', () => {
    const f = thumbnails();
    expect(f.htmlOf(key)).toContain('Default');
    expect(f.htmlOf(key)).toContain('Default');
    expect(f.render).toHaveBeenCalledTimes(1);
    expect(f.documentOf).toHaveBeenCalledTimes(1);
    expect(f.catalog.components[key]).toBe(f.render);
    expect(f.fitOf(key)).toBe('contain');
    expect(f.htmlOf('unknown:component')).toBeUndefined();
    expect(f.documentOf).toHaveBeenCalledTimes(1);
  });

  it('passes fresh sample props and component context to static renderers', () => {
    const render = vi.fn(
      ({
        props,
        key: componentKey,
        name,
      }: LibraryPreviewContext<{ children: string }>) =>
        raw(
          `<svg data-key="${componentKey}" data-name="${name}"><text>${(props as { children: string }).children}</text></svg>`,
        ),
    );
    const f = thumbnails({
      [key]: {
        sampleProps: () => ({ children: 'Only in Library' }),
        render,
        fit: 'fill',
      },
    });
    expect(f.htmlOf(key)).toContain('Only in Library');
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({ key, name: 'Button' }),
    );
    expect(f.render).not.toHaveBeenCalled();
    expect(f.fitOf(key)).toBe('fill');
    expect(doc().root!.props!.children).toBe('Default');
  });

  it.each([
    () => undefined,
    () => raw(''),
    () => 'not SafeHtml' as never,
    () => {
      throw new Error('bad schematic');
    },
  ])(
    'falls back from invalid or empty custom output to sampled live output (%#)',
    (render) => {
      const f = thumbnails({
        [key]: { render, sampleProps: () => ({ children: 'Sample' }) },
      });
      expect(f.htmlOf(key)).toContain('Sample');
      expect(f.render).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps failed and malformed sample factories from changing seeded props', () => {
    for (const sampleProps of [
      () => {
        throw new Error('bad sample');
      },
      () => 1 as never,
      () => undefined as never,
      () => Promise.resolve({ children: 'Async' }) as never,
    ]) {
      const f = thumbnails({ [key]: { sampleProps } });
      expect(f.htmlOf(key)).toContain('Default');
    }
  });

  it('retries an incompatible sample with ordinary props before showing an icon', () => {
    const render = vi.fn((props: never) => {
      if ((props as { children: string }).children === 'Bad sample')
        throw new Error('bad sample');
      return raw('<button>Ordinary fallback</button>');
    });
    const f = thumbnails(
      { [key]: { sampleProps: () => ({ children: 'Bad sample' }) } },
      render,
    );
    expect(f.htmlOf(key)).toContain('Ordinary fallback');
    expect(render).toHaveBeenCalledTimes(2);
    const failed = thumbnails(
      { [key]: { sampleProps: () => ({ children: 'Bad sample' }) } },
      vi.fn(() => {
        throw new Error('always broken');
      }),
    );
    expect(failed.htmlOf(key)).toBe('');
    const invalid = thumbnails(
      {},
      vi.fn(() => 'invalid result' as never),
    );
    expect(invalid.htmlOf(key)).toBe('');
  });

  it('supports custom previews even when the component function is unavailable', () => {
    const catalog = { ...defaultCatalog, components: {} };
    expect(
      createLibraryThumbnails(
        catalog,
        { [key]: { render: () => raw('<svg data-static/>') } },
        doc,
      ).htmlOf(key),
    ).toContain('data-static');
    expect(createLibraryThumbnails(catalog, {}, doc).htmlOf(key)).toBe('');
  });
});

// The public host/catalog layers are exercised through the actual editor too.
describe('catalog and editor preview precedence', () => {
  it('places serializable samples after builtins and explicit catalog entries last', () => {
    const base = previewCatalog();
    expect(base.libraryPreviews![key].sampleProps!()).toEqual({
      children: 'Metadata sample',
    });
    expect(base.libraryPreviews!['@kerfjs/ui:workbench']).toEqual({});
    const override = { sampleProps: () => ({ children: 'Catalog override' }) };
    expect(previewCatalog({ [key]: override }).libraryPreviews![key]).toBe(
      override,
    );
  });
  it('keeps host samples, fallback icons and insertion defaults separate from the canvas', async () => {
    const catalog = previewCatalog();
    const original = catalog.components[key];
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor({
      catalog,
      libraryPreviews: {
        [key]: {
          sampleProps: () => ({ children: 'Host sample' }),
          icon: 1 as never,
        },
      },
    });
    const stop = mount(root, editor.render),
      unwire = editor.wire(root);
    try {
      const before = globalThis.structuredClone(editor.document.value);
      root
        .querySelector<HTMLElement>(
          '[data-segmented-control-id="editor-palette-view"] [data-segment-value="grid"]',
        )!
        .click();
      const host = root.querySelector<HTMLElement>(
        `[data-editor-palette="${key}"] [data-editor-palette-thumb]`,
      )!;
      await vi.waitFor(() =>
        expect(host.shadowRoot?.textContent).toContain('Host sample'),
      );
      expect(host.querySelector('svg')).not.toBeNull();
      expect(root.querySelector('[data-editor-canvas]')!.textContent).toContain(
        'Compose',
      );
      expect(
        root.querySelector('[data-editor-canvas]')!.textContent,
      ).not.toContain('Host sample');
      expect(editor.document.value).toEqual(before);
      expect(catalog.components[key]).toBe(original);
      expect(catalog.libraryPreviews![key].sampleProps!()).toEqual({
        children: 'Metadata sample',
      });
    } finally {
      unwire();
      stop();
      root.remove();
    }
  });
});
