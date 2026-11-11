// KF-QWDPM3: the Properties area as a task directory whose rows open
// focused pages over the Inspector.
import { afterEach, describe, expect, it } from 'vitest';

import { setProp } from '../../../src/editor/model/edits.js';
import {
  attach,
  choose,
  click,
  COMPOSE,
  field,
  FOLDERS,
  open,
  showBind,
  teardown,
  TOOLBAR,
  type,
} from './editing-harness.js';
import { createEditor } from './kerf-catalog.js';

afterEach(teardown);

const ROW = '01JB8Z1M6Q8E1X9V4S7K2R3T5F';

/** The views the Inspector's NavStack shows, root first. */
const views = (root: HTMLElement) =>
  [
    ...root.querySelectorAll<HTMLElement>(
      '#editor-inspector-stack [data-nav-key]',
    ),
  ].map((view) => view.dataset.navKey);

const row = (root: HTMLElement, path: string) =>
  root.querySelector<HTMLElement>(`[data-editor-prop-group="${path}"]`)!;

const back = (root: HTMLElement) =>
  root
    .querySelector<HTMLElement>('#editor-inspector-stack [data-nav-back]')!
    .click();

/** Types into the All properties search, as the search field reports it. */
function search(root: HTMLElement, query: string) {
  const editor = root.querySelector<HTMLElement>(
    '[data-editor-properties-search]',
  )!;
  editor.textContent = query;
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('the Properties directory (KF-QWDPM3)', () => {
  it('lists the node’s groups with what it sets, and no fields', () => {
    const { root } = open();
    const rows = [
      ...root.querySelectorAll<HTMLElement>('[data-editor-prop-group]'),
    ].map((item) => item.dataset.editorPropGroup);
    expect(rows).toEqual([
      'Content',
      'Appearance',
      'Behavior',
      'Accessibility',
      'Integration',
      'All properties',
    ]);
    expect(row(root, 'Content').textContent).toContain('Children');
    expect(row(root, 'Appearance').textContent).toContain('Tone');
    expect(row(root, 'Accessibility').textContent).toContain('Defaults');
    expect(row(root, 'All properties').textContent).toMatch(
      /Search all \d+ by name/,
    );
    // The overview edits only the node's name; fields are on the pages.
    expect(root.querySelector('[data-editor-prop]')).toBeNull();
    expect(views(root)).toEqual(['inspector']);
  });

  it('marks a bound field in its group’s summary', () => {
    const { root } = open(ROW);
    expect(row(root, 'Content').textContent).toContain('Label (bound)');
  });

  it('opens a group as a page, edits there, and goes back', () => {
    const { root, node } = open();
    row(root, 'Appearance').click();
    expect(views(root)).toEqual(['inspector', 'properties-Appearance']);
    const page = root.querySelector<HTMLElement>(
      '[data-editor-properties-page="Appearance"]',
    )!;
    expect(page.querySelector('[data-editor-prop="tone"]')).not.toBeNull();
    // Another group's fields are not on this page.
    expect(page.querySelector('[data-editor-prop="children"]')).toBeNull();
    back(root);
    expect(views(root)).toEqual(['inspector']);
    expect(node()!.props?.tone).toBe('brand');
  });

  it('splits a group of more than ten fields into its tasks', () => {
    const { root } = open();
    row(root, 'Behavior').click();
    const page = root.querySelector<HTMLElement>(
      '[data-editor-properties-page="Behavior"]',
    )!;
    // Its own field, then a row per task.
    expect(page.textContent).toContain('action compose');
    expect(page.querySelector('[data-editor-prop="href"]')).toBeNull();
    expect(
      [...page.querySelectorAll<HTMLElement>('[data-editor-group-props]')].map(
        (item) => item.dataset.editorPropGroup,
      ),
    ).toEqual([
      'Behavior/State',
      'Behavior/Link',
      'Behavior/Form',
      'Behavior/Popup',
    ]);
    row(root, 'Behavior/Link').click();
    expect(views(root)).toEqual([
      'inspector',
      'properties-Behavior',
      'properties-Behavior-Link',
    ]);
    const link = root.querySelector<HTMLElement>(
      '[data-editor-properties-page="Behavior/Link"]',
    )!;
    expect(
      [...link.querySelectorAll<HTMLElement>('[data-editor-prop]')].map(
        (item) => item.dataset.editorProp,
      ),
    ).toEqual(['link', 'href', 'target']);
    back(root);
    expect(views(root)).toEqual(['inspector', 'properties-Behavior']);
  });

  it('keeps a small group’s tasks on its page under their headings', () => {
    const { root } = open();
    row(root, 'Content').click();
    const page = root.querySelector<HTMLElement>(
      '[data-editor-properties-page="Content"]',
    )!;
    expect(
      page.querySelector('[data-editor-prop-subgroup="Content/Badge"]'),
    ).not.toBeNull();
    expect(page.querySelector('[data-editor-prop="badgeTone"]')).not.toBeNull();
  });

  it('counts a group’s problems on its row', () => {
    const FIELD = '01JB8Z1M6Q8E1X9V4S7K2R3TP4';
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor({
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Unlabeled',
        catalogs: ['@kerfjs/ui'],
        root: {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3TP5',
          type: '@kerfjs/ui:list',
          zones: {
            children: [
              {
                id: FIELD,
                type: '@kerfjs/ui:text-field',
                props: { placeholder: 'Search', size: 'huge', rows: 'many' },
              },
            ],
          },
        },
      } as never,
    });
    attach(root, editor);
    editor.selection.value = { kind: 'node', id: FIELD };
    // `size` has its own problem; the variant hint names label and ariaLabel.
    expect(row(root, 'Appearance').textContent).toContain('1 problem');
    expect(row(root, 'Behavior').textContent).toContain('problem');
    expect(row(root, 'Content').textContent).toContain('1 problem');
    expect(row(root, 'Accessibility').textContent).toContain('1 problem');
    expect(row(root, 'Integration').textContent).not.toContain('problem');
    // The row leads to the field, which shows the problem.
    row(root, 'Appearance').click();
    expect(
      root.querySelector('[data-editor-prop="size"]')!.textContent,
    ).toMatch(/huge|variant|size/i);
  });
});

