// KF-H3CB2P: a param typed as one component prop's own type
// (`{ kind: 'prop', component, prop }`) carries an app-supplied value a
// document cannot spell, such as a function or a SearchField model: typed
// from the component in generated code, optional exactly when the prop is.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { raw, type SafeHtml } from 'kerfjs';
import { describe, expect, it, vi } from 'vitest';

import {
  contractDigest,
  contractOf,
  createViewCatalog,
  generateView,
  interpretView,
  isAssignable,
  validateView,
  VIEW_DOCUMENT_SCHEMA_ID,
} from '../../view/index.mjs';

const root = resolve(import.meta.dirname, '../..');
const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const catalog = createViewCatalog({
  props: [readJson('ai/component-props.json')],
  composition: [readJson('ai/component-composition.json')],
});

const ROOT = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const render = {
  kind: 'prop',
  component: '@kerfjs/ui:select',
  prop: 'renderSelected',
} as const;
const select = (
  params: Record<string, unknown>,
  props: Record<string, unknown> = { renderSelected: { $param: 'show' } },
) => ({
  schema: VIEW_DOCUMENT_SCHEMA_ID,
  name: 'Picker',
  catalogs: ['@kerfjs/ui'],
  params,
  root: {
    id: ROOT,
    type: '@kerfjs/ui:select',
    props: {
      name: 'size',
      label: 'Size',
      value: 's',
      choices: [{ value: 's', label: 'Small' }],
      ...props,
    },
  },
});
const diagnostics = (document: unknown) =>
  validateView(document, catalog).diagnostics.map(
    ({ code, message }) => `${code} ${message}`,
  );

describe('prop-typed params', () => {
  it('binds to the same component prop', () => {
    expect(diagnostics(select({ show: { type: render } }))).toEqual([]);
  });

  it('rejects another prop, an unknown prop, and a default', () => {
    expect(
      diagnostics(
        select({ show: { type: render } }, { label: { $param: 'show' } }),
      ),
    ).toContain(
      'KUI-V004 a @kerfjs/ui:select "renderSelected" value does not fit "label" of @kerfjs/ui:select',
    );
    expect(
      diagnostics(select({ show: { type: { ...render, prop: 'nope' } } }, {})),
    ).toContain(
      'KUI-V001 a prop type names a catalog `component` key and one of its `prop`s',
    );
    expect(
      diagnostics(select({ show: { type: render, default: 'x' } })),
    ).toEqual(
      expect.arrayContaining([expect.stringMatching(/^KUI-V004 the default/)]),
    );
  });

  it('fits only the same component prop', () => {
    expect(isAssignable(render, render)).toBe(true);
    expect(isAssignable(render, { ...render, prop: 'label' })).toBe(false);
    expect(isAssignable(render, { kind: 'string' })).toBe(false);
    expect(isAssignable({ kind: 'string' }, render)).toBe(false);
  });

  it('is optional when the prop is, and typed from the component', () => {
    const document = select({ show: { type: render } });
    const contract = contractOf(document as never, catalog);
    expect(contract.inputs.show).toMatchObject({
      optional: true,
      type: 'PropOf<"@kerfjs/ui:select", "renderSelected">',
    });
    const { code } = generateView(document as never, catalog, {
      source: 'picker.kui.json',
    });
    expect(code).toContain(
      'readonly show?: Parameters<typeof Select>[0]["renderSelected"];',
    );
    // The value import covers the type position; no duplicate type import.
    expect(code).toMatch(/import \{ Select \} from '@kerfjs\/ui\/select';/);
    const declarations = generateView(document as never, catalog, {
      source: 'picker.kui.json',
      declarationsOnly: true,
    }).code;
    expect(declarations).toMatch(
      /import \{ type Select \} from '@kerfjs\/ui\/select';/,
    );
  });

  it('passes the application’s value through to the component', () => {
    const document = select({ show: { type: render } });
    const show = vi.fn(() => raw('<b>Shown</b>'));
    const Select = vi.fn((props: { renderSelected?: unknown }) =>
      raw(props.renderSelected === show ? '<p>wired</p>' : '<p>missing</p>'),
    );
    const html = String(
      interpretView(document as never, {
        catalog,
        components: { '@kerfjs/ui:select': Select } as Record<
          string,
          (props: never) => SafeHtml
        >,
        inputs: { show },
        contract: contractDigest(contractOf(document as never, catalog)),
      }),
    );
    expect(html).toContain('wired');
  });
});
