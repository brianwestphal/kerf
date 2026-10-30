// KF-PD6QC5: a zone key that names a content field inside a prop value
// (`leftRail.content`, `views.0.content`) fills that field with nodes, as a
// top-level zone fills a content prop.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { type SafeHtml } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { NavStack } from '../../src/nav-stack.js';
import { Text } from '../../src/text.js';
import { Workbench } from '../../src/workbench.js';
import {
  contractDigest,
  contractOf,
  createViewCatalog,
  fieldZoneOf,
  generateView,
  interpretView,
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
const resolved = (key: string) => catalog.components.get(key)!;

const ROOT = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const text = (id: string, children: string) => ({
  id,
  type: '@kerfjs/ui:text',
  props: { children },
});
const workbench = (
  props: Record<string, unknown>,
  zones: Record<string, unknown>,
) => ({
  schema: VIEW_DOCUMENT_SCHEMA_ID,
  name: 'Shell',
  catalogs: ['@kerfjs/ui'],
  root: {
    id: ROOT,
    type: '@kerfjs/ui:workbench',
    props: { id: 'shell', label: 'Shell', ...props },
    zones: { main: [text('01JB8Z1M6Q8E1X9V4S7K2R3T5B', 'Main')], ...zones },
  },
});
const rail = [text('01JB8Z1M6Q8E1X9V4S7K2R3T5C', 'Folders')];
const diagnostics = (document: unknown) =>
  validateView(document, catalog).diagnostics.map(
    ({ code, message }) => `${code} ${message}`,
  );

describe('field zones: keys', () => {
  const { component, definitions } = resolved('@kerfjs/ui:workbench');

  it('resolves a content field through refs, union members, and lists', () => {
    expect(fieldZoneOf(component, definitions, 'leftRail.content')).toEqual({
      prop: 'leftRail',
      path: ['content'],
      text: false,
    });
    expect(
      fieldZoneOf(component, definitions, 'mainToolbar.title'),
    ).toMatchObject({ prop: 'mainToolbar', path: ['title'] });
    const stack = resolved('@kerfjs/ui:nav-stack');
    expect(
      fieldZoneOf(stack.component, stack.definitions, 'views.1.content'),
    ).toEqual({ prop: 'views', path: [1, 'content'], text: false });
  });

  it('rejects keys that do not end at content or that a type forbids', () => {
    for (const key of [
      'main',
      'leftRail',
      'leftRail.label',
      'leftRail.nope',
      'leftRail.0',
      'nope.content',
      'mainHeader.x',
    ])
      expect(fieldZoneOf(component, definitions, key)).toBeUndefined();
    // A navigation panel forbids content, but a static panel has it.
    expect(
      fieldZoneOf(component, definitions, 'leftRail.navStack'),
    ).toBeUndefined();
  });

  it('fills nothing from an empty zone', () => {
    const { code } = generateView(
      workbench({}, { 'leftRail.content': [] }) as never,
      catalog,
      { source: 'shell.kui.json' },
    );
    expect(code).not.toContain('leftRail');
  });
});

describe('field zones: validation', () => {
  it('accepts a rail whose content is a zone, the zone supplying the required field', () => {
    expect(
      diagnostics(
        workbench(
          { leftRail: { label: 'Folders' } },
          {
            'leftRail.content': rail,
          },
        ),
      ),
    ).toEqual([]);
    // With no rail prop at all, the zone alone makes a static panel.
    expect(diagnostics(workbench({}, { 'leftRail.content': rail }))).toEqual(
      [],
    );
  });

  it('reports a field set in both places, a bound prop, and an unknown key', () => {
    expect(
      diagnostics(
        workbench(
          { leftRail: { content: { $slot: 'rail' } } },
          { 'leftRail.content': rail },
        ),
      ),
    ).toContain(
      'KUI-V003 "leftRail.content" is set in both `props` and `zones`',
    );
    expect(
      diagnostics({
        ...workbench(
          { leftRail: { $param: 'rail' } },
          {
            'leftRail.content': rail,
          },
        ),
        params: { rail: { type: { kind: 'unknown' } } },
      }),
    ).toContain(
      'KUI-V003 "leftRail" is bound, so a zone cannot fill "leftRail.content"',
    );
    expect(diagnostics(workbench({}, { 'leftRail.label': rail }))).toContain(
      'KUI-V003 @kerfjs/ui:workbench has no zone "leftRail.label"',
    );
  });
});

describe('field zones: rendering', () => {
  const document = workbench(
    { leftRail: { label: 'Folders' } },
    { 'leftRail.content': rail },
  );

  it('interprets the zone into the panel’s content', () => {
    const html = String(
      interpretView(document as never, {
        catalog,
        components: {
          '@kerfjs/ui:workbench': Workbench,
          '@kerfjs/ui:text': Text,
        } as Record<string, (props: never) => SafeHtml>,
        contract: contractDigest(contractOf(document as never, catalog)),
      }),
    );
    expect(html).toContain('aria-label="Folders"');
    expect(html).toContain('Folders</');
  });

  it('generates the zone inside the panel object', () => {
    const { code } = generateView(document as never, catalog, {
      source: 'shell.kui.json',
    });
    expect(code).toMatch(/leftRail: \{\s*content: Text\(/);
    expect(code).toContain('label: "Folders"');
    expect(code).not.toContain("'leftRail.content'");
  });

  it('fills a NavStack view’s content from a zone', () => {
    const stack = {
      schema: VIEW_DOCUMENT_SCHEMA_ID,
      name: 'Stack',
      catalogs: ['@kerfjs/ui'],
      root: {
        id: ROOT,
        type: '@kerfjs/ui:nav-stack',
        props: { id: 'stack', label: 'Stack', views: [{ key: 'home' }] },
        zones: {
          'views.0.content': [text('01JB8Z1M6Q8E1X9V4S7K2R3T5D', 'Home')],
        },
      },
    };
    expect(diagnostics(stack)).toEqual([]);
    const html = String(
      interpretView(stack as never, {
        catalog,
        components: {
          '@kerfjs/ui:nav-stack': NavStack,
          '@kerfjs/ui:text': Text,
        } as Record<string, (props: never) => SafeHtml>,
        contract: contractDigest(contractOf(stack as never, catalog)),
      }),
    );
    expect(html).toContain('Home</');
  });
});
