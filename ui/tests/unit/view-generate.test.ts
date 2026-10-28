import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { mount, raw } from 'kerfjs';
import { describe, expect, it, vi } from 'vitest';

import {
  canonicalJson,
  contractDigest,
  contractOf,
  createViewCatalog,
  diffContracts,
  generateView,
  printDoc,
  readViewHeader,
  typeText,
  viewDigest,
  viewModulePath,
} from '../../view/index.mjs';
import {
  inboxContract,
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
const generate = (document: unknown, options = {}) =>
  generateView(document, catalog, { source: 'inbox.kui.json', ...options });
type Doc = ReturnType<typeof inbox>;

describe('generateView: the inbox module', () => {
  it('matches the committed golden module byte for byte, every time', () => {
    const golden = readFileSync(
      resolve(root, 'tests/fixtures/view/inbox.view.ts'),
      'utf8',
    );
    expect(generate(inbox()).code).toBe(golden);
    expect(generate(inbox()).code).toBe(generate(inbox()).code);
  });

  it('records an intact header whose contract round-trips', () => {
    const { code, contract, digest } = generate(inbox());
    const header = readViewHeader(code)!;
    expect(header).toMatchObject({
      version: 1,
      contractDigest: digest,
      intact: true,
    });
    expect(header.contract.actions).toEqual({
      compose: 'view',
      'open-item': 'row',
    });
    expect(diffContracts(header.contract, contract)).toEqual([]);
    expect(
      readViewHeader(code.replace('tone: "brand"', 'tone: "danger"'))!.intact,
    ).toBe(false);
    expect(readViewHeader('// hand-written\nexport {};')).toBeUndefined();
    // Editing the recorded contract line is caught too.
    expect(
      readViewHeader(code.replace('"compose":"view"', '"compose":"row"'))!
        .intact,
    ).toBe(false);
    const lines = code.split('\n');
    lines[2] = '// kui-contract: {not json';
    expect(readViewHeader(lines.join('\n'))).toBeUndefined();
  });

  it('renders, wires row-scoped actions, and resolves refs in a real mount', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const items = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ];
    mount(host, () =>
      renderInbox(
        { items, selectedId: 'b' },
        { detail: ({ selectedId }) => raw(`<p id="detail">${selectedId}</p>`) },
      ),
    );
    const compose = vi.fn();
    const open = vi.fn();
    const dispose = wireInbox(host, { compose, 'open-item': open });
    const refs = inboxRefs(host);
    expect(refs.composeButton.tagName).toBe('BUTTON');
    expect(host.querySelector('#detail')?.textContent).toBe('b');
    expect(host.textContent).toContain('Inbox');

    refs.composeButton.click();
    expect(compose).toHaveBeenCalledTimes(1);
    const beta = refs.row('b')!;
    expect(beta.textContent).toContain('Beta');
    (beta.querySelector('[data-action]') ?? beta).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ key: 'b' }));
    expect(refs.row('zzz')).toBeNull();

    dispose();
    refs.composeButton.click();
    expect(compose).toHaveBeenCalledTimes(1);
    expect(() => inboxRefs(document.createElement('div'))).toThrow(
      /composeButton/,
    );
    host.remove();
  });

  it('exports the contract digest the header records', () => {
    expect(inboxContract).toBe(generate(inbox()).digest);
  });
});

describe('the contract digest ignores layout and tracks the interface', () => {
  const digest = (edit: (doc: Doc) => void) => {
    const document = inbox();
    edit(document);
    return generate(document).digest;
  };
  const base = digest(() => undefined);

  it('is unchanged by reorders, literals, text, and moving a named node', () => {
    expect(digest((doc) => doc.root.zones.content.reverse())).toBe(base);
    expect(
      digest(
        (doc) =>
          (doc.root.zones.header[0].zones.trailing[0].props.tone = 'danger'),
      ),
    ).toBe(base);
    expect(
      digest((doc) => {
        const button = doc.root.zones.header[0].zones.trailing.pop();
        doc.root.zones.header[0].zones.leading.push(button);
      }),
    ).toBe(base);
  });

  it('changes when an input, action, slot, or ref changes', () => {
    expect(
      digest(
        (doc) =>
          (doc.params.title.type = { kind: 'enum', values: ['Inbox', 'Sent'] }),
      ),
    ).not.toBe(base);
    expect(
      digest(
        (doc) =>
          (doc.root.zones.header[0].zones.trailing[0].props.action = {
            $action: 'send',
          }),
      ),
    ).not.toBe(base);
    expect(
      digest(
        (doc) =>
          (doc.root.zones.header[0].zones.trailing[0].name = 'sendButton'),
      ),
    ).not.toBe(base);
    expect(digest((doc) => doc.root.zones.content.pop())).not.toBe(base);
  });
});

