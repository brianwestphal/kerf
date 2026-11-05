// KF-6GT5QY: edge cases of the editor's models that the published module's
// coverage floor holds them to: catalogs without metadata, props without
// declared values, and comparisons that mix compatible and breaking changes.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ViewContract, ViewDocument } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import { createEditorCatalog } from '../../../src/editor/catalog.js';
import {
  controlOf,
  removeSlot,
  slotAt,
} from '../../../src/editor/model/control-flow.js';
import { controlFor, seedProps } from '../../../src/editor/model/controls.js';
import { findNode, visitNodes } from '../../../src/editor/model/document.js';
import {
  eachScopes,
  legalZones,
  promoteToParam,
  setProp as setPropOn,
} from '../../../src/editor/model/edits.js';
import {
  compareWithModule,
  exportModule,
} from '../../../src/editor/model/export.js';
import { documentInDeclaredOrder } from '../../../src/editor/model/fields.js';
import {
  groupedProps,
  type InspectorProp,
  inspectorSections,
} from '../../../src/editor/model/inspector.js';
import { outlineTree } from '../../../src/editor/model/outline.js';
import { markRows } from '../../../src/editor/model/play-values.js';
import { previewSlots } from '../../../src/editor/model/preview-slots.js';
import { sampleValue } from '../../../src/editor/model/sample-inputs.js';
import sample from '../../fixtures/view/inbox.kui.json';
import { propsByKey, viewCatalog } from './kerf-catalog.js';

const inbox = sample as unknown as ViewDocument;
const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
const prop = (
  name: string,
  type: Record<string, unknown>,
  extra: Partial<InspectorProp> = {},
) => ({ name, required: false, type, ...extra }) as unknown as InspectorProp;

describe('catalog edges', () => {
  it('names a package component with no export by its id', () => {
    const catalog = createEditorCatalog({
      props: [
        {
          schemaVersion: 1,
          package: '@acme/bare',
          components: [
            {
              key: '@acme/bare:panel',
              id: 'panel',
              source: 'package',
              props: [],
            },
          ],
        },
      ],
      composition: [],
      components: {},
    });
    expect(catalog.componentNames.get('@acme/bare:panel')).toBe('panel');
  });
});

describe('control edges', () => {
  it('leaves an enum without declared values read-only', () => {
    expect(controlFor(prop('mode', { kind: 'enum' }), undefined).kind).toBe(
      'readonly',
    );
  });

  it('skips required props and variants it cannot fill', () => {
    const props = [
      prop('label', { kind: 'string' }),
      prop('icon', { kind: 'element' }, { required: true }),
      prop('body', { kind: 'content' }, { zone: 'body' }),
    ];
    expect(
      seedProps(props, 'X', [
        { required: ['missing'] },
        { required: ['body'] },
      ]),
    ).toEqual({});
  });
});

describe('edit edges', () => {
  it('promotes a null prop as a literal default, into a document without params', () => {
    const bare = globalThis.structuredClone(inbox) as unknown as {
      params?: unknown;
      root: {
        zones: { header: { zones: { trailing: { props: object }[] } }[] };
      };
    };
    delete bare.params;
    bare.root.zones.header[0]!.zones.trailing[0]!.props = { badge: null };
    const result = promoteToParam(
      bare as unknown as ViewDocument,
      COMPOSE,
      'badge',
      'composeBadge',
      { kind: 'string' },
    );
    expect('document' in result && result.document.params).toEqual({
      composeBadge: { type: { kind: 'string' }, default: null },
    });
  });

  it('promotes an array prop as a literal default', () => {
    const result = promoteToParam(
      setPropOn(inbox, COMPOSE, 'badge', ['a']),
      COMPOSE,
      'badge',
      'composeBadges',
      { kind: 'string' },
    );
    expect(
      'document' in result && result.document.params?.composeBadges,
    ).toEqual({
      type: { kind: 'string' },
      default: ['a'],
    });
  });

  it('skips zones with no JSX prop and keeps package-qualified accepts', () => {
    const keys = new Set(['@acme/widgets:card', '@kerfjs/ui:button']);
    const zones = legalZones(
      { id: 'n', type: '@acme/widgets:frame' },
      {
        package: '@acme/widgets',
        zones: [
          {
            id: 'chrome',
            accepts: ['card'],
            cardinality: { min: 0, max: 'unbounded' },
          },
          {
            id: 'body',
            jsx: { prop: 'children' },
            accepts: ['card', '@kerfjs/ui:button'],
            cardinality: { min: 0, max: 'unbounded' },
          },
        ],
      },
      [],
      keys,
    );
    expect(zones).toEqual([
      {
        key: 'body',
        primary: true,
        accepts: ['@acme/widgets:card', '@kerfjs/ui:button'],
      },
    ]);
  });
});

