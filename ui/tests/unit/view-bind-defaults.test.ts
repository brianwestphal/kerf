// KF-8P3H7F: a `$bind` whose head is a param reads that param with its
// default, exactly as `$param` does (`??`: null and undefined take it), in
// the interpreter and the generated module alike. Before, `{ $bind:
// 'data.tabs' }` read `inputs.data.tabs` and threw when an app (or the
// editor canvas, which samples only params without a default) omitted the
// optional `data`.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { mount, type SafeHtml } from 'kerfjs';
import { afterAll, describe, expect, it } from 'vitest';

import { List } from '../../src/list.js';
import { ListItem } from '../../src/list-item.js';
import { Pane } from '../../src/pane.js';
import { Text } from '../../src/text.js';
import {
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
const fallback = {
  title: 'Default title',
  tabs: [
    { id: 'd1', label: 'Default one' },
    { id: 'd2', label: 'Default two' },
  ],
};

/** A title and a list, both bound into a defaulted object param. */
const document = {
  schema: 'kerf-ui-document/v1',
  name: 'Tabs',
  catalogs: [ui],
  params: {
    data: {
      type: {
        kind: 'object',
        props: [
          { name: 'title', type: { kind: 'string' }, required: true },
          {
            name: 'tabs',
            type: { kind: 'array', items: tabType },
            required: true,
          },
        ],
      },
      default: fallback,
    },
  },
  root: {
    id: '01JB8Z1M6Q8E1X9V4S7K2R3P00',
    type: `${ui}:pane`,
    zones: {
      content: [
        {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3P01',
          type: `${ui}:text`,
          props: { children: { $bind: 'data.title' } },
        },
        {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3P02',
          type: `${ui}:list`,
          zones: {
            children: [
              {
                $each: { $bind: 'data.tabs' },
                as: 'tab',
                key: 'tab.id',
                template: {
                  id: '01JB8Z1M6Q8E1X9V4S7K2R3P03',
                  type: `${ui}:list-item`,
                  props: {
                    label: { $bind: 'tab.label' },
                    action: 'open-tab',
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
};

interface TabsInputs {
  readonly data?: {
    readonly title: string;
    readonly tabs: readonly { readonly id: string; readonly label: string }[];
  } | null;
}
interface GeneratedTabs {
  renderTabs(inputs?: TabsInputs): SafeHtml;
}

const generated = generatedViewScratch();
afterAll(() => generated.dispose());
const { digest } = generateView(document as never, catalog);
const interpret = (inputs: TabsInputs) =>
  interpretView(document, {
    catalog,
    components,
    inputs,
    contract: digest,
  });

const cases: [string, TabsInputs][] = [
  ['omitted', {}],
  ['null', { data: null }],
  [
    'given',
    {
      data: {
        title: 'Mine',
        tabs: [{ id: 'm1', label: 'My tab <1>' }],
      },
    },
  ],
];

describe('a $bind into a param with a default', () => {
  it('validates, and the input stays optional', () => {
    expect(validateView(document, catalog).diagnostics).toEqual([]);
    expect(contractOf(document as never, catalog).inputs.data).toMatchObject({
      optional: true,
    });
  });

  it('generates the param read with its default before the path', () => {
    const { code } = generateView(document as never, catalog);
    const read = `(inputs.data ?? ${JSON.stringify(fallback)})`;
    expect(code).toContain(`children: ${read}.title`);
    expect(code).toContain(`each(${read}.tabs, (tab) => `);
  });

  it.each(cases)(
    'renders identically through the interpreter and the generated module (%s)',
    async (_name, inputs) => {
      const viewModule = await generated.load<GeneratedTabs>(document, catalog);
      expect(String(interpret(inputs))).toBe(
        String(viewModule.renderTabs(inputs)),
      );
      const interpreted = window.document.createElement('div');
      const fromModule = window.document.createElement('div');
      mount(interpreted, () => interpret(inputs));
      mount(fromModule, () => viewModule.renderTabs(inputs));
      expect(interpreted.innerHTML).toBe(fromModule.innerHTML);
      const expected = inputs.data ?? fallback;
      expect(interpreted.textContent).toContain(expected.title);
      expect(
        [...interpreted.querySelectorAll('[data-key]')].map((row) =>
          row.getAttribute('data-key'),
        ),
      ).toEqual(expected.tabs.map((tab) => tab.id));
    },
  );

  it('previews the default when the canvas passes no value for the param', () => {
    const html = String(
      previewView(document, {
        catalog,
        components,
        inputs: {},
        broken: new Set(),
        placeholder: () => {
          throw new Error('no node should be a placeholder');
        },
      }),
    );
    expect(html).toContain('Default title');
    expect(html).toContain('Default two');
  });

  it('reads a param without a default as given', () => {
    const required = {
      ...document,
      params: {
        data: { type: document.params.data.type },
      },
    };
    const { code } = generateView(required as never, catalog);
    expect(code).toContain('each(inputs.data.tabs, (tab) => ');
  });
});