describe('diffContracts', () => {
  const contract = (edit: (doc: Doc) => void = () => undefined) => {
    const document = inbox();
    edit(document);
    return contractOf(document, catalog);
  };
  const before = contract();

  it('classifies input changes', () => {
    const after = contract((doc) => {
      doc.params.title.type = { kind: 'enum', values: ['Inbox', 'Sent'] };
      doc.params.density = {
        type: { kind: 'enum', values: ['standard'] },
        default: 'standard',
      };
      doc.params.account = { type: { kind: 'string' } };
      delete doc.params.selectedId;
      doc.root.zones.content.pop();
    });
    const byName = Object.fromEntries(
      diffContracts(before, after).map((item) => [
        `${item.member}:${item.name}`,
        item,
      ]),
    );
    expect(byName['input:title']).toMatchObject({
      change: 'retyped',
      breaking: true,
    });
    expect(byName['input:density']).toMatchObject({
      change: 'added',
      breaking: false,
    });
    expect(byName['input:account']).toMatchObject({
      change: 'added',
      breaking: true,
    });
    expect(byName['input:selectedId']).toMatchObject({
      change: 'removed',
      breaking: true,
    });
    expect(byName['slot:detail']).toMatchObject({
      change: 'removed',
      breaking: true,
    });
  });

  it('treats an enum superset or a wider primitive as widening', () => {
    const narrow = {
      inputs: { tone: { type: '"a"', optional: true } },
      actions: {},
      slots: {},
      refs: {},
    };
    const wide = {
      inputs: { tone: { type: '"a" | "b"', optional: true } },
      actions: {},
      slots: {},
      refs: {},
    };
    const text = {
      inputs: { tone: { type: 'string', optional: true } },
      actions: {},
      slots: {},
      refs: {},
    };
    const count = {
      inputs: { tone: { type: 'number', optional: true } },
      actions: {},
      slots: {},
      refs: {},
    };
    expect(diffContracts(narrow, wide)).toEqual([
      expect.objectContaining({ change: 'widened', breaking: false }),
    ]);
    expect(diffContracts(narrow, text)).toEqual([
      expect.objectContaining({ change: 'widened', breaking: false }),
    ]);
    expect(diffContracts(narrow, count)).toEqual([
      expect.objectContaining({ change: 'retyped', breaking: true }),
    ]);
    expect(diffContracts(wide, narrow)).toEqual([
      expect.objectContaining({ change: 'retyped', breaking: true }),
    ]);
    expect(diffContracts(text, count)).toEqual([
      expect.objectContaining({ change: 'retyped', breaking: true }),
    ]);
    const required = {
      ...narrow,
      inputs: { tone: { type: '"a"', optional: false } },
    };
    expect(diffContracts(narrow, required)).toEqual([
      expect.objectContaining({ change: 'made required', breaking: true }),
    ]);
    expect(diffContracts(required, narrow)).toEqual([
      expect.objectContaining({ change: 'made optional', breaking: false }),
    ]);
  });

  it('classifies action, slot, and ref changes', () => {
    const empty = { inputs: {}, actions: {}, slots: {}, refs: {} };
    const full = {
      inputs: {},
      actions: { open: 'row' as const },
      slots: { detail: null },
      refs: { save: { element: 'HTMLElement', keyed: false } },
    };
    expect(
      diffContracts(empty, full).map((item) => [
        item.member,
        item.change,
        item.breaking,
      ]),
    ).toEqual([
      ['action', 'added', true],
      ['slot', 'added', true],
      ['ref', 'added', false],
    ]);
    expect(diffContracts(full, empty).every((item) => item.breaking)).toBe(
      true,
    );
    const changed = {
      inputs: {},
      actions: { open: 'view' as const },
      slots: { detail: '{ readonly id: string; }' },
      refs: { save: { element: 'HTMLElement', keyed: true } },
    };
    expect(diffContracts(full, changed).map((item) => item.change)).toEqual([
      'rescoped',
      'retyped',
      'retyped',
    ]);
  });
});

