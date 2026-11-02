// KF-KQ72TW: non-blocking hints (a nested whole-screen layout with no
// height) list under Problems apart from problems and never block export.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { createEditor } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const STACK = '01JB8Z1M6Q8E1X9V4S7K2R3T8B';
const stack = {
  id: STACK,
  type: '@kerfjs/ui:nav-stack',
  props: {
    id: 'stack',
    label: 'Stack',
    views: [{ key: 'one', content: { $slot: 'oneContent' } }],
  },
};
const pane = (content: object[]) =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Hints',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T8A',
      type: '@kerfjs/ui:pane',
      zones: { content },
    },
  }) as unknown as ViewDocument;

function open(document: ViewDocument) {
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const editor = createEditor({ document });
  mount(root, editor.render);
  cleanup = editor.wire(root);
  return { root, editor };
}

const strip = 'editor-document-areas';
const problemsTab = (root: HTMLElement) =>
  root.querySelector<HTMLElement>(
    `[role="tab"][data-tab-id="${strip}-problems"]`,
  )!;
const panel = (root: HTMLElement) =>
  root.querySelector<HTMLElement>(`#${strip}-problems-panel`)!;
const badge = (root: HTMLElement) =>
  problemsTab(root)
    .closest('[role="presentation"], .kui-tab-bar-item')
    ?.querySelector<HTMLElement>('.kui-badge');

describe('editor hints', () => {
  it('lists a nested layout with no height as a hint, by component name', () => {
    const { root, editor } = open(pane([stack]));
    problemsTab(root).click();
    const hints = panel(root).querySelector('[data-editor-hints]')!;
    expect(hints.textContent).toContain('Hints');
    expect(hints.textContent).toContain(
      'NavStack has no height of its own here and collapses to its bar; wrap it in SizedRegion',
    );
    expect(hints.textContent).toContain('KUI-H001');
    // A hint is not a problem: no danger count, nothing blocked.
    expect(badge(root)?.dataset.tone).not.toBe('danger');
    expect(badge(root)?.textContent).toBe('1');
    const compare = root.querySelector<HTMLElement>(
      '[data-file-picker-id="compare-module"]',
    )!;
    expect(compare).not.toBeNull();
    expect(
      compare.matches(
        ':disabled, [disabled], [aria-disabled="true"], [data-disabled="true"]',
      ),
    ).toBe(false);
    // Its row selects the node it is about.
    hints
      .querySelector<HTMLElement>('[data-action="editor-select-problem"]')!
      .click();
    expect(editor.selection.value).toEqual({ kind: 'node', id: STACK });
  });

  it('shows no hint once a SizedRegion holds the layout', () => {
    const { root } = open(
      pane([
        {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3T8C',
          type: '@kerfjs/ui:sized-region',
          zones: { children: [stack] },
        },
      ]),
    );
    problemsTab(root).click();
    expect(panel(root).querySelector('[data-editor-hints]')).toBeNull();
    expect(panel(root).textContent).toContain('No problems');
    expect(badge(root)).toBeFalsy();
  });
});
