import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { documentParamsPanel } from '../../../src/editor/document-params-panel.js';
import { controlOf } from '../../../src/editor/model/control-flow.js';
import { createEditor, sample } from './kerf-catalog.js';

const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

function open(options: Parameters<typeof createEditor>[0] = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor(options);
  const stop = mount(root, editor.render);
  const unwire = editor.wire(root);
  cleanup = () => {
    unwire();
    stop();
  };
  root
    .querySelector<HTMLElement>(
      '[role="tab"][data-tab-id="editor-document-areas-params"]',
    )!
    .click();
  return { root, editor };
}

function change(field: HTMLElement, value: string | boolean) {
  if (field.localName === 'kui-select') {
    field.setAttribute('value', String(value));
    Object.defineProperty(field, 'value', {
      configurable: true,
      value: String(value),
    });
  } else {
    const input = field.querySelector<HTMLInputElement>('input')!;
    if (typeof value === 'boolean') input.checked = value;
    else input.value = value;
  }
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

const action = (root: HTMLElement, name: string, scope?: HTMLElement) =>
  (scope ?? root)
    .querySelector<HTMLElement>(`[data-action="${name}"]`)!
    .click();

const row = (root: HTMLElement, name: string) =>
  root.querySelector<HTMLElement>(`[data-editor-param-row="${name}"]`)!;

const field = (root: HTMLElement, name: string, part: string, index?: number) =>
  [
    ...root.querySelectorAll<HTMLElement>('[data-editor-document-param-edit]'),
  ].find((element) => {
    const at = JSON.parse(element.dataset.editorDocumentParamEdit!);
    return at.name === name && at.part === part && at.index === index;
  })!;

function add(root: HTMLElement, name: string, kind: string) {
  change(
    root.querySelector<HTMLElement>('[data-editor-document-param-new="name"]')!,
    name,
  );
  change(
    root.querySelector<HTMLElement>('[data-editor-document-param-new="type"]')!,
    kind,
  );
  action(root, 'editor-create-document-param');
}

function sendEdit(root: HTMLElement, at: object, value: string) {
  const input = document.createElement('input');
  input.setAttribute('data-editor-document-param-edit', JSON.stringify(at));
  root.append(input);
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.remove();
}

function sendAction(
  root: HTMLElement,
  name: string,
  attrs: Record<string, string>,
) {
  const button = document.createElement('button');
  button.setAttribute('data-action', name);
  for (const [key, value] of Object.entries(attrs))
    button.setAttribute(key, value);
  root.append(button);
  button.click();
  button.remove();
}

describe('document Params authoring', () => {
  it('creates a boolean for Show, edits its default, renames references, and undoes', () => {
    const { root, editor } = open();
    add(root, 'showDetails', 'boolean');
    expect(editor.document.value.params?.showDetails).toEqual({
      type: { kind: 'boolean' },
    });
    change(field(root, 'showDetails', 'defaultEnabled'), true);
    change(field(root, 'showDetails', 'default'), 'true');
    expect(editor.document.value.params?.showDetails?.default).toBe(true);

    editor.selection.value = { kind: 'node', id: COMPOSE };
    const condition = root.querySelector<HTMLElement>(
      '[data-editor-control="condition"]',
    )!;
    expect(condition.innerHTML).toContain('Param showDetails');
    change(condition, JSON.stringify({ $param: 'showDetails' }));
    expect(controlOf(editor.document.value, COMPOSE)?.condition).toEqual({
      $param: 'showDetails',
    });
    change(field(root, 'showDetails', 'name'), 'showMore');
    expect(controlOf(editor.document.value, COMPOSE)?.condition).toEqual({
      $param: 'showMore',
    });
    expect(
      action(root, 'editor-remove-document-param', row(root, 'showMore')),
    ).toBeUndefined();
    expect(editor.document.value.params?.showMore).toBeDefined();
    action(root, 'editor-undo');
    expect(editor.document.value.params?.showDetails).toBeDefined();
    action(root, 'editor-redo');
    expect(editor.document.value.params?.showMore).toBeDefined();
  });

  it('builds a list item schema for Repeat for each and rejects an invalid default', () => {
    const { root, editor } = open();
    add(root, 'cards', 'array');
    action(root, 'editor-add-document-param-field', row(root, 'cards'));
    change(field(root, 'cards', 'fieldName', 0), 'id');
    action(root, 'editor-add-document-param-field', row(root, 'cards'));
    change(field(root, 'cards', 'fieldName', 1), 'label');
    expect(editor.document.value.params?.cards?.type.items).toEqual({
      kind: 'object',
      props: [
        { name: 'id', type: { kind: 'string' }, required: true },
        { name: 'label', type: { kind: 'string' }, required: true },
      ],
    });
    change(field(root, 'cards', 'defaultEnabled'), true);
    change(field(root, 'cards', 'default'), '[{"id":1}]');
    expect(row(root, 'cards').textContent).toContain(
      'the default is not a valid array',
    );

    editor.selection.value = { kind: 'node', id: COMPOSE };
    const repeat = root.querySelector<HTMLElement>(
      '[data-editor-control="repeat"]',
    )!;
    expect(repeat.innerHTML).toContain('Param cards');
    change(repeat, JSON.stringify({ $param: 'cards' }));
    expect(controlOf(editor.document.value, COMPOSE)?.repeat?.source).toEqual({
      $param: 'cards',
    });
    expect(row(root, 'cards').textContent).toContain(
      'Remove this parameter’s bindings before deleting it.',
    );
  });

  it('edits numeric defaults and reports malformed input without losing the document', () => {
    const { root, editor } = open();
    add(root, 'count', 'number');
    change(field(root, 'count', 'defaultEnabled'), true);
    change(field(root, 'count', 'default'), 'not a number');
    expect(row(root, 'count').textContent).toContain('Enter a finite number.');
    expect(editor.document.value.params?.count?.default).toBe(1);
    change(field(root, 'count', 'default'), '12');
    expect(editor.document.value.params?.count?.default).toBe(12);
    change(field(root, 'count', 'defaultEnabled'), false);
    expect(editor.document.value.params?.count?.default).toBeUndefined();
    action(root, 'editor-remove-document-param', row(root, 'count'));
    expect(editor.document.value.params?.count).toBeUndefined();
  });

  it('edits choice and literal types with validator feedback', () => {
    const { root, editor } = open();
    add(root, 'choice', 'enum');
    change(field(root, 'choice', 'enumValues'), 'broken');
    expect(row(root, 'choice').textContent).toContain(
      'Enter a JSON array of choices.',
    );
    change(field(root, 'choice', 'enumValues'), '[]');
    expect(row(root, 'choice').textContent).toContain(
      'Enter a non-empty JSON array of choices.',
    );
    change(field(root, 'choice', 'enumValues'), '["red","blue"]');
    expect(editor.document.value.params?.choice?.type).toEqual({
      kind: 'enum',
      values: ['red', 'blue'],
    });
    change(field(root, 'choice', 'defaultEnabled'), true);
    change(field(root, 'choice', 'default'), 'not json');
    expect(row(root, 'choice').textContent).toContain(
      'Enter a valid JSON value.',
    );
    change(field(root, 'choice', 'default'), '"blue"');
    expect(editor.document.value.params?.choice?.default).toBe('blue');
    change(field(root, 'choice', 'defaultEnabled'), false);
    change(field(root, 'choice', 'type'), 'literal');
    change(field(root, 'choice', 'literalValue'), 'broken');
    expect(row(root, 'choice').textContent).toContain(
      'Enter a JSON string, number, or boolean.',
    );
    change(field(root, 'choice', 'literalValue'), '{}');
    expect(row(root, 'choice').textContent).toContain(
      'Enter a JSON string, number, or boolean.',
    );
    change(field(root, 'choice', 'literalValue'), '"blue"');
    expect(editor.document.value.params?.choice?.type).toEqual({
      kind: 'literal',
      value: 'blue',
    });
  });

  it('changes item and field schemas, refusing duplicate names and invalid edits', () => {
    const { root, editor } = open();
    add(root, 'entries', 'array');
    change(field(root, 'entries', 'itemType'), 'string');
    expect(editor.document.value.params?.entries?.type.items).toEqual({
      kind: 'string',
    });
    change(field(root, 'entries', 'itemType'), 'object');
    action(root, 'editor-add-document-param-field', row(root, 'entries'));
    action(root, 'editor-add-document-param-field', row(root, 'entries'));
    change(field(root, 'entries', 'fieldName', 0), 'id');
    change(field(root, 'entries', 'fieldName', 1), 'id');
    expect(row(root, 'entries').textContent).toContain(
      'Field names must be unique camelCase identifiers.',
    );
    change(field(root, 'entries', 'fieldName', 1), 'label');
    change(field(root, 'entries', 'fieldType', 1), 'number');
    change(field(root, 'entries', 'fieldRequired', 1), false);
    expect(editor.document.value.params?.entries?.type.items).toEqual({
      kind: 'object',
      props: [
        { name: 'id', type: { kind: 'string' }, required: true },
        { name: 'label', type: { kind: 'number' }, required: false },
      ],
    });
    action(root, 'editor-remove-document-param-field', row(root, 'entries'));
    expect(
      editor.document.value.params?.entries?.type.items?.props,
    ).toHaveLength(1);
  });

  it('reports invalid names and edits object fields without rewriting valid inputs', () => {
    const { root, editor } = open();
    add(root, 'Bad Name', 'string');
    expect(root.textContent).toContain('camelCase identifier');
    add(root, 'title', 'string');
    expect(root.textContent).toContain('already a param named title');
    add(root, 'record', 'object');
    change(field(root, 'record', 'name'), 'title');
    expect(row(root, 'record').textContent).toContain(
      'already a param named title',
    );
    action(root, 'editor-add-document-param-field', row(root, 'record'));
    change(field(root, 'record', 'fieldName', 0), 'Bad Name');
    expect(row(root, 'record').textContent).toContain('unique camelCase');
    change(field(root, 'record', 'fieldName', 0), 'id');
    change(field(root, 'record', 'fieldType', 0), 'number');
    change(field(root, 'record', 'fieldRequired', 0), false);
    expect(editor.document.value.params?.record?.type.props).toEqual([
      { name: 'id', type: { kind: 'number' }, required: false },
    ]);
    action(root, 'editor-remove-document-param-field', row(root, 'record'));
    expect(editor.document.value.params?.record?.type.props).toEqual([]);
    change(field(root, 'showEmpty', 'type'), 'string');
    expect(row(root, 'showEmpty').textContent).toContain(
      'the default is not a valid string',
    );
  });

  it('ignores stale edits and prevents invalid defaults for application props', () => {
    const { root, editor } = open({
      document: {
        ...sample,
        params: {
          ...sample.params,
          appValue: {
            type: {
              kind: 'prop',
              component: '@kerfjs/ui:select',
              prop: 'renderSelected',
            },
          },
          bareObject: { type: { kind: 'object' } },
        },
      },
    });
    sendEdit(root, { name: 'missing', part: 'type' }, 'boolean');
    sendEdit(root, { name: 'title', part: 'itemType' }, 'string');
    sendEdit(root, { name: 'title', part: 'fieldName', index: 0 }, 'x');
    sendEdit(root, { name: 'items', part: 'fieldName', index: 99 }, 'x');
    sendEdit(root, { name: 'bareObject', part: 'fieldName', index: 0 }, 'x');
    sendEdit(root, { name: 'appValue', part: 'defaultEnabled' }, 'true');
    expect(row(root, 'appValue').textContent).toContain(
      'no editable example default',
    );
    sendAction(root, 'editor-remove-document-param', {});
    sendAction(root, 'editor-remove-document-param', {
      'data-editor-document-param-remove': 'title',
    });
    expect(row(root, 'title').textContent).toContain(
      'Remove its bindings first',
    );
    sendAction(root, 'editor-add-document-param-field', {});
    sendAction(root, 'editor-add-document-param-field', {
      'data-editor-document-param-field': JSON.stringify({ name: 'missing' }),
    });
    sendAction(root, 'editor-add-document-param-field', {
      'data-editor-document-param-field': JSON.stringify({ name: 'title' }),
    });
    sendAction(root, 'editor-add-document-param-field', {
      'data-editor-document-param-field': JSON.stringify({
        name: 'bareObject',
      }),
    });
    sendAction(root, 'editor-remove-document-param-field', {});
    sendAction(root, 'editor-remove-document-param-field', {
      'data-editor-document-param-field': JSON.stringify({
        name: 'missing',
        index: 0,
      }),
    });
    sendAction(root, 'editor-remove-document-param-field', {
      'data-editor-document-param-field': JSON.stringify({
        name: 'items',
        index: 99,
      }),
    });
    add(root, 'body', 'content');
    change(field(root, 'body', 'defaultEnabled'), true);
    expect(row(root, 'body').textContent).toContain(
      'the default is not a valid content',
    );
    expect(editor.document.value.params?.body?.default).toBeUndefined();
    expect(editor.document.value.params?.appValue?.default).toBeUndefined();
    change(field(root, 'title', 'default'), 'Inbox renamed');
    expect(editor.document.value.params?.title?.default).toBe('Inbox renamed');
  });

  it('renders incomplete imported schemas so the author can repair them', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const incomplete = {
      ...sample,
      params: {
        bareObject: { type: { kind: 'object' } },
        bareArray: { type: { kind: 'array' } },
        bareEnum: {
          type: { kind: 'enum', default: undefined },
          default: undefined,
        },
      },
    } as never;
    const stop = mount(root, () =>
      documentParamsPanel(incomplete, '', 'string', {}),
    );
    cleanup = stop;
    expect(row(root, 'bareObject').textContent).toContain('Add field');
    expect(row(root, 'bareArray').textContent).toContain('Item type');
    expect(row(root, 'bareEnum').textContent).toContain('Choices');
    stop();
    const empty = { ...sample, params: undefined };
    cleanup = mount(root, () => documentParamsPanel(empty, '', 'string', {}));
    expect(root.textContent).toContain('Add parameter');
  });
});