describe('All properties (KF-QWDPM3)', () => {
  it('searches labels, API names, and groups, under each field’s group', () => {
    const { root } = open();
    row(root, 'All properties').click();
    expect(views(root)).toEqual(['inspector', 'properties-All-properties']);
    const page = () =>
      root.querySelector<HTMLElement>(
        '[data-editor-properties-page="All properties"]',
      )!;
    const shown = () =>
      [...page().querySelectorAll<HTMLElement>('[data-editor-prop]')].map(
        (item) => item.dataset.editorProp,
      );
    // Empty, it lists every field.
    expect(shown()).toEqual(expect.arrayContaining(['children', 'tone', 'id']));
    search(root, 'popover target');
    expect(shown()).toEqual(['popoverTarget', 'popoverTargetAction']);
    expect(page().textContent).toContain('Behavior · Popup');
    // An API name finds its field too.
    search(root, 'ariaHasPopup');
    expect(shown()).toEqual(['ariaHasPopup']);
    // A group's name finds its fields.
    search(root, 'integration');
    expect(shown()).toEqual(['id', 'className']);
    search(root, 'nothing like this');
    expect(shown()).toEqual([]);
    expect(page().textContent).toContain('No properties match');
    root
      .querySelector<HTMLElement>('[data-action="editor-properties-clear"]')
      ?.click();
    expect(shown().length).toBeGreaterThan(20);
  });

  it('starts empty each time it opens', () => {
    const { root } = open();
    row(root, 'All properties').click();
    search(root, 'tone');
    back(root);
    row(root, 'All properties').click();
    expect(
      root.querySelectorAll(
        '[data-editor-properties-page="All properties"] [data-editor-prop]',
      ).length,
    ).toBeGreaterThan(20);
  });
});

describe('a new selection and the open page (KF-QWDPM3)', () => {
  it('keeps a group the new node also has', () => {
    const { root } = open();
    row(root, 'Appearance').click();
    // Selecting through the outline goes through the editor's select.
    root
      .querySelector<HTMLElement>(
        `[data-action="editor-select-node"][data-item-id="${FOLDERS}"]`,
      )!
      .click();
    expect(views(root)).toEqual(['inspector', 'properties-Appearance']);
  });

  it('returns to the overview from a group the new node lacks', () => {
    const { root } = open();
    row(root, 'Accessibility').click();
    root
      .querySelector<HTMLElement>(
        `[data-action="editor-select-node"][data-item-id="${FOLDERS}"]`,
      )!
      .click();
    expect(views(root)).toEqual(['inspector']);
  });

  it('keeps the group but not a task the new node lacks', () => {
    const { root } = open();
    row(root, 'Behavior').click();
    row(root, 'Behavior/Link').click();
    root
      .querySelector<HTMLElement>(
        `[data-action="editor-select-node"][data-item-id="${ROW}"]`,
      )!
      .click();
    expect(views(root)).toEqual(['inspector', 'properties-Behavior']);
  });

  it('returns to the overview for a slot', () => {
    const { root, editor } = open(TOOLBAR);
    row(root, 'All properties').click();
    choose(field(root, '[data-editor-add="zone"]'), 'trailing');
    type(field(root, '[data-editor-slot="name"]'), 'actions');
    click(root, 'editor-add-slot');
    expect(editor.selection.value?.kind).toBe('slot');
    expect(views(root)).toEqual(['inspector']);
  });

  it('keeps All properties for another node', () => {
    const { root } = open();
    row(root, 'All properties').click();
    root
      .querySelector<HTMLElement>(
        `[data-action="editor-select-node"][data-item-id="${FOLDERS}"]`,
      )!
      .click();
    expect(views(root)).toEqual(['inspector', 'properties-All-properties']);
    root
      .querySelector<HTMLElement>(
        `[data-action="editor-select-node"][data-item-id="${COMPOSE}"]`,
      )!
      .click();
    expect(views(root)).toEqual(['inspector', 'properties-All-properties']);
  });
});

