// KF-YJFMZY: the editor saves a document's props in their declared order, so
// the same document always writes the same bytes, however (and in whatever
// order) its fields were edited. A TextField toggle's required `pressed` was
// seeded on its first edit, so a sample built one way saved `pressed` before
// `action` and the committed one, built another way, after it.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

import type { ViewDocument, ViewType } from '@kerfjs/ui/view';
import { describe, expect, it, vi } from 'vitest';

import { serializeDocument } from '../../../src/editor/model/document.js';
import {
  documentInDeclaredOrder,
  inDeclaredOrder,
} from '../../../src/editor/model/fields.js';
import { attach } from './editing-harness.js';
import { createEditor, defaultCatalog } from './kerf-catalog.js';

const TEXT_FIELD = '@kerfjs/ui:text-field';
const propsOf = (key: string) => defaultCatalog.propsByKey.get(key)?.props;
const definitionsOf = (key: string) =>
  defaultCatalog.viewCatalog.components.get(key)?.definitions ?? {};
const inOrder = (document: ViewDocument) =>
  documentInDeclaredOrder(document, propsOf, definitionsOf);

/** A document holding one TextField with `props`, inside a `$if`. */
const withTextField = (props: Record<string, unknown>) =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Password',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: '00000000000000000000000001',
      type: '@kerfjs/ui:pane',
      zones: {
        content: [
          {
            $if: true,
            then: {
              id: '00000000000000000000000002',
              type: TEXT_FIELD,
              props,
            },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

const textFieldProps = (document: ViewDocument) =>
  (
    document.root.zones!.content![0] as unknown as {
      then: { props: Record<string, unknown> };
    }
  ).then.props;

describe('declared order', () => {
  it('orders an object prop by its type, whatever order it was written in', () => {
    const toggle = { action: 'reveal', pressed: false, label: 'Show' };
    const type = { kind: 'ref', ref: 'TextFieldToggle' } as ViewType;
    expect(
      Object.keys(inDeclaredOrder(toggle, type, definitionsOf(TEXT_FIELD))!),
    ).toEqual(['label', 'pressed', 'action']);
  });

  it('orders a node’s props, keeps unknown keys last, and leaves bindings as written', () => {
    const document = inOrder(
      withTextField({
        toggle: { pressed: true, extra: 1, label: 'Show', action: 'go' },
        value: { $param: 'password' },
        label: 'Password',
      }),
    );
    const props = textFieldProps(document);
    expect(Object.keys(props)).toEqual(['label', 'value', 'toggle']);
    expect(Object.keys(props.toggle as object)).toEqual([
      'label',
      'pressed',
      'action',
      'extra',
    ]);
    expect(props.value).toEqual({ $param: 'password' });
  });

  it('leaves a component the catalog does not know as written', () => {
    const document = withTextField({ b: 1, a: 2 });
    (
      document.root.zones!.content![0] as unknown as {
        then: { type: string };
      }
    ).then.type = '@app/ui:unknown';
    expect(Object.keys(textFieldProps(inOrder(document)))).toEqual(['b', 'a']);
  });

  it('saves the same bytes for the same document edited in either order', () => {
    const saved = (toggle: Record<string, unknown>) => {
      const save = vi.fn();
      const root = document.createElement('div');
      document.body.append(root);
      attach(
        root,
        createEditor({
          document: withTextField({ label: 'Password', toggle }),
          save,
        }),
      );
      root.querySelector<HTMLElement>('[data-action="editor-save"]')!.click();
      root.remove();
      return save.mock.calls[0]![1] as string;
    };
    const one = saved({ label: 'Show', pressed: false, action: 'reveal' });
    const other = saved({ label: 'Show', action: 'reveal', pressed: false });
    expect(one).toBe(other);
    expect(one.indexOf('"pressed"')).toBeLessThan(one.indexOf('"action"'));
  });

  it('holds for every committed editor build sample', () => {
    // The demo builds save these through Export; a rerun must not reorder them.
    const folder = resolve(process.cwd(), '../editor/samples');
    const unordered = readdirSync(folder)
      .filter((file) => file.endsWith('.kui.json'))
      .filter((file) => {
        const text = readFileSync(resolve(folder, file), 'utf8');
        return (
          serializeDocument(inOrder(JSON.parse(text) as ViewDocument)) !== text
        );
      });
    expect(unordered).toEqual([]);
  });
});
