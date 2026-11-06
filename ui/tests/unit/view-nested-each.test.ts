// KF-CFA1S1: an `$each` inside another `$each`'s row. kerf refuses a keyed
// each() inside a row render (the row is flattened to HTML, so the inner list
// is never reconciled), so the interpreter and the generated module both
// render the inner repeat as a plain map that re-renders with its row, and
// validation rejects the one shape neither can render: a composed document
// whose own repeat lands inside the composing document's row (KUI-V016).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { mount, type SafeHtml, signal } from 'kerfjs';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { List } from '../../src/list.js';
import { ListItem } from '../../src/list-item.js';
import { Pane } from '../../src/pane.js';
import { Text } from '../../src/text.js';
import {
  contractDigest,
  contractOf,
  createViewCatalog,
  generateView,
  interpretView,
  previewView,
  validateView,
} from '../../view/index.mjs';
import { generatedViewScratch } from './helpers/generated-view.js';

const root = resolve(import.meta.dirname, '../..');
const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const catalog = createViewCatalog({
  props: [readJson('ai/component-props.json')],
  composition: [readJson('ai/component-composition.json')],
});
const ui = '@kerfjs/ui';
const components = {
  [`${ui}:list`]: List,
  [`${ui}:list-item`]: ListItem,
  [`${ui}:pane`]: Pane,
  [`${ui}:text`]: Text,
} as Record<string, (props: never) => SafeHtml>;

const tabType = {
  kind: 'object',
  props: [
    { name: 'id', type: { kind: 'string' }, required: true },
    { name: 'label', type: { kind: 'string' }, required: true },
  ],
};
const groupType = {
  kind: 'object',
  props: [
    { name: 'id', type: { kind: 'string' }, required: true },
    { name: 'label', type: { kind: 'string' }, required: true },
    {
      name: 'tabs',
      type: { kind: 'array', items: tabType },
      required: true,
    },
  ],
};