describe('binding and promotion beside each field (KF-FN28S3)', () => {
  const bindRows = (root: HTMLElement, path: string) =>
    [
      ...root.querySelectorAll<HTMLElement>(
        `[data-editor-bind-rows="${path}"] [data-editor-bind-row]`,
      ),
    ].map((item) => item.dataset.editorBindRow);

  it('ends each page with a row per field it holds', () => {
    const { root } = open();
    // The overview has no Promote or Bind picker of its own.
    expect(root.querySelector('[data-editor-bind="prop"]')).toBeNull();
    expect(root.querySelector('[data-editor-bind-row]')).toBeNull();
    row(root, 'Appearance').click();
    expect(bindRows(root, 'Appearance')).toContain('tone');
    expect(
      root.querySelector('[data-editor-bind-row="tone"]')!.textContent,
    ).toContain('Not bound');
    // A split group's page binds its own fields; each task binds its own.
    row(root, 'Behavior').click();
    expect(bindRows(root, 'Behavior')).toEqual(['action']);
    row(root, 'Behavior/Link').click();
    expect(bindRows(root, 'Behavior/Link')).toEqual(['link', 'href', 'target']);
  });

  it('opens a field’s Bind page and keeps it across an edit', () => {
    const { root, editor, node } = open();
    showBind(root, 'tone');
    expect(views(root)).toEqual([
      'inspector',
      'properties-Appearance',
      'properties-Appearance-bind-tone',
    ]);
    expect(
      root.querySelector('#editor-inspector-stack')!.textContent,
    ).toContain('Bind Tone');
    root
      .querySelector<HTMLElement>(
        '[data-editor-bind-page="tone"] [data-action="editor-promote-prop"]',
      )!
      .click();
    expect(node()!.props?.tone).toEqual({ $param: 'composeButtonTone' });
    expect(views(root).at(-1)).toBe('properties-Appearance-bind-tone');
    // Selecting the same node again keeps the page.
    root
      .querySelector<HTMLElement>(
        `[data-action="editor-select-node"][data-item-id="${COMPOSE}"]`,
      )!
      .click();
    expect(views(root).at(-1)).toBe('properties-Appearance-bind-tone');
    expect(
      root.querySelector('[data-editor-bind-row="tone"]')!.textContent,
    ).toContain('Param composeButtonTone');
    expect(row(root, 'Appearance').textContent).toContain('Tone (bound)');
    back(root);
    expect(views(root).at(-1)).toBe('properties-Appearance');
    expect(editor.selection.value).toEqual({ kind: 'node', id: COMPOSE });
  });

  it('closes a Bind page when another node is selected', () => {
    const { root } = open();
    showBind(root, 'tone');
    root
      .querySelector<HTMLElement>(
        `[data-action="editor-select-node"][data-item-id="${FOLDERS}"]`,
      )!
      .click();
    expect(views(root)).toEqual(['inspector', 'properties-Appearance']);
  });

  it('shows no Bind page for a field the node lacks', () => {
    const { root, editor } = open();
    row(root, 'Behavior').click();
    row(root, 'Behavior/Link').click();
    showBind(root, 'href');
    // A selection made without the editor's select keeps the path.
    editor.selection.value = { kind: 'node', id: TOOLBAR };
    expect(root.querySelector('[data-editor-bind-page]')).toBeNull();
  });

  it('shows a binding the scope no longer offers on its row, not as a source', () => {
    const { root, editor, node } = open();
    editor.document.value = setProp(editor.document.value, COMPOSE, 'tone', {
      $param: 'gone',
    });
    showBind(root, 'tone');
    expect(
      root.querySelector('[data-editor-bind-row="tone"]')!.textContent,
    ).toContain('Param gone');
    const source = root.querySelector<HTMLElement>(
      '[data-editor-bind-page="tone"] [data-editor-bind="source"]',
    )!;
    expect(source.getAttribute('value')).toBe('');
    expect(node()!.props?.tone).toEqual({ $param: 'gone' });
  });
});
