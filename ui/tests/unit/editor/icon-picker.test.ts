// KF-VYRDDQ: icon data picks a Lucide icon in a searchable dialog that
// writes `{ $icon: name }`, at the top level and inside an object form.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import { lucideExportName } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { icons } from 'lucide';
import { afterEach, describe, expect, it } from 'vitest';

import { controlFor } from '../../../src/editor/model/controls.js';
import { findNode } from '../../../src/editor/model/document.js';
import { setProp } from '../../../src/editor/model/edits.js';
import {
  followingIconName,
  ICON_RESULTS,
  iconAliases,
  iconNameEdit,
  iconNames,
  lucideIconName,
  matchIcons,
} from '../../../src/editor/model/icons.js';
import { loadScaledTimeout } from '../../helpers/load-scaled-timeout.js';
import { createEditor } from './kerf-catalog.js';

const require = createRequire(import.meta.url);

describe('icon names and search', () => {
  it('names a Lucide export by a name that round-trips to it', () => {
    expect(lucideIconName('ChevronRight')).toBe('chevron-right');
    expect(lucideIconName('ArrowDown01')).toBe('arrow-down-0-1');
    expect(lucideIconName('ArrowDownAZ')).toBe('arrow-down-a-z');
    expect(lucideIconName('Axis3D')).toBe('axis-3-d');
    expect(lucideIconName('CalendarX2')).toBe('calendar-x-2');
    // A name that does not split back the same way keeps its own spelling.
    expect(lucideIconName('aB')).toBe('aB');
  });

  // KF-NTK7YW: one tile per icon, under Lucide's own name. The installed
  // lucide's iconsAndAliases.mjs exports each icon from
  // `./icons/<canonical-name>.mjs`, so the names must be exactly those; a
  // lucide bump that changes them fails here until the table is synced.
  it('offers each icon once, by its canonical Lucide name', () => {
    const lucide = dirname(require.resolve('lucide/package.json'));
    const canonical = [
      ...readFileSync(
        resolve(lucide, 'dist/esm/iconsAndAliases.mjs'),
        'utf8',
      ).matchAll(/from '\.\/icons\/([\w-]+)\.mjs'/g),
    ].map(([, file]) => file!);
    const names = iconNames(icons);
    expect(names).toEqual([...canonical].sort());
    expect(
      new Set(names.map((name) => icons[lucideExportName(name) as never])),
    ).toHaveProperty('size', names.length);
    expect(names).toContain('arrow-down-a-z');
    expect(names).not.toContain('arrow-down-az');
    expect(names).toContain('circle-alert');
    expect(names).not.toContain('alert-circle');
  });

  // KF-NTK7YW: an alias still finds its icon, which keeps its own name.
  it('finds an icon by its aliases, best match first', () => {
    const aliases = iconAliases(icons);
    expect(aliases.get('funnel')).toContain('filter');
    expect(aliases.get('trash')).toContain('trash-2');
    expect(aliases.get('arrow-down-a-z')).toEqual(['arrow-down-az']);
    const names = iconNames(icons);
    expect(matchIcons(names, 'filter', 3, aliases).names[0]).toBe('funnel');
    expect(matchIcons(names, 'trash 2', 3, aliases).names[0]).toBe('trash');
    expect(matchIcons(names, 'trash 2').names).not.toContain('trash');
    // An alias of an icon this lucide does not have is left out.
    expect(iconAliases({ ArrowDownAz: {} }).size).toBe(0);
  });

  it('names an alias a newer lucide adds once, by the icon first named', () => {
    const icon = {};
    expect(iconNames({ ZebraNew: icon, ZebraOld: icon })).toEqual([
      'zebra-new',
    ]);
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

// Each search re-renders the whole editor with a grid of icons, which runs
// past vitest's default timeout when the suite runs in parallel.
describe(
  'the icon picker (KF-VYRDDQ)',
  { timeout: loadScaledTimeout(15_000) },
  () => {
    it('shows a LucideIcon’s icon as a row, picks another, and removes it', () => {
      const { root, props } = added('@kerfjs/ui:lucide-icon');
      const row = root.querySelector<HTMLElement>(
        `[data-editor-icon-place='{"prop":"icon","path":[]}']`,
      )!;
      expect(row.textContent).toContain('circle');
      expect(root.querySelector('[data-editor-prop="icon"]')).toBeNull();
      click(root, `[data-editor-icon-place='{"prop":"icon","path":[]}']`);
      expect(dialog(root).open).toBe(true);
      // KF-GQHRC0: the search takes focus, so typing searches at once.
      expect(document.activeElement).toBe(
        root.querySelector('[data-editor-icon-search]'),
      );
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
        [
          ...dialog(root).querySelectorAll<HTMLElement>('[data-editor-icon]'),
        ].map((button) => button.dataset.editorIcon),
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

    it('names a LucideIcon after its icon until the author names it (KF-DQFXWG)', () => {
      const { root, editor, id, props } = added('@kerfjs/ui:lucide-icon');
      // Seeded with its icon's name, and the icon row comes before it.
      expect(props()).toMatchObject({
        icon: { $icon: 'circle' },
        name: 'circle',
      });
      const icon = root.querySelector(
        `[data-editor-icon-place='{"prop":"icon","path":[]}']`,
      )!;
      const name = root.querySelector('[data-editor-prop="name"]')!;
      expect(
        icon.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      // The ref name and the icon's name prop read differently.
      expect(root.querySelector('[data-editor-name]')!.textContent).toContain(
        'Ref name',
      );
      const pick = (glyph: string) => {
        click(root, `[data-editor-icon-place='{"prop":"icon","path":[]}']`);
        search(root, glyph);
        click(root, `[data-editor-icon="${glyph}"]`);
        dialog(root).dispatchEvent(new Event('close'));
      };
      pick('plus');
      expect(props()).toMatchObject({ icon: { $icon: 'plus' }, name: 'plus' });
      // One undo restores both.
      click(root, '[data-action="editor-undo"]');
      expect(props()).toMatchObject({
        icon: { $icon: 'circle' },
        name: 'circle',
      });
      editor.document.value = setProp(editor.document.value, id, 'name', 'add');
      pick('star');
      expect(props()).toMatchObject({ icon: { $icon: 'star' }, name: 'add' });
    });

    it('picks iconName, else name, beside an icon (KF-3J47BY)', () => {
      expect(
        iconNameEdit(['label'], {}, undefined, 'star', 'X'),
      ).toBeUndefined();
      expect(
        iconNameEdit(['name', 'iconName'], {}, undefined, 'star', 'X'),
      ).toEqual({ key: 'iconName', value: 'star' });
      expect(iconNameEdit(['name'], undefined, undefined, 'star', 'X')).toEqual(
        {
          key: 'name',
          value: 'star',
        },
      );
      expect(
        iconNameEdit(['name'], { name: 'mine' }, 'bell', 'star', 'X'),
      ).toBeUndefined();
    });

    it('follows an icon only while the name does', () => {
      expect(
        followingIconName(undefined, undefined, 'plus', 'LucideIcon'),
      ).toBe('plus');
      expect(followingIconName('circle', 'circle', 'plus', 'LucideIcon')).toBe(
        'plus',
      );
      expect(
        followingIconName('LucideIcon', 'circle', 'plus', 'LucideIcon'),
      ).toBe('plus');
      expect(
        followingIconName('add', 'circle', 'plus', 'LucideIcon'),
      ).toBeUndefined();
      expect(
        followingIconName('plus', 'circle', 'plus', 'LucideIcon'),
      ).toBeUndefined();
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
      const { root, props, editor, id } = added('@kerfjs/ui:select');
      // Open the first choice's form, as the list editor will.
      const opener = document.createElement('button');
      opener.dataset.action = 'editor-open-field';
      opener.dataset.editorOpen = JSON.stringify({
        prop: 'choices',
        path: [0],
      });
      root.append(opener);
      opener.click();
      const place = `[data-editor-icon-place='{"prop":"choices","path":[0,"icon"]}']`;
      expect(root.querySelector(place)!.textContent).toContain('Not set');
      // KF-3J47BY: the Icon row sits in field order, after Label and before
      // Icon name.
      const field = (name: string) =>
        root.querySelector(
          `[data-editor-field='{"prop":"choices","path":[0,"${name}"]}']`,
        )!;
      const follows = (a: Element, b: Element) =>
        Boolean(
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      expect(follows(field('label'), root.querySelector(place)!)).toBe(true);
      expect(follows(root.querySelector(place)!, field('iconName'))).toBe(true);
      click(root, place);
      search(root, 'star');
      click(root, '[data-editor-icon="star"]');
      const choice = () =>
        (props().choices as { icon?: unknown; iconName?: string }[])[0]!;
      // Its iconName follows the icon, until the author names it.
      expect(choice()).toMatchObject({
        icon: { $icon: 'star' },
        iconName: 'star',
      });
      dialog(root).dispatchEvent(new Event('close'));
      click(root, place);
      search(root, 'bell');
      click(root, '[data-editor-icon="bell"]');
      expect(choice().iconName).toBe('bell');
      editor.document.value = setProp(editor.document.value, id, 'choices', [
        { ...choice(), iconName: 'alarm' },
        ...(props().choices as unknown[]).slice(1),
      ] as never);
      dialog(root).dispatchEvent(new Event('close'));
      click(root, place);
      search(root, 'star');
      click(root, '[data-editor-icon="star"]');
      expect(choice()).toMatchObject({
        icon: { $icon: 'star' },
        iconName: 'alarm',
      });
    });
  },
);