describe('generateView: targets and node kinds', () => {
  it('emits JavaScript plus declarations for the js target', () => {
    const { code, declarations } = generate(inbox(), { target: 'js' });
    expect(code).not.toMatch(/: SafeHtml|interface /);
    expect(code).toContain('export function renderInbox(inputs, slots)');
    expect(declarations).toContain('export interface InboxInputs');
    expect(declarations).toContain(
      'export declare function renderInbox(inputs: InboxInputs, slots: InboxSlots): SafeHtml;',
    );
    expect(readViewHeader(code)!.intact).toBe(true);
    expect(readViewHeader(declarations!)!.intact).toBe(true);
  });

  it('omits render for declarations-only modules', () => {
    const { code } = generate(inbox(), { declarationsOnly: true });
    expect(code).not.toContain('renderInbox');
    expect(code).not.toContain("from '@kerfjs/ui/button'");
    expect(code).toContain('export function wireInbox');
    const js = generate(inbox(), { declarationsOnly: true, target: 'js' });
    expect(js.declarations).not.toContain('renderInbox');
  });

  it('defaults optional inputs and empty slots, and handles an action-free view', () => {
    const document = {
      schema: 'kerf-ui-document/v1',
      name: 'Badge',
      catalogs: ['@kerfjs/ui'],
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3T7A',
        type: '@kerfjs/ui:wa-badge',
        props: { variant: 'brand' },
        zones: {
          default: [
            { id: '01JB8Z1M6Q8E1X9V4S7K2R3T7B', type: '#text', value: '3' },
          ],
        },
      },
    };
    const { code } = generateView(document, catalog);
    expect(code).toContain('// GENERATED by kerf-ui-view from badge.kui.json');
    expect(code).toContain(
      'export function renderBadge(inputs: BadgeInputs = {}, slots: BadgeSlots = {}): SafeHtml {',
    );
    expect(code).toContain(
      'jsx("wa-badge", { variant: "brand", \'data-kerf-node\': "01JB8Z1M6Q8E1X9V4S7K2R3T7A", children: "3" })',
    );
    expect(code).toContain('export type BadgeAction = never;');
    expect(code).toContain('  void inputs;\n  void slots;\n');
    expect(code).toContain('  void handlers;\n');
    expect(code).not.toContain('rowKey');
  });

  it('slots kerf children and text into named Web Awesome slots', () => {
    const document = {
      schema: 'kerf-ui-document/v1',
      name: 'Tagged',
      catalogs: ['@kerfjs/ui'],
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3T8A',
        type: '@kerfjs/ui:wa-button',
        zones: {
          default: [
            { id: '01JB8Z1M6Q8E1X9V4S7K2R3T8B', type: '#text', value: 'Go' },
          ],
          start: [
            { id: '01JB8Z1M6Q8E1X9V4S7K2R3T8C', type: '#text', value: '>' },
            {
              id: '01JB8Z1M6Q8E1X9V4S7K2R3T8D',
              type: '@kerfjs/ui:badge',
              props: { children: '1' },
            },
          ],
        },
      },
    };
    const { code } = generateView(document, catalog);
    expect(code).toContain(`jsx('span', { slot: "start", children: ">" })`);
    expect(code).toMatch(/Badge\(\{[^)]*slot: "start"/s);
  });

  it('composes a #view through its generated render function', () => {
    const child = {
      schema: 'kerf-ui-document/v1',
      name: 'Toolbar2',
      catalogs: ['@kerfjs/ui'],
      params: { label: { type: { kind: 'string' } } },
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3T9A',
        type: '@kerfjs/ui:button',
        props: { children: { $param: 'label' }, action: { $action: 'go' } },
      },
    };
    const parent = {
      schema: 'kerf-ui-document/v1',
      name: 'Shell',
      catalogs: ['@kerfjs/ui'],
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3T9B',
        type: '@kerfjs/ui:toolbar',
        zones: {
          trailing: [
            {
              id: '01JB8Z1M6Q8E1X9V4S7K2R3T9C',
              type: '#view',
              src: './toolbar2.kui.json',
              props: { label: 'Go' },
            },
          ],
        },
      },
    };
    const { code, contract } = generateView(parent, catalog, {
      resolveView: () => child,
    });
    expect(code).toContain(
      "import { renderToolbar2 } from './toolbar2.view.js';",
    );
    expect(code).toContain('trailing: renderToolbar2({ label: "Go" })');
    expect(contract.actions).toEqual({ go: 'view' });
  });

  it('merges document rootAttributes with the marker and spreads a param', () => {
    const document = {
      ...inbox(),
      root: {
        ...inbox().root,
        props: { rootAttributes: { 'data-kind': 'inbox' } },
      },
    };
    expect(generate(document).code).toContain(
      `rootAttributes: { "data-kind": "inbox", 'data-kerf-node': "01JB8Z1M6Q8E1X9V4S7K2R3T5A" }`,
    );
    const spread = inbox();
    spread.params.attrs = { type: { kind: 'object', props: [] }, default: {} };
    spread.root.props = { rootAttributes: { $param: 'attrs' } };
    expect(generate(spread).code).toContain(
      `rootAttributes: { ...(inputs.attrs ?? {}), 'data-kerf-node'`,
    );
  });

  it('refuses an invalid document', () => {
    expect(() => generate({ ...inbox(), name: 'lower' })).toThrow(
      /invalid.*KUI-V001/,
    );
  });
});

