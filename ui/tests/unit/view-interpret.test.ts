import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { mount, raw, type SafeHtml } from 'kerfjs';
import { describe, expect, it, vi } from 'vitest';

import { Badge } from '../../src/badge.js';
import { Button } from '../../src/button.js';
import { List } from '../../src/list.js';
import { ListItem } from '../../src/list-item.js';
import { Pane } from '../../src/pane.js';
import { Text } from '../../src/text.js';
import { Toolbar } from '../../src/toolbar.js';
import { ToolbarText } from '../../src/toolbar-text.js';
import {
  createViewCatalog,
  generateView,
  interpretView,
  KuiContractMismatch,
} from '../../view/index.mjs';
import {
  inboxContract,
  type InboxInputs,
  inboxRefs,
  renderInbox,
  wireInbox,
} from '../fixtures/view/inbox.view.js';

const root = resolve(import.meta.dirname, '../..');
const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const catalog = createViewCatalog({
  props: [readJson('ai/component-props.json')],
  composition: [readJson('ai/component-composition.json')],
});
const inbox = () => readJson('tests/fixtures/view/inbox.kui.json');
const ui = '@kerfjs/ui';
const components = {
  [`${ui}:badge`]: Badge,
  [`${ui}:button`]: Button,
  [`${ui}:list`]: List,
  [`${ui}:list-item`]: ListItem,
  [`${ui}:pane`]: Pane,
  [`${ui}:text`]: Text,
  [`${ui}:toolbar`]: Toolbar,
  [`${ui}:toolbar-text`]: ToolbarText,
} as Record<string, (props: never) => SafeHtml>;
const slots = {
  detail: ({ selectedId }: { readonly selectedId: string }) =>
    raw(`<p id="detail">${selectedId}</p>`),
};
const interpret = (inputs: object, document = inbox(), extra = {}) =>
  interpretView(document, {
    catalog,
    components,
    inputs,
    slots,
    contract: inboxContract,
    ...extra,
  });

const cases: InboxInputs[] = [
  { items: [], selectedId: '' },
  { items: [{ id: 'a', label: 'Alpha' }], selectedId: 'a', title: 'Mail' },
  {
    items: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta <b>' },
    ],
    selectedId: 'b',
    showEmpty: true,
  },
];

describe('interpretView matches the generated module', () => {
  it.each(cases)('renders the same markup as renderInbox (%#)', (inputs) => {
    expect(String(interpret(inputs))).toBe(String(renderInbox(inputs, slots)));
  });

  it('mounts, wires through the generated contract, and resolves refs', () => {
    const host = document.createElement('div');
    document.body.append(host);
    mount(host, () => interpret(cases[2]!));
    const open = vi.fn();
    const dispose = wireInbox(host, {
      compose: () => undefined,
      'open-item': open,
    });
    const row = inboxRefs(host).row('a')!;
    (row.querySelector('[data-action]') ?? row).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ key: 'a' }));
    expect(host.querySelector('#detail')?.textContent).toBe('b');
    dispose();
    host.remove();
  });
});

