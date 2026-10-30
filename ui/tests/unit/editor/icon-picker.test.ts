// KF-VYRDDQ: icon data picks a Lucide icon in a searchable dialog that
// writes `{ $icon: name }`, at the top level and inside an object form.
import { lucideExportName } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { icons } from 'lucide';
import { afterEach, describe, expect, it } from 'vitest';

import { controlFor } from '../../../src/editor/model/controls.js';
import { findNode } from '../../../src/editor/model/document.js';
import { setProp } from '../../../src/editor/model/edits.js';
import {
  ICON_RESULTS,
  iconNames,
  lucideIconName,
  matchIcons,
} from '../../../src/editor/model/icons.js';
import { createEditor } from './kerf-catalog.js';

describe('icon names and search', () => {
  it('names every Lucide export by a name that round-trips to it', () => {
    expect(lucideIconName('ChevronRight')).toBe('chevron-right');
    expect(lucideIconName('ArrowDown01')).toBe('arrow-down-0-1');
    expect(lucideIconName('ArrowDownAZ')).toBe('arrowDownAZ');
    const names = iconNames(icons);
    expect(names).toHaveLength(Object.keys(icons).length);
    for (const name of names)
      expect(icons).toHaveProperty(lucideExportName(name));
    expect([...names].sort()).toEqual(names);
  });

  it('matches words in any order and caps the results', () => {
    const names = ['chevron-right', 'chevron-left', 'arrow-right', 'circle'];
    expect(matchIcons(names, 'right chev')).toEqual({
      names: ['chevron-right'],
      total: 1,
    });
    expect(matchIcons(names, 'RIGHT').total).toBe(2);
    expect(matchIcons(names, '', 2)).toEqual({
      names: ['chevron-right', 'chevron-left'],
      total: 4,
    });
    expect(ICON_RESULTS).toBeGreaterThan(0);
  });

  it('ranks an exact name, then whole words, then word starts', () => {
    const names = ['align-start', 'star-off', 'star', 'stars', 'mustard'];
    expect(matchIcons(names, 'star').names).toEqual([
      'star',
      'star-off',
      'align-start',
      'stars',
      'mustard',
    ]);
  });

  it('gives icon data the icon control, and anything else stays read-only', () => {
    const icon = {
      name: 'icon',
      type: { kind: 'array' },
      required: true,
      iconSource: 'lucide',
    } as const;
    expect(controlFor(icon, undefined)).toEqual({ kind: 'icon', raw: '' });
    expect(controlFor(icon, { $icon: 'circle' })).toEqual({
      kind: 'icon',
      raw: 'circle',
    });
    expect(controlFor(icon, { $param: 'icon' } as never).kind).toBe('readonly');
    expect(controlFor(icon, [] as never).kind).toBe('readonly');
  });
});

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';

function choose(select: HTMLElement, value: string) {
  select.setAttribute('value', value);
  Object.defineProperty(select, 'value', { configurable: true, value });
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

const click = (root: HTMLElement, selector: string) =>
  root.querySelector<HTMLElement>(selector)!.click();

/** An editor with a new `key` node added to the inbox Pane, selected. */
function added(key: string) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor();
  mount(root, editor.render);
  cleanup = editor.wire(root);
  editor.selection.value = { kind: 'node', id: PANE };
  choose(root.querySelector('[data-editor-add="zone"]')!, 'content');
  choose(root.querySelector('[data-editor-add="component"]')!, key);
  click(root, '[data-action="editor-add-child"]');
  const { id } = editor.selection.value as { id: string };
  const props = () => findNode(editor.document.value, id)!.node.props ?? {};
  return { root, editor, id, props };
}

/** Types into the picker's search the way its editor reports input. */
function search(root: HTMLElement, text: string) {
  const editor = root.querySelector<HTMLElement>('[data-editor-icon-search]')!;
  editor.textContent = text;
  editor.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
  );
}

const dialog = (root: HTMLElement) =>
  root.querySelector<HTMLDialogElement>('#editor-icon-dialog')!;

describe('the icon picker (KF-VYRDDQ)', () => {
  it('shows a LucideIcon’s icon as a row, picks another, and removes it', () => {
    const { root, props } = added('@kerfjs/ui:lucide-icon');
    const row = root.querySelector<HTMLElement>(
      `[data-editor-icon-place='{"prop":"icon","path":[]}']`,
    )!;
    expect(row.textContent).toContain('circle');
    expect(root.querySelector('[data-editor-prop="icon"]')).toBeNull();
    click(root, `[data-editor-icon-place='{"prop":"icon","path":[]}']`);
    expect(dialog(root).open).toBe(true);
    // Unsearched, it shows the first icons and says how many there are.
    expect(dialog(root).textContent).toMatch(/Showing \d+ of \d+ icons/);
    // The chosen icon reads as pressed.
    search(root, 'circle');
    const circle = dialog(root).querySelector('[data-editor-icon="circle"]')!;
    expect(
      circle.getAttribute('aria-pressed') ??
        circle.querySelector('[aria-pressed]')?.getAttribute('aria-pressed'),
    ).toBe('true');
    search(root, 'chevron right');
    expect(
      [...dialog(root).querySelectorAll<HTMLElement>('[data-editor-icon]')].map(
        (button) => button.dataset.editorIcon,
      ),
    ).toContain('chevron-right');
    // Clear empties the search and shows every icon again.
    click(root, '[data-action="editor-clear-icon-search"]');
    expect(dialog(root).textContent).toMatch(/Showing \d+ of \d+ icons/);
    // A name only one icon matches reads in the singular.
    search(root, 'accessibility');
    expect(dialog(root).textContent).toContain('1 icon');
    search(root, 'chevron right');
    click(root, '[data-editor-icon="chevron-right"]');
    expect(props().icon).toEqual({ $icon: 'chevron-right' });
    expect(dialog(root).open).toBe(false);
    // Closing the dialog ends the pick, so Remove acts on a fresh open.
    dialog(root).dispatchEvent(new Event('close'));
    click(root, `[data-editor-icon-place='{"prop":"icon","path":[]}']`);
    search(root, 'circle');
    expect(dialog(root).textContent).toContain('Remove icon');
    click(root, '[data-action="editor-remove-icon"]');
    expect(props()).not.toHaveProperty('icon');
  });

  it('shows a name Lucide does not have without a glyph', () => {
    const { root, editor, id } = added('@kerfjs/ui:lucide-icon');
    editor.document.value = setProp(editor.document.value, id, 'icon', {
      $icon: 'no-such-icon',
    });
    const row = root.querySelector<HTMLElement>(
      `[data-editor-icon-place='{"prop":"icon","path":[]}']`,
    )!;
    expect(row.textContent).toContain('no-such-icon');
    expect(row.querySelector('svg[data-lucide="no-such-icon"]')).toBeNull();
  });

  it('picks the icon of a Select choice from its form', () => {
    const { root, props } = added('@kerfjs/ui:select');
    // Open the first choice's form, as the list editor will.
    const opener = document.createElement('button');
    opener.dataset.action = 'editor-open-field';
    opener.dataset.editorOpen = JSON.stringify({ prop: 'choices', path: [0] });
    root.append(opener);
    opener.click();
    const place = `[data-editor-icon-place='{"prop":"choices","path":[0,"icon"]}']`;
    expect(root.querySelector(place)!.textContent).toContain('Not set');
    click(root, place);
    search(root, 'star');
    click(root, '[data-editor-icon="star"]');
    expect((props().choices as { icon?: unknown }[])[0]!.icon).toEqual({
      $icon: 'star',
    });
  });
});
