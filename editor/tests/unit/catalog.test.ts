// KF-6GT5QY: an editor's catalog can add an application package's catalogs
// and component functions beside Kerf UI's.
import catalogJson from '@kerfjs/ui/ai/component-catalog.json';
import compositionJson from '@kerfjs/ui/ai/component-composition.json';
import propsJson from '@kerfjs/ui/ai/component-props.json';
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount, raw } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { createEditorCatalog, defaultCatalog } from '../../src/catalog.js';
import { componentFunctions } from '../../src/components.js';
import { createEditor } from '../../src/editor.js';
import widgetsComposition from '../fixtures/widgets-composition.json';
import widgetsProps from '../fixtures/widgets-props.json';

const catalog = createEditorCatalog({
  props: [propsJson, widgetsProps],
  composition: [compositionJson, widgetsComposition],
  selection: [catalogJson],
  components: {
    ...componentFunctions(),
    '@acme/widgets:meter': () =>
      raw('<meter data-acme-meter value="0.4"></meter>'),
  },
});

const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const METER = '01JB8Z1M6Q8E1X9V4S7K2R3T6A';
const CARD = '01JB8Z1M6Q8E1X9V4S7K2R3T6B';
const document_: ViewDocument = {
  schema: 'kerf-ui-document/v1',
  name: 'Usage',
  catalogs: ['@kerfjs/ui', '@acme/widgets'],
  root: {
    id: PANE,
    type: '@kerfjs/ui:pane',
    zones: {
      content: [
        { id: METER, type: '@acme/widgets:meter' },
        { id: CARD, type: '@acme/widgets:card' },
      ],
    },
  },
} as unknown as ViewDocument;

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

describe('createEditorCatalog', () => {
  it('names and groups an application package’s components after Kerf UI’s', () => {
    expect(catalog.componentNames.get('@acme/widgets:meter')).toBe('Meter');
    expect(catalog.propsByKey.get('@acme/widgets:card')?.source).toBe(
      'package',
    );
    const groups = catalog.paletteGroups();
    expect(groups.at(-1)).toEqual({
      category: 'Application',
      items: [
        { key: '@acme/widgets:card', name: 'Card' },
        { key: '@acme/widgets:meter', name: 'Meter' },
      ],
    });
    expect(groups.slice(0, -1).map((group) => group.category)).toEqual(
      defaultCatalog.paletteGroups().map((group) => group.category),
    );
    expect(catalog.viewCatalog.components.has('@acme/widgets:meter')).toBe(
      true,
    );
  });

  it('works without a selection catalog', () => {
    const bare = createEditorCatalog({
      props: [widgetsProps],
      composition: [widgetsComposition],
      components: {},
    });
    expect(bare.componentNames.get('@acme/widgets:card')).toBe('Card');
    expect(bare.paletteGroups()).toHaveLength(1);
  });
});

describe('an editor over an application catalog', () => {
  it('previews registered app components and a placeholder for the rest', () => {
    const root = window.document.createElement('div');
    window.document.body.append(root);
    const editor = createEditor({ catalog, document: document_ });
    const stop = mount(root, editor.render);
    const unwire = editor.wire(root);
    cleanup = () => {
      unwire();
      stop();
    };
    const canvas = root.querySelector('[data-editor-canvas]')!;
    expect(canvas.querySelector('[data-acme-meter]')).not.toBeNull();
    expect(
      canvas.querySelector(`[data-kerf-node="${CARD}"]`)?.textContent,
    ).toBe('Card cannot render');
    expect(root.textContent).toContain('Application');
    expect(root.textContent).toContain('valid');
  });
});
