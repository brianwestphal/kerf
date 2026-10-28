import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  ComponentProps,
  ComponentPropsDocument,
  PropDescriptor,
} from '../../scripts/lib/component-props.mjs';
import {
  applyCrossReferences,
  applyOverlay,
  coerceDefault,
  createDeclarationProgram,
  createPropsContext,
  describeCustomElement,
  parseDocumentedDefault,
  readComponentExport,
} from '../../scripts/lib/component-props.mjs';
import { validateJsonSchemaSubset } from '../../scripts/lib/json-schema-subset.mjs';

const root = resolve(import.meta.dirname, '../..');
const readJson = async (path: string) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));
const prop = (component: { props: PropDescriptor[] }, name: string) => {
  const found = component.props.find((item) => item.name === name);
  if (!found) throw new Error(`no prop ${name}`);
  return found;
};

describe('component-props extraction (fixture declarations)', () => {
  const fixtureDir = resolve(
    root,
    'tests/fixtures/component-props/declarations',
  );
  const file = resolve(fixtureDir, 'fixture.d.ts');
  const program = createDeclarationProgram([file]);
  const ctx = createPropsContext(program.getTypeChecker(), fixtureDir);
  const sourceFile = program.getSourceFile(file)!;
  const fixture = readComponentExport(ctx, sourceFile, 'Fixture')!;

  it('reads a SafeHtml component and skips helpers and non-components', () => {
    expect(fixture.export).toBe('Fixture');
    expect(fixture.description).toBe('A fixture component.');
    expect(readComponentExport(ctx, sourceFile, 'helper')).toBeUndefined();
    expect(
      readComponentExport(ctx, sourceFile, 'NotAComponent'),
    ).toBeUndefined();
    expect(readComponentExport(ctx, sourceFile, 'Missing')).toBeUndefined();
    expect(readComponentExport(ctx, sourceFile, 'Plain')).toMatchObject({
      props: [],
      nativeAttributes: [],
    });
  });

  it('projects enums, booleans, numbers, content, and documented defaults', () => {
    expect(prop(fixture, 'tone')).toMatchObject({
      type: { kind: 'enum', values: ['neutral', 'brand'] },
      required: false,
      default: 'neutral',
    });
    expect(prop(fixture, 'compact')).toMatchObject({
      type: { kind: 'boolean' },
      default: false,
    });
    expect(prop(fixture, 'count')).toMatchObject({
      type: { kind: 'number' },
      default: 3,
    });
    expect(prop(fixture, 'width')).toMatchObject({
      type: { kind: 'string' },
      default: 'auto',
    });
    expect(prop(fixture, 'header').type.kind).toBe('content');
    expect(prop(fixture, 'legacy').deprecated).toBe(true);
  });

  it('shares named object types as definitions and inlines anonymous ones', () => {
    expect(prop(fixture, 'panel').type).toMatchObject({
      kind: 'ref',
      ref: 'FixturePanel',
    });
    const panel = ctx.definitions.get('FixturePanel')!;
    expect(panel.kind).toBe('object');
    // The recursive `nested` field references the same definition.
    expect(
      panel.props?.find((item) => item.name === 'nested')?.type,
    ).toMatchObject({
      kind: 'ref',
      ref: 'FixturePanel',
    });
    expect(prop(fixture, 'inline').type).toMatchObject({
      kind: 'object',
      props: [expect.objectContaining({ name: 'label', required: true })],
    });
  });

  it('records discriminated variants with required and forbidden props', () => {
    expect(fixture.discriminant).toEqual(['mode']);
    expect(fixture.variants).toEqual([
      {
        when: { mode: 'text' },
        required: ['mode', 'children'],
        forbidden: ['icon'],
      },
      {
        when: { mode: 'icon' },
        required: ['mode', 'icon'],
        forbidden: ['children'],
      },
    ]);
    expect(prop(fixture, 'mode')).toMatchObject({
      required: true,
      type: { kind: 'enum', values: ['text', 'icon'] },
    });
    expect(prop(fixture, 'children')).toMatchObject({
      required: false,
      variantOnly: true,
    });
  });

  it('lists props declared outside the package as native attributes', () => {
    expect(fixture.nativeAttributes).toEqual(['hidden', 'lang']);
    expect(fixture.props.some((item) => item.name === 'hidden')).toBe(false);
    expect(prop(fixture, 'tabIndex').type.kind).toBe('number');
  });

  it('describes type parameters through their constraint, unwrapping NoInfer', () => {
    const generic = readComponentExport(
      ctx,
      sourceFile,
      'Generic',
    ) as ComponentProps;
    expect(generic.typeParameters).toEqual([
      { name: 'Value', constraint: 'string' },
    ]);
    expect(prop(generic, 'value').type).toMatchObject({
      kind: 'string',
      typeParameter: 'Value',
    });
    expect(prop(generic, 'choices').type).toMatchObject({
      kind: 'array',
      items: { kind: 'string', typeParameter: 'Value' },
    });
  });
});