describe('contract helpers', () => {
  it('spells declared types in TypeScript', () => {
    expect(typeText({ kind: 'literal', value: 'a' })).toBe('"a"');
    expect(typeText({ kind: 'content' })).toBe('SafeHtml');
    expect(
      typeText({ kind: 'array', items: { kind: 'enum', values: [1, 2] } }),
    ).toBe('readonly (1 | 2)[]');
    expect(typeText({ kind: 'object', props: [] })).toBe(
      'Readonly<Record<string, never>>',
    );
    expect(
      typeText({
        kind: 'object',
        props: [{ name: 'data-x', type: { kind: 'string' }, required: false }],
      }),
    ).toBe('{ readonly "data-x"?: string; }');
    expect(typeText({ kind: 'mystery' })).toBe('unknown');
  });

  it('hashes canonical JSON deterministically', () => {
    expect(canonicalJson({ b: 1, a: [{ d: undefined, c: 'x' }] })).toBe(
      '{"a":[{"c":"x"}],"b":1}',
    );
    expect(viewDigest('')).toBe('kui1:cbf29ce484222325');
    expect(viewDigest('a')).toBe('kui1:af63dc4c8601ec8c');
    expect(
      contractDigest({ inputs: {}, actions: {}, slots: {}, refs: {} }),
    ).toMatch(/^kui1:[0-9a-f]{16}$/);
  });

  it('maps document paths to module paths and prints long docs broken', () => {
    expect(viewModulePath('src/inbox.kui.json')).toBe('src/inbox.view.ts');
    expect(viewModulePath('src/inbox.kui.json', 'js')).toBe(
      'src/inbox.view.js',
    );
    const long = {
      obj: [
        ['a', { raw: 'x'.repeat(60) }],
        ['b', { raw: 'y'.repeat(60) }],
      ],
    };
    expect(printDoc(long)).toBe(
      `{\n  a: ${'x'.repeat(60)},\n  b: ${'y'.repeat(60)},\n}`,
    );
    expect(printDoc({ arr: [{ raw: 'z'.repeat(120) }] })).toBe(
      `[\n  ${'z'.repeat(120)},\n]`,
    );
    expect(
      printDoc({
        cond: 'flag',
        then: { raw: 't'.repeat(100) },
        otherwise: { raw: 'null' },
      }),
    ).toBe(`(flag\n  ? ${'t'.repeat(100)}\n  : null)`);
  });
});