describe('inspector edges', () => {
  it('groups only declared groups and documents a type with no text', () => {
    const component = {
      key: 'k',
      props: [prop('size', { kind: 'number' }, { group: 'Layout' })],
      groups: ['Layout'],
    };
    expect(groupedProps(component).map((group) => group.title)).toEqual([
      'Layout',
    ]);
    expect(inspectorSections(undefined, component)[0]!.rows[0]).toMatchObject({
      value: 'number?',
    });
  });
});

// KF-TGGSHZ: the canvas sets a popup's preview-only props itself; authored
// in a view they would make the app's popup inert, so the Inspector hides
// them. A dialog's `embedded` is a real in-flow presentation and stays.
describe('preview-only props', () => {
  const shown = (key: string) =>
    groupedProps(propsByKey.get(key) as never).flatMap((group) =>
      group.props.map((prop) => prop.name),
    );

  it('hides PopupMenu and Select embedded previews from the Inspector', () => {
    expect(shown('@kerfjs/ui:popup-menu')).not.toContain('embedded');
    expect(shown('@kerfjs/ui:popup-menu')).not.toContain('embeddedSubmenu');
    expect(shown('@kerfjs/ui:select')).not.toContain('embedded');
    expect(shown('@kerfjs/ui:popup-menu')).toContain('items');
  });

  it("keeps a dialog's embedded presentation authorable", () => {
    expect(shown('@kerfjs/ui:workbench-dialog')).toContain('embedded');
    expect(shown('@kerfjs/ui:list-detail-dialog')).toContain('embedded');
  });
});

describe('sample value edges', () => {
  it('builds an empty object for an object type without props', () => {
    expect(sampleValue({ kind: 'object' } as never, 'x', String)).toEqual({});
  });
});

describe('comparison edges', () => {
  it('lists compatible changes beside breaking ones', () => {
    const golden = readFileSync(
      resolve(import.meta.dirname, '../../fixtures/view/inbox.view.ts'),
      'utf8',
    );
    const current = exportModule(inbox, viewCatalog, 'module').contract;
    const compatible: ViewContract = {
      ...current,
      inputs: {
        ...current.inputs,
        subtitle: { optional: true, type: 'string' },
      },
    };
    expect(compareWithModule(golden, compatible).report).toEqual({
      title: 'Regenerating makes 1 contract change',
      detail: 'Compatible: input "subtitle" added',
      breaking: false,
    });
  });
});

// KF-PK3GVY: an empty draft has no root; every model reads it as empty.
describe('a rootless document', () => {
  const rootless = {
    schema: 'kerf-ui-document/v1',
    name: 'Untitled',
    catalogs: ['@kerfjs/ui'],
  } as ViewDocument;
  const address = { parent: COMPOSE, zone: 'content', index: 0 };

  it('has no nodes, scopes, controls, slots, or outline rows', () => {
    expect(visitNodes(rootless)).toEqual([]);
    expect(findNode(rootless, COMPOSE)).toBeUndefined();
    expect(eachScopes(rootless, COMPOSE)).toEqual([]);
    expect(controlOf(rootless, COMPOSE)).toBeUndefined();
    expect(slotAt(rootless, address)).toBeUndefined();
    expect(removeSlot(rootless, address)).toBe(rootless);
    expect(outlineTree(rootless, new Map())).toEqual([]);
  });

  it('passes through the preview and save transforms unchanged', () => {
    expect(previewSlots(rootless).document).toBe(rootless);
    expect(markRows(rootless, viewCatalog)).toBe(rootless);
    expect(
      documentInDeclaredOrder(
        rootless,
        (key) => propsByKey.get(key)?.props,
        () => ({}),
      ),
    ).toBe(rootless);
  });
});