describe('component-props helpers', () => {
  it('parses documented defaults in each supported phrasing', () => {
    expect(parseDocumentedDefault('Shape (default `pill`).')).toBe('pill');
    expect(parseDocumentedDefault('Defaults to `start`.')).toBe('start');
    expect(parseDocumentedDefault('`neutral` (default) or `brand`')).toBe(
      'neutral',
    );
    expect(parseDocumentedDefault('Anything', "'tag'")).toBe('tag');
    expect(parseDocumentedDefault('No default here.')).toBeUndefined();
    expect(parseDocumentedDefault(undefined)).toBeUndefined();
  });

  it('coerces defaults to the prop type or drops them', () => {
    expect(coerceDefault('true', { kind: 'boolean' })).toBe(true);
    expect(coerceDefault('yes', { kind: 'boolean' })).toBeUndefined();
    expect(coerceDefault('4', { kind: 'number' })).toBe(4);
    expect(coerceDefault('wide', { kind: 'number' })).toBeUndefined();
    expect(coerceDefault('b', { kind: 'enum', values: ['a', 'b'] })).toBe('b');
    expect(
      coerceDefault('c', { kind: 'enum', values: ['a', 'b'] }),
    ).toBeUndefined();
    expect(coerceDefault('x', { kind: 'content' })).toBeUndefined();
    expect(coerceDefault(undefined, { kind: 'string' })).toBeUndefined();
  });

  it('projects Web Awesome attributes, defaults, and slots', () => {
    const { props, slots } = describeCustomElement({
      attributes: [
        {
          name: 'size',
          type: { text: "| 's'\n  | 'm'" },
          default: "'m'",
          fieldName: 'size',
        },
        {
          name: 'with-caret',
          type: { text: 'boolean' },
          default: 'false',
          fieldName: 'withCaret',
        },
        { name: 'target', type: { text: "'_self' | string" } },
        { name: 'step', type: { text: "number | 'any'" }, default: '1' },
        {
          name: 'label',
          description: 'The label.',
          deprecated: 'yes',
          default: "''",
        },
      ],
      slots: [{ name: '', description: 'Content.' }, { name: 'start' }],
    });
    expect(props[0]).toMatchObject({
      type: { kind: 'enum', values: ['s', 'm'], text: "'s' | 'm'" },
      default: 'm',
    });
    expect(props[1]).toMatchObject({
      property: 'withCaret',
      type: { kind: 'boolean' },
      default: false,
    });
    expect(props[2].type).toMatchObject({
      kind: 'string',
      suggestions: ['_self'],
    });
    expect(props[3]).toMatchObject({ type: { kind: 'unknown' }, default: 1 });
    expect(props[4]).toMatchObject({
      type: { kind: 'string' },
      description: 'The label.',
      deprecated: true,
    });
    expect(props[4].default).toBeUndefined();
    expect(slots).toEqual([
      { name: 'default', description: 'Content.' },
      { name: 'start' },
    ]);
  });

  it('marks zones, css-value grammars, and unzoned content slots', () => {
    const component = {
      props: [
        { name: 'header', type: { kind: 'content' as const }, required: false },
        { name: 'badge', type: { kind: 'content' as const }, required: false },
        {
          name: 'gap',
          type: { kind: 'css-value' as const, grammar: 'UiGap' },
          required: false,
        },
      ],
    };
    applyCrossReferences(component, {
      zones: [{ id: 'top', jsx: { prop: 'header' } }, { id: 'nameless' }],
      cssValueProps: [
        {
          path: 'gap',
          grammar: 'gap',
          helpers: ['space'],
          rawPolicy: 'forbid',
        },
      ],
    });
    expect(component.props[0]).toMatchObject({ zone: 'top' });
    expect(component.props[0]).not.toHaveProperty('slot');
    expect(component.props[1]).toMatchObject({ slot: true });
    expect(component.props[2]).toMatchObject({
      cssValue: { grammar: 'gap', helpers: ['space'], rawPolicy: 'forbid' },
    });
  });

  it('merges overlays and reports keys and groups that name nothing', () => {
    const component: ComponentProps = {
      key: 'pkg:thing',
      id: 'thing',
      source: 'kerf',
      props: [{ name: 'tone', type: { kind: 'string' }, required: false }],
    };
    const problems: string[] = [];
    applyOverlay(
      component,
      {
        components: {
          'pkg:thing': {
            groups: ['Look'],
            props: {
              tone: { group: 'Look', control: 'segmented' },
              ghost: { order: 1 },
            },
          },
        },
      },
      problems,
    );
    applyOverlay(
      component,
      { components: { 'pkg:thing': { props: { tone: { group: 'Nope' } } } } },
      problems,
    );
    expect(component.groups).toEqual(['Look']);
    expect(prop(component, 'tone')).toMatchObject({ control: 'segmented' });
    expect(problems).toEqual([
      'pkg:thing: overlay names unknown prop "ghost"',
      'pkg:thing: prop "tone" names undeclared group "Nope"',
    ]);
    const untouched: string[] = [];
    applyOverlay(component, undefined, untouched);
    expect(untouched).toEqual([]);
  });
});