/** Groups, each a List of its tabs: a repeat inside a repeat's row. */
const groupsDocument = () => ({
  schema: 'kerf-ui-document/v1',
  name: 'Groups',
  catalogs: [ui],
  params: {
    groups: { type: { kind: 'array', items: groupType } },
  },
  root: {
    id: '01JB8Z1M6Q8E1X9V4S7K2R3N00',
    type: `${ui}:pane`,
    zones: {
      content: [
        {
          $each: { $param: 'groups' },
          as: 'group',
          key: 'group.id',
          template: {
            id: '01JB8Z1M6Q8E1X9V4S7K2R3N01',
            name: 'groupList',
            type: `${ui}:list`,
            props: { ariaLabel: { $bind: 'group.label' } },
            zones: {
              children: [
                {
                  $each: { $bind: 'group.tabs' },
                  as: 'tab',
                  key: 'tab.id',
                  template: {
                    id: '01JB8Z1M6Q8E1X9V4S7K2R3N02',
                    name: 'tab',
                    type: `${ui}:list-item`,
                    props: {
                      label: { $bind: 'tab.label' },
                      action: { $action: 'open-tab' },
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  },
});

interface Groups {
  readonly groups: readonly {
    readonly id: string;
    readonly label: string;
    readonly tabs: readonly { readonly id: string; readonly label: string }[];
  }[];
}
interface GeneratedGroups {
  renderGroups(inputs: Groups): SafeHtml;
  wireGroups(
    root: HTMLElement,
    handlers: Record<string, (context: { key: string }) => void>,
  ): () => void;
}

const generated = generatedViewScratch();
afterAll(() => generated.dispose());
const loadGenerated = (document: object) =>
  generated.load<GeneratedGroups>(document, catalog);

const fixtures: Groups[] = [
  { groups: [] },
  {
    groups: [
      {
        id: 'g1',
        label: 'One',
        tabs: [
          { id: 'a', label: 'Alpha' },
          { id: 'b', label: 'Beta' },
        ],
      },
      { id: 'g2', label: 'Two', tabs: [] },
      { id: 'g3', label: 'Three', tabs: [{ id: 'c', label: 'Gamma <c>' }] },
    ],
  },
];

describe('a repeat inside a repeat row', () => {
  it('validates', () => {
    expect(validateView(groupsDocument(), catalog).diagnostics).toEqual([]);
  });

  it('generates the inner repeat as a map, the outer as a keyed each()', () => {
    const { code } = generateView(groupsDocument() as never, catalog);
    expect(code).toContain('each(inputs.groups, (group) => ');
    expect(code).toContain('group.tabs.map((tab) => ');
    expect(code).toContain("'data-key': String(tab.id)");
    expect(code.match(/each\(/g)).toHaveLength(1);
  });

  it('renders identically through the interpreter and the generated module, mounted', async () => {
    const viewModule = await loadGenerated(groupsDocument());
    const { digest } = generateView(groupsDocument() as never, catalog);
    const state = signal<Groups>(fixtures[0]!);
    const interpreted = document.createElement('div');
    const fromModule = document.createElement('div');
    document.body.append(interpreted, fromModule);
    mount(interpreted, () =>
      interpretView(groupsDocument(), {
        catalog,
        components,
        inputs: state.value,
        contract: digest,
      }),
    );
    mount(fromModule, () => viewModule.renderGroups(state.value));
    // Empty, filled, a changed inner list, then back to empty.
    const sequence: Groups[] = [
      fixtures[1]!,
      {
        groups: [
          fixtures[1]!.groups[0]!,
          {
            id: 'g2',
            label: 'Two',
            tabs: [{ id: 'd', label: 'Delta' }],
          },
        ],
      },
      fixtures[0]!,
    ];
    for (const next of sequence) {
      state.value = next;
      expect(interpreted.innerHTML).toBe(fromModule.innerHTML);
    }
    state.value = fixtures[1]!;
    expect(interpreted.querySelectorAll('[data-key="a"]')).toHaveLength(1);
    expect(interpreted.textContent).toContain('Gamma <c>');
    expect(
      [...interpreted.querySelectorAll('[data-key^="g"]')].map((list) =>
        list.getAttribute('data-key'),
      ),
    ).toEqual(['g1', 'g2', 'g3']);
    expect(interpreted.innerHTML).toBe(fromModule.innerHTML);

    // A row action in an inner row reports the inner row's key.
    const open = vi.fn();
    const dispose = viewModule.wireGroups(interpreted, { 'open-tab': open });
    const row = interpreted.querySelector('[data-key="b"]')!;
    (row.querySelector('[data-action]') ?? row).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ key: 'b' }));
    dispose();
    interpreted.remove();
    fromModule.remove();
  });

  it('previews mounted without a placeholder', () => {
    const host = document.createElement('div');
    const placeholder = vi.fn(() => '' as never);
    mount(host, () =>
      previewView(groupsDocument(), {
        catalog,
        components,
        inputs: fixtures[1]!,
        broken: new Set(),
        placeholder,
      }),
    );
    expect(placeholder).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Alpha');
    expect(host.textContent).toContain('Gamma');
  });

  it('maps a repeat three levels deep', () => {
    const document = groupsDocument();
    const tabRow = document.root.zones.content[0]!.template.zones.children[0]!
      .template as Record<string, unknown>;
    // Each tab row repeats its group's tabs again: a third level.
    tabRow.type = `${ui}:list`;
    tabRow.props = {};
    tabRow.zones = {
      children: [
        {
          $each: { $bind: 'group.tabs' },
          as: 'peer',
          key: 'peer.id',
          template: {
            id: '01JB8Z1M6Q8E1X9V4S7K2R3N04',
            type: `${ui}:list-item`,
            props: { label: { $bind: 'peer.label' }, action: 'open-peer' },
          },
        },
      ],
    };
    expect(validateView(document, catalog).diagnostics).toEqual([]);
    const { code, digest } = generateView(document as never, catalog);
    expect(code).toContain('group.tabs.map((tab) => ');
    expect(code).toContain('group.tabs.map((peer) => ');
    const host = window.document.createElement('div');
    mount(host, () =>
      interpretView(document, {
        catalog,
        components,
        inputs: fixtures[1]!,
        contract: digest,
      }),
    );
    // Group One's two tabs each list both of its tabs.
    expect(host.querySelectorAll('[data-key="a"]')).toHaveLength(3);
  });
});

describe('KUI-V016: a composed repeat inside a row', () => {
  const tabsDocument = {
    schema: 'kerf-ui-document/v1',
    name: 'Tabs',
    catalogs: [ui],
    params: { tabs: { type: { kind: 'array', items: tabType } } },
    root: {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3N10',
      type: `${ui}:list`,
      zones: {
        children: [
          {
            $each: { $param: 'tabs' },
            as: 'tab',
            key: 'tab.id',
            template: {
              id: '01JB8Z1M6Q8E1X9V4S7K2R3N11',
              type: `${ui}:list-item`,
              props: { label: { $bind: 'tab.label' }, action: 'open-tab' },
            },
          },
        ],
      },
    },
  };
  const composing = (inRow: boolean) => {
    const view = {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3N12',
      type: '#view',
      src: './tabs.kui.json',
      props: { tabs: inRow ? { $bind: 'group.tabs' } : { $param: 'tabs' } },
    };
    return {
      schema: 'kerf-ui-document/v1',
      name: 'Host',
      catalogs: [ui],
      params: {
        groups: { type: { kind: 'array', items: groupType } },
        tabs: { type: { kind: 'array', items: tabType } },
      },
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3N13',
        type: `${ui}:pane`,
        zones: {
          content: inRow
            ? [
                {
                  $each: { $param: 'groups' },
                  as: 'group',
                  key: 'group.id',
                  template: {
                    id: '01JB8Z1M6Q8E1X9V4S7K2R3N14',
                    type: `${ui}:pane`,
                    zones: { content: [view] },
                  },
                },
              ]
            : [view],
        },
      },
    };
  };
  const resolveView = () => tabsDocument;

  it('rejects a composed document whose repeat would render inside a row', () => {
    const { diagnostics } = validateView(composing(true), catalog, {
      resolveView,
    });
    expect(diagnostics).toEqual([
      {
        code: 'KUI-V016',
        path: '$.root.zones.content[0].template.zones.content[0]{./tabs.kui.json}.root.zones.children[0]',
        message: expect.stringMatching(/composed into an `\$each` row/),
      },
    ]);
  });

  it('accepts the same composition outside a row', () => {
    expect(
      validateView(composing(false), catalog, { resolveView }).diagnostics,
    ).toEqual([]);
  });

  it('carries the row through a second level of composition', () => {
    const outer = {
      ...tabsDocument,
      name: 'Outer',
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3N15',
        type: `${ui}:pane`,
        zones: {
          content: [
            {
              id: '01JB8Z1M6Q8E1X9V4S7K2R3N16',
              type: '#view',
              src: './tabs.kui.json',
              props: { tabs: { $param: 'tabs' } },
            },
          ],
        },
      },
    };
    const host = composing(true);
    const view = host.root.zones.content[0] as {
      template: { zones: { content: { src: string }[] } };
    };
    view.template.zones.content[0]!.src = './outer.kui.json';
    const { diagnostics } = validateView(host, catalog, {
      resolveView: (src: string) =>
        src === './outer.kui.json' ? outer : tabsDocument,
    });
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'KUI-V016',
    ]);
  });

  // KF-A01VDM: interpretView refuses the shape as an invalid document, and a
  // preview names KUI-V016 in its placeholder instead of letting each()
  // refuse the keyed list inside the row with a generic error.
  const groups = {
    groups: [
      { id: 'g1', label: 'One', tabs: [{ id: 'a', label: 'Alpha' }] },
      { id: 'g2', label: 'Two', tabs: [{ id: 'b', label: 'Beta' }] },
    ],
    tabs: [{ id: 'c', label: 'Gamma' }],
  };
  const interpret = (inRow: boolean) => {
    const host = window.document.createElement('div');
    const document = composing(inRow);
    mount(host, () =>
      interpretView(document, {
        catalog,
        components,
        inputs: groups,
        resolveView,
        // An invalid document has no contract: interpretView refuses it.
        contract: inRow
          ? 'invalid'
          : contractDigest(contractOf(document, catalog, { resolveView })),
      }),
    );
    return host;
  };

  it('refuses the composed repeat in a row in interpretView, naming KUI-V016', () => {
    expect(() => interpret(true)).toThrow(/first: KUI-V016 at /);
  });

  it('renders the same composition outside a row as a keyed list', () => {
    const host = interpret(false);
    expect(host.textContent).toContain('Gamma');
    expect(host.innerHTML).toContain('<!--kf-list:');
  });

  it('previews the composed repeat in a row as a placeholder naming KUI-V016', () => {
    const host = window.document.createElement('div');
    const placeholder = vi.fn((node: { id: string }) => node.id as never);
    mount(host, () =>
      previewView(composing(true), {
        catalog,
        components,
        inputs: groups,
        resolveView,
        placeholder,
      }),
    );
    // Each row's composed List stands in for itself; the rows still render.
    expect(placeholder).toHaveBeenCalledTimes(2);
    expect(placeholder).toHaveBeenCalledWith(
      expect.objectContaining({ id: tabsDocument.root.id }),
      expect.stringContaining('KUI-V016'),
    );
    expect(host.querySelectorAll('[data-key^="g"]')).toHaveLength(2);
  });

  it('carries the row into a second level of composition when it renders', () => {
    const outer = {
      ...tabsDocument,
      name: 'Outer',
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3N15',
        type: `${ui}:pane`,
        zones: {
          content: [
            {
              id: '01JB8Z1M6Q8E1X9V4S7K2R3N16',
              type: '#view',
              src: './tabs.kui.json',
              props: { tabs: { $param: 'tabs' } },
            },
          ],
        },
      },
    };
    const document = composing(true);
    (
      document.root.zones.content[0] as {
        template: { zones: { content: { src: string }[] } };
      }
    ).template.zones.content[0]!.src = './outer.kui.json';
    const placeholder = vi.fn((_node: unknown, reason: string) => reason);
    const host = window.document.createElement('div');
    mount(host, () =>
      previewView(document, {
        catalog,
        components,
        inputs: groups,
        resolveView: (src: string) =>
          src === './outer.kui.json' ? outer : tabsDocument,
        placeholder: placeholder as never,
      }),
    );
    expect(placeholder.mock.calls.map(([, reason]) => reason)).toEqual([
      expect.stringContaining('KUI-V016 tabs.kui.json'),
      expect.stringContaining('KUI-V016 tabs.kui.json'),
    ]);
  });
});
