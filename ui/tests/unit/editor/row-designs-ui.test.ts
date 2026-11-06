// KF-1CRGP1: the Repeat section authors row designs, an `$if`-chain `$each`
// template: add a design shown for the items where a true/false value holds,
// change when it shows, and remove it. The outline lists every design, the
// canvas renders each row's design, and every edit undoes.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { controlOf } from '../../../src/editor/model/control-flow.js';
import { createEditor } from './kerf-catalog.js';

const ROW = '01JB8Z1M6Q8E1X9V4S7K2R3T5F';
const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
const LIST_ITEM = '@kerfjs/ui:list-item';
const HEADER = JSON.stringify({ $bind: 'item.header' });

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

/** The sample, whose items gain a true/false `header` field when `flag`. */
function withHeaderField(document: ViewDocument, flag = true): ViewDocument {
  const items = document.params!.items!;
  const type = items.type as {
    items: { props: readonly { name: string }[] };
  };
  return {
    ...document,
    params: {
      ...(flag ? document.params : { items: document.params!.items! }),
      items: {
        ...items,
        type: {
          ...type,
          items: {
            ...type.items,
            props: [
              ...type.items.props,
              ...(flag
                ? [
                    {
                      name: 'header',
                      type: { kind: 'boolean' },
                      required: false,
                    },
                  ]
                : []),
            ],
          },
        },
        default: [
          { id: 'a', label: 'Today', header: true },
          { id: 'b', label: 'Lunch' },
        ],
      } as never,
    },
  };
}

function open(id = ROW, flag = true) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor();
  editor.document.value = withHeaderField(editor.document.value, flag);
  const stopMount = mount(root, editor.render);
  const unwireEditor = editor.wire(root);
  cleanup = () => {
    unwireEditor();
    stopMount();
  };
  editor.selection.value = { kind: 'node', id };
  return { root, editor };
}

const field = (root: HTMLElement, selector: string) =>
  root.querySelector<HTMLElement>(selector)!;

/** Changes a Select the way its popup does: a new value, then `change`. */
function choose(select: HTMLElement, value: string) {
  select.setAttribute('value', value);
  Object.defineProperty(select, 'value', { configurable: true, value });
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

const click = (root: HTMLElement, action: string) =>
  field(root, `[data-action="${action}"]`).click();
const addDesign = (root: HTMLElement, condition = HEADER) => {
  choose(field(root, '[data-editor-row-design="component"]'), LIST_ITEM);
  choose(field(root, '[data-editor-row-design="condition"]'), condition);
  click(root, 'editor-add-row-design');
};
const selectedId = (editor: ReturnType<typeof createEditor>) =>
  (editor.selection.value as { id: string }).id;

describe('row designs in the Repeat section', () => {
  it('adds a design, selects it, and lists both in the outline', () => {
    const { root, editor } = open();
    expect(root.textContent).toContain('Row designs');
    expect(root.querySelector('[data-action="editor-remove-row-design"]')).toBe(
      null,
    );
    addDesign(root);
    const added = selectedId(editor);
    expect(added).not.toBe(ROW);
    const rows = controlOf(editor.document.value, added)!.rows!;
    expect(rows.branches.map((branch) => branch.node.id)).toEqual([added, ROW]);
    expect(rows.branches[0]!.condition).toEqual({ $bind: 'item.header' });
    expect(root.textContent).toContain('if item.header');
    expect(root.textContent).toContain('otherwise');
    // The canvas renders each item's design: both rows, keyed.
    const canvasRows = root.querySelectorAll('[data-key]');
    expect([...canvasRows].map((row) => row.getAttribute('data-key'))).toEqual(
      expect.arrayContaining(['a', 'b']),
    );
    click(root, 'editor-undo');
    expect(controlOf(editor.document.value, ROW)?.rows).toBeUndefined();
  });

  it('changes when a design shows, and leaves the last one for the rest', () => {
    const { root, editor } = open();
    addDesign(root);
    const added = selectedId(editor);
    const condition = () =>
      field(root, '[data-editor-control="row-condition"]');
    expect(condition().innerHTML).toContain('Param showEmpty');
    const before = editor.document.value;
    choose(condition(), HEADER);
    expect(editor.document.value).toBe(before);
    choose(condition(), JSON.stringify({ $param: 'showEmpty' }));
    expect(
      controlOf(editor.document.value, added)!.rows!.branches[0]!.condition,
    ).toEqual({ $param: 'showEmpty' });
    editor.selection.value = { kind: 'node', id: ROW };
    expect(root.textContent).toContain('For every other item');
    expect(root.querySelector('[data-editor-control="row-condition"]')).toBe(
      null,
    );
  });

  it('removes a design and selects the one before it', () => {
    const { root, editor } = open();
    addDesign(root);
    const first = selectedId(editor);
    editor.selection.value = { kind: 'node', id: ROW };
    addDesign(root);
    const second = selectedId(editor);
    expect(
      controlOf(editor.document.value, ROW)!.rows!.branches.map(
        (branch) => branch.node.id,
      ),
    ).toEqual([first, second, ROW]);
    click(root, 'editor-remove-row-design');
    expect(selectedId(editor)).toBe(first);
    click(root, 'editor-remove-row-design');
    // One design left: a plain template, selected.
    expect(selectedId(editor)).toBe(ROW);
    expect(controlOf(editor.document.value, ROW)).toEqual({
      repeat: expect.objectContaining({ as: 'item' }),
    });
  });

  it('offers no design when no true/false value can pick one', () => {
    const { root } = open(ROW, false);
    expect(root.textContent).toContain(
      'No true/false param or item field can pick a row design here.',
    );
    expect(root.querySelector('[data-editor-row-design]')).toBeNull();
  });

  it('shows no row designs for a node that does not repeat', () => {
    const { root, editor } = open(COMPOSE);
    expect(root.textContent).not.toContain('Row designs');
    editor.selection.value = { kind: 'node', id: COMPOSE };
    expect(root.querySelector('[data-editor-row-design]')).toBeNull();
  });
});