describe('ai/component-props.json (generated from the built package)', async () => {
  const document = (await readJson(
    'ai/component-props.json',
  )) as ComponentPropsDocument;
  const component = (key: string) => {
    const found = document.components.find((item) => item.key === key);
    if (!found) throw new Error(`no component ${key}`);
    return found;
  };

  it('validates against its schema and covers every catalog component', async () => {
    const schema = await readJson('ai/component-props.schema.json');
    expect(validateJsonSchemaSubset(schema, document)).toEqual([]);
    const catalog = await readJson('ai/component-catalog.json');
    const keys = new Set(document.components.map((item) => item.key));
    for (const entry of catalog.entries) {
      if (entry.source === 'webawesome')
        expect(keys).toContain(`@kerfjs/ui:${entry.id}`);
    }
    const refs = new Set<string>();
    JSON.stringify(document, (_key, value) => {
      if (value?.kind === 'ref') refs.add(value.ref);
      return value;
    });
    for (const ref of refs) expect(document.definitions).toHaveProperty([ref]);
  });

  it('Button: labeled or icon-only variants, enum defaults, and the overlay', () => {
    const button = component('@kerfjs/ui:button');
    expect(button.import).toBe('@kerfjs/ui/button');
    expect(button.variants).toEqual([
      { required: ['children'], forbidden: [] },
      { required: ['icon', 'ariaLabel'], forbidden: ['children'] },
    ]);
    expect(prop(button, 'tone')).toMatchObject({
      type: { kind: 'enum', values: ['neutral', 'brand', 'success', 'danger'] },
      default: 'neutral',
      group: 'Appearance',
      control: 'segmented',
    });
    expect(prop(button, 'icon')).toMatchObject({
      type: { kind: 'content' },
      slot: true,
    });
    // ButtonLabel takes plain text; bare KerfUiContent does not.
    expect(prop(button, 'children').type).toMatchObject({
      kind: 'content',
      acceptsText: true,
    });
    expect(prop(button, 'icon').type.acceptsText).toBeUndefined();
  });

  it('ListHeader: the toggle discriminant and toggle-only props', () => {
    const header = component('@kerfjs/ui:list-header');
    expect(header.discriminant).toEqual(['toggle']);
    expect(prop(header, 'toggle').type.kind).toBe('boolean');
    expect(prop(header, 'label')).toMatchObject({
      required: true,
      type: { kind: 'string' },
    });
    expect(prop(header, 'expanded').variantOnly).toBe(true);
    const toggled = header.variants!.filter(
      (variant) => variant.when?.toggle === true,
    );
    expect(toggled.length).toBeGreaterThan(0);
    for (const variant of toggled)
      expect(variant.required).toContain('expanded');
  });

  it('Pane: header, content, and footer zones from the composition catalog', () => {
    const pane = component('@kerfjs/ui:pane');
    expect(
      ['header', 'children', 'footer'].map((name) => prop(pane, name).zone),
    ).toEqual(['header', 'content', 'footer']);
    expect(prop(pane, 'background').type.kind).toBe('css-value');
    // rootAttributes keeps its `data-*` index signature beside the protected markers.
    expect(prop(pane, 'rootAttributes').type.index).toMatchObject({
      keyPrefix: 'data-',
      value: { kind: 'string' },
    });
  });

  it('Select: a generic value type and the multiple discriminant', () => {
    const select = component('@kerfjs/ui:select');
    expect(select.typeParameters).toEqual([
      { name: 'Value', constraint: 'string' },
    ]);
    expect(select.discriminant).toEqual(['multiple']);
    expect(prop(select, 'name')).toMatchObject({
      required: true,
      type: { kind: 'string' },
    });
  });

  it('a second component of one entry gets an export-qualified key', () => {
    expect(component('@kerfjs/ui:text#FieldLabel').export).toBe('FieldLabel');
    expect(component('@kerfjs/ui:text').nativeAttributes).toContain('lang');
  });

  it('Web Awesome elements come from custom-elements.json', () => {
    const waButton = component('@kerfjs/ui:wa-button');
    expect(waButton).toMatchObject({
      source: 'webawesome',
      tagName: 'wa-button',
    });
    expect(prop(waButton, 'size')).toMatchObject({
      type: { kind: 'enum' },
      default: 'm',
    });
    expect(waButton.slots?.map((slot) => slot.name)).toContain('default');
  });
});