describe('interpretView: the contract check', () => {
  const changed = () => {
    const document = inbox();
    document.root.zones.header[0].zones.trailing[0].props.action = {
      $action: 'send',
    };
    return document;
  };

  it('throws KuiContractMismatch with both digests and the served contract', () => {
    let error: unknown;
    try {
      interpret(cases[0]!, changed());
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(KuiContractMismatch);
    const mismatch = error as KuiContractMismatch;
    expect(mismatch.expected).toBe(inboxContract);
    expect(mismatch.actual).not.toBe(inboxContract);
    expect(mismatch.contract.actions).toMatchObject({ send: 'view' });
    expect(mismatch.message).toMatch(/view "Inbox" has contract kui1:/);
  });

  it('renders the onMismatch fallback instead of throwing', () => {
    const fallback = raw('<p>Update the app</p>');
    const onMismatch = vi.fn(() => fallback);
    expect(interpret(cases[0]!, changed(), { onMismatch })).toBe(fallback);
    expect(onMismatch).toHaveBeenCalledWith(expect.any(KuiContractMismatch));
  });

  it('accepts pure visual edits without a contract change', () => {
    const document = inbox();
    document.root.zones.header[0].zones.trailing[0].props.tone = 'danger';
    expect(String(interpret(cases[1]!, document))).toContain('data-kerf-node');
  });

  it('refuses an invalid document and a missing component', () => {
    expect(() => interpret(cases[0]!, { ...inbox(), name: 'x' })).toThrow(
      /invalid/,
    );
    const { [`${ui}:text`]: _text, ...partial } = components;
    void _text;
    expect(() =>
      interpret(cases[2]!, inbox(), { components: partial }),
    ).toThrow(/no component function for @kerfjs\/ui:text/);
  });
});

describe('interpretView: node kinds', () => {
  const single = (
    rootNode: object,
    extra: object = {},
    inputs: object = {},
  ) => {
    const document = {
      schema: 'kerf-ui-document/v1',
      name: 'Probe',
      catalogs: [ui],
      root: rootNode,
      ...extra,
    };
    const { digest } = generateView(document, catalog);
    return String(
      interpretView(document, {
        catalog,
        components,
        inputs,
        contract: digest,
      }),
    );
  };

  it('evaluates $css builders and merges rootAttributes', () => {
    const html = single({
      id: '01JB8Z1M6Q8E1X9V4S7K2R3TBA',
      type: `${ui}:pane`,
      props: {
        background: { $css: "uiColor('surface-raised')" },
        rootAttributes: { 'data-kind': 'x' },
      },
    });
    expect(html).toContain('data-kind="x"');
    expect(html).toContain('surface-raised');
  });

  it('renders Web Awesome elements with default and named slots', () => {
    const html = single({
      id: '01JB8Z1M6Q8E1X9V4S7K2R3TBB',
      type: `${ui}:wa-button`,
      zones: {
        default: [
          { id: '01JB8Z1M6Q8E1X9V4S7K2R3TBC', type: '#text', value: 'Go' },
        ],
        start: [
          { id: '01JB8Z1M6Q8E1X9V4S7K2R3TBD', type: '#text', value: '>' },
        ],
      },
    });
    expect(html).toBe(
      '<wa-button data-kerf-node="01JB8Z1M6Q8E1X9V4S7K2R3TBB">Go<span slot="start">&gt;</span></wa-button>',
    );
    const slotted = single({
      id: '01JB8Z1M6Q8E1X9V4S7K2R3TBJ',
      type: `${ui}:wa-button`,
      zones: {
        start: [
          {
            id: '01JB8Z1M6Q8E1X9V4S7K2R3TBK',
            type: `${ui}:badge`,
            props: { children: '1' },
          },
        ],
      },
    });
    expect(slotted).toMatch(/<wa-button [^>]*>.*slot="start"/s);
  });

  it('renders the else branch and composed documents', () => {
    const child = {
      schema: 'kerf-ui-document/v1',
      name: 'Child',
      catalogs: [ui],
      params: { label: { type: { kind: 'string' } } },
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3TBE',
        type: `${ui}:text`,
        props: { children: { $param: 'label' } },
      },
    };
    const document = {
      schema: 'kerf-ui-document/v1',
      name: 'Parent',
      catalogs: [ui],
      params: { on: { type: { kind: 'boolean' } } },
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3TBF',
        type: `${ui}:list`,
        zones: {
          children: [
            {
              $if: { $param: 'on' },
              then: {
                id: '01JB8Z1M6Q8E1X9V4S7K2R3TBG',
                type: '#view',
                src: './child.kui.json',
                props: { label: 'Yes' },
              },
              else: {
                id: '01JB8Z1M6Q8E1X9V4S7K2R3TBH',
                type: `${ui}:text`,
                props: { children: 'No' },
              },
            },
          ],
        },
      },
    };
    const resolveView = () => child;
    const { digest } = generateView(document, catalog, { resolveView });
    const render = (on: boolean) =>
      String(
        interpretView(document, {
          catalog,
          components,
          inputs: { on },
          contract: digest,
          resolveView,
        }),
      );
    expect(render(true)).toContain('Yes');
    expect(render(false)).toContain('No');
  });
});
