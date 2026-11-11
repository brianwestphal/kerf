// KF-BGKYYH: a ScrollEffect's `effects`, a list of a discriminated union,
// edits item by item in the type-driven list editor: Add ▾ offers each
// preset, rows reorder and remove, and an item's Kind switches its preset,
// keeping the range fields the two share.
import type { ViewType } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import propsJson from '../../../ai/component-props.json';
import { valueFromControl } from '../../../src/editor/model/controls.js';
import { findNode } from '../../../src/editor/model/document.js';
import { setProp } from '../../../src/editor/model/edits.js';
import {
  listMembers,
  memberSwitchField,
} from '../../../src/editor/model/fields.js';
import { loadScaledTimeout } from '../../helpers/load-scaled-timeout.js';
import { field } from './editing-harness.js';
import { createEditor } from './kerf-catalog.js';

const definitions = propsJson.definitions as unknown as Record<
  string,
  ViewType
>;
const spec = { kind: 'ref', ref: 'ScrollEffectSpec' } as ViewType;

describe('the effects list model', () => {
  it('offers each preset and switches between them by kind', () => {
    expect(
      listMembers({ kind: 'array', items: spec } as ViewType, definitions).map(
        (member) => member.label,
      ),
    ).toEqual(['Parallax', 'Reveal', 'Fade', 'Scale', 'Dim']);
    expect(memberSwitchField(spec, definitions)).toBe('kind');
    expect(
      memberSwitchField({ kind: 'ref', ref: 'PopupMenuEntry' }, definitions),
    ).toBe('kind');
    // Not a discriminated union of objects.
    expect(memberSwitchField({ kind: 'string' }, definitions)).toBeUndefined();
    expect(
      memberSwitchField(
        {
          kind: 'union',
          members: [{ kind: 'string' }, { kind: 'number' }],
          discriminant: ['kind'],
        } as ViewType,
        definitions,
      ),
    ).toBeUndefined();
  });

  it('keeps shared fields but never the old kind when switching', () => {
    // Option #3 is Scale (Parallax, Reveal, Fade, Scale, Dim).
    const result = valueFromControl('choice', '#3', undefined, {
      type: spec,
      definitions,
      current: { kind: 'fade', range: 'exit', rangeEnd: 80 },
    });
    expect(result).toEqual({
      value: { kind: 'scale', range: 'exit', rangeEnd: 80 },
    });
    // A field the new preset lacks (parallax's `lag`) is dropped.
    expect(
      valueFromControl('choice', '#1', undefined, {
        type: spec,
        definitions,
        current: { kind: 'parallax', lag: 0.5 },
      }),
    ).toEqual({ value: { kind: 'reveal' } });
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

function type(host: HTMLElement, value: string) {
  const input = host.querySelector<HTMLInputElement>('input, textarea')!;
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const place = (prop: string, path: unknown[]) => JSON.stringify({ prop, path });

/** An editor with a new ScrollEffect added to the inbox Pane, selected. */
function addedScrollEffect() {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor();
  const stopMount = mount(root, editor.render);
  const unwireEditor = editor.wire(root);
  cleanup = () => {
    unwireEditor();
    stopMount();
  };
  editor.selection.value = { kind: 'node', id: PANE };
  choose(field(root, '[data-editor-add="zone"]'), 'content');
  choose(
    field(root, '[data-editor-add="component"]'),
    '@kerfjs/ui:scroll-effect',
  );
  field(root, '[data-action="editor-add-child"]').click();
  const { id } = editor.selection.value as { id: string };
  const effects = () =>
    findNode(editor.document.value, id)!.node.props!.effects as Record<
      string,
      unknown
    >[];
  return { root, editor, id, effects };
}

const rows = (root: HTMLElement) =>
  [
    ...root.querySelectorAll<HTMLElement>(
      `[data-list-id='${place('effects', [])}'] [data-component="list-action-row"]`,
    ),
  ].map((row) => row.querySelector('[data-action]')!.textContent!.trim());

function open(root: HTMLElement, path: unknown[] = []) {
  const row = field(root, `[data-editor-open='${place('effects', path)}']`);
  (row.querySelector<HTMLElement>('[data-action]') ?? row).click();
}

describe(
  'editing ScrollEffect effects (KF-BGKYYH)',
  { timeout: loadScaledTimeout(15_000) },
  () => {
    it('builds reveal on entry and fade on exit without JSON', () => {
      const { root, effects } = addedScrollEffect();
      open(root);
      expect(
        (field(root, '#editor-field-dialog') as HTMLDialogElement).open,
      ).toBe(true);
      // Start from nothing: remove every seeded effect.
      while (effects()?.length)
        field(root, `[data-editor-item='${place('effects', [0])}']`).click();
      const add = (label: string) => {
        const menu = [
          ...root.querySelectorAll<HTMLElement>(
            '[data-action="editor-add-item"][data-editor-member]',
          ),
        ];
        const member = menu.find((item) => item.textContent!.trim() === label);
        member!.click();
      };
      add('Reveal');
      add('Fade');
      add('Dim');
      expect(effects().map((effect) => effect.kind)).toEqual([
        'reveal',
        'fade',
        'dim',
      ]);
      expect(rows(root)).toEqual([
        expect.stringContaining('Reveal'),
        expect.stringContaining('Fade'),
        expect.stringContaining('Dim'),
      ]);
      // Remove the dim; reorder fade above reveal and back.
      field(root, `[data-editor-item='${place('effects', [2])}']`).click();
      const first = field(
        root,
        `[data-list-id='${place('effects', [])}'] [data-item-id="item-0"]`,
      );
      first.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      );
      expect(effects().map((effect) => effect.kind)).toEqual([
        'fade',
        'reveal',
      ]);
      // Switch the first to reveal and the second to fade from their forms.
      open(root, [0]);
      const kind = (index: number) =>
        root.querySelector<HTMLElement>(
          `[data-editor-field='${place('effects', [index])}'][data-editor-kind="choice"]`,
        )!;
      // The fixed kind row gives way to the Select.
      expect(kind(0).textContent).toContain('Kind');
      type(
        field(
          root,
          `[data-editor-field='${place('effects', [0, 'rangeEnd'])}']`,
        ),
        '60',
      );
      choose(kind(0), '#1');
      choose(
        field(root, `[data-editor-field='${place('effects', [0, 'range'])}']`),
        'entry',
      );
      field(root, '[data-action="editor-field-back"]').click();
      open(root, [1]);
      choose(kind(1), '#2');
      choose(
        field(root, `[data-editor-field='${place('effects', [1, 'range'])}']`),
        'exit',
      );
      expect(effects()).toEqual([
        { kind: 'reveal', range: 'entry', rangeEnd: 60 },
        { kind: 'fade', range: 'exit' },
      ]);
      // A preset's own option appears once it is that preset.
      choose(kind(1), '#3');
      expect(effects()[1]).toEqual({ kind: 'scale', range: 'exit' });
      type(
        field(root, `[data-editor-field='${place('effects', [1, 'from'])}']`),
        '0.96',
      );
      expect(effects()[1]).toEqual({
        kind: 'scale',
        range: 'exit',
        from: 0.96,
      });
      // The canvas renders the effects.
      expect(
        root.querySelectorAll('[data-editor-canvas] [data-kui-scroll-effect]')
          .length,
      ).toBeGreaterThan(0);
      // Choosing the kind it already has changes nothing.
      choose(kind(1), '#3');
      expect(effects()[1]).toEqual({
        kind: 'scale',
        range: 'exit',
        from: 0.96,
      });
    });

    it('shows a bound option as its binding, beside the Kind switch', () => {
      const { root, editor, id, effects } = addedScrollEffect();
      editor.document.value = setProp(editor.document.value, id, 'effects', [
        { kind: 'fade', rangeEnd: { $param: 'fadeEnd' } },
      ] as never);
      open(root);
      open(root, [0]);
      const dialog = field(root, '#editor-field-dialog');
      expect(
        dialog.querySelector(
          `[data-editor-field='${place('effects', [0])}'][data-editor-kind="choice"]`,
        ),
      ).not.toBeNull();
      // A bound field reads as its source (KF-3QEZFB: nested params).
      expect(dialog.textContent).toContain('Param fadeEnd');
      expect(effects()).toHaveLength(1);
    });
  },
);
