// KF-JY68DQ: ColumnExplorer's model, markup, and keyboard wiring, including
// open → enter → back → choose-elsewhere sequences across columns.
import { mount, raw, signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ColumnExplorer,
  explorerChosen,
  explorerColumns,
} from '../../src/components/collections/column-explorer/column-explorer.js';
import { wireColumnExplorer } from '../../src/components/collections/column-explorer/wiring/wire-column-explorer.js';
import {
  type TreeListNode,
  treeListPath,
} from '../../src/components/collections/tree-list/tree-list.js';

const nodes: TreeListNode[] = [
  {
    id: 'docs',
    label: 'Documents',
    children: [
      {
        id: 'work',
        label: 'Work',
        children: [
          { id: 'plan', label: 'plan.md' },
          { id: 'budget', label: 'budget.xlsx' },
        ],
      },
      { id: 'notes', label: 'notes.txt' },
      { id: 'locked', label: 'locked.txt', disabled: true },
    ],
  },
  { id: 'music', label: 'Music', hasChildren: true },
  { id: 'readme', label: 'README.md' },
];

describe('explorerColumns', () => {
  it('opens a column for each chosen node that can expand', () => {
    expect(explorerColumns(nodes, []).map((column) => column.level)).toEqual([
      0,
    ]);
    const columns = explorerColumns(nodes, ['docs', 'work', 'plan']);
    expect(
      columns.map((column) => [
        column.level,
        column.parent?.id,
        column.chosen,
        column.nodes.length,
      ]),
    ).toEqual([
      [0, undefined, 'docs', 3],
      [1, 'docs', 'work', 3],
      [2, 'work', 'plan', 2],
    ]);
    // A lazy node opens an empty column; a leaf opens none.
    expect(explorerColumns(nodes, ['music']).at(-1)).toMatchObject({
      level: 1,
      nodes: [],
    });
    expect(explorerColumns(nodes, ['readme'])).toHaveLength(1);
    // A path id that is not a child of the column before ends the walk.
    expect(explorerColumns(nodes, ['docs', 'plan'])).toHaveLength(2);
  });

  it('finds the node a path ends at', () => {
    expect(explorerChosen(nodes, ['docs', 'work'])?.label).toBe('Work');
    expect(explorerChosen(nodes, [])).toBeUndefined();
    expect(explorerChosen(nodes, ['docs', 'missing'])).toBeUndefined();
  });
});

describe('ColumnExplorer markup', () => {
  const render = (
    props: Partial<Parameters<typeof ColumnExplorer>[0]> = {},
  ) => {
    const host = document.createElement('div');
    host.innerHTML = String(
      ColumnExplorer({
        id: 'files',
        label: 'Files',
        nodes,
        path: ['docs', 'work'],
        action: 'choose',
        ...props,
      }),
    );
    return host.firstElementChild as HTMLElement;
  };
  const column = (explorer: HTMLElement, level: number) => [
    ...explorer.querySelectorAll<HTMLElement>(
      `.kui-list-item[data-column-explorer-level="${level}"]`,
    ),
  ];

  it('renders a labeled region of ListItem columns in a ColumnTrack', () => {
    const explorer = render({ density: 'compact', className: 'wide' });
    expect(explorer.getAttribute('role')).toBe('region');
    expect(explorer.getAttribute('aria-label')).toBe('Files');
    expect(explorer.className).toBe('kui-column-explorer wide');
    expect(explorer.querySelector('.kui-column-track')).not.toBeNull();
    const lists = [
      ...explorer.querySelectorAll('[data-column-explorer-level].kui-list'),
    ];
    expect(lists.map((list) => list.getAttribute('aria-label'))).toEqual([
      'Files',
      'Documents',
      'Work',
    ]);
    const [documents, music, readme] = column(explorer, 0);
    expect(documents!.getAttribute('aria-current')).toBe('page');
    expect(documents!.tabIndex).toBe(0);
    expect(music!.tabIndex).toBe(-1);
    expect(documents!.dataset.expandable).toBe('true');
    expect(music!.dataset.expandable).toBe('true');
    expect(readme!.dataset.expandable).toBeUndefined();
    expect(
      documents!.querySelector('[data-lucide="chevron-right"], svg'),
    ).not.toBeNull();
    expect(readme!.querySelector('.kui-list-item__trailing')).toBeNull();
    expect(documents!.dataset.density).toBe('compact');
    // Nothing chosen in the last column: its first row is the Tab stop.
    expect(column(explorer, 2).map((row) => row.tabIndex)).toEqual([0, -1]);
    expect(
      column(explorer, 1)
        .find((row) => row.dataset.itemId === 'locked')!
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('adds a preview column for a chosen leaf only', () => {
    const preview = raw('<p data-preview>plan.md, 2 KB</p>');
    const leaf = render({ path: ['docs', 'work', 'plan'], preview });
    expect(
      leaf
        .querySelector('[data-column-explorer-preview]')
        ?.getAttribute('aria-label'),
    ).toBe('plan.md preview');
    expect(leaf.querySelector('[data-preview]')).not.toBeNull();
    expect(
      render({ preview }).querySelector('[data-column-explorer-preview]'),
    ).toBeNull();
    expect(
      render({ path: ['docs', 'notes'] }).querySelector(
        '[data-column-explorer-preview]',
      ),
    ).toBeNull();
  });

  it('protects its own markers among the root attributes', () => {
    const explorer = render({
      rootAttributes: { 'data-key': 'browser', 'data-component': 'forged' },
    });
    expect(explorer.dataset.key).toBe('browser');
    expect(explorer.dataset.component).toBe('column-explorer');
  });
});

describe('wireColumnExplorer', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  function open(initial: readonly string[] = []) {
    const root = document.createElement('div');
    document.body.append(root);
    const path = signal<readonly string[]>(initial);
    const dispose = mount(root, () => (
      <ColumnExplorer
        id="files"
        label="Files"
        nodes={nodes}
        path={path.value}
        action="choose"
      />
    ));
    const stopActions = delegateActions<HTMLElement>(root, 'click', {
      choose: (_event, row) => {
        path.value = treeListPath(nodes, row.dataset.itemId!);
      },
    });
    const stopWire = wireColumnExplorer(root);
    cleanup = () => {
      stopWire();
      stopActions();
      dispose();
    };
    const row = (id: string) =>
      root.querySelector<HTMLElement>(`[data-item-id="${id}"]`)!;
    const press = (key: string, init: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      (document.activeElement as HTMLElement).dispatchEvent(event);
      return event;
    };
    const focused = () =>
      (document.activeElement as HTMLElement).dataset.itemId;
    return { root, row, press, focused, path };
  }

  it('moves within a column and keeps one Tab stop per column', () => {
    const { row, press, focused } = open();
    row('docs').focus();
    press('ArrowDown');
    expect(focused()).toBe('music');
    expect(row('music').tabIndex).toBe(0);
    expect(row('docs').tabIndex).toBe(-1);
    press('End');
    expect(focused()).toBe('readme');
    press('ArrowDown');
    expect(focused()).toBe('readme');
    press('Home');
    expect(focused()).toBe('docs');
    press('ArrowUp');
    expect(focused()).toBe('docs');
  });

  it('opens, enters, returns, and chooses elsewhere across columns', () => {
    const { row, press, focused, path } = open();
    row('docs').focus();
    press('ArrowRight');
    expect(path.value).toEqual(['docs']);
    expect(focused()).toBe('work');
    press('ArrowRight');
    expect(path.value).toEqual(['docs', 'work']);
    expect(focused()).toBe('plan');
    // A leaf opens nothing.
    press('ArrowRight');
    expect(focused()).toBe('plan');
    press('ArrowLeft');
    expect(focused()).toBe('work');
    press('ArrowLeft');
    expect(focused()).toBe('docs');
    // Right on an already-chosen row moves in without choosing again.
    press('ArrowRight');
    expect(path.value).toEqual(['docs', 'work']);
    expect(focused()).toBe('work');
    // Choosing a sibling closes the deeper column.
    press('ArrowDown');
    row('notes').click();
    expect(path.value).toEqual(['docs', 'notes']);
    expect(row('plan')).toBeNull();
    // Left from the top column stays put.
    row('docs').focus();
    press('ArrowLeft');
    expect(focused()).toBe('docs');
    // A lazy node opens an empty column: nothing to move into.
    row('music').focus();
    press('ArrowRight');
    expect(path.value).toEqual(['music']);
    expect(focused()).toBe('music');
  });

  it('starts at the deepest column and reveals the column a choice opens', async () => {
    const scrolled: number[] = [];
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
      configurable: true,
      set(value: number) {
        if (this.classList.contains('kui-column-track')) scrolled.push(value);
      },
      get: () => 0,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        return (
          this.querySelectorAll('[data-column-explorer-level].kui-list')
            .length * 100
        );
      },
    });
    const { row, path } = open(['docs']);
    // The explorer's track starts scrolled to its last (third) column.
    expect(scrolled[0]).toBe(200);
    row('work').click();
    expect(path.value).toEqual(['docs', 'work']);
    await new Promise((done) => window.requestAnimationFrame(done));
    expect(scrolled.at(-1)).toBe(300);
    delete (HTMLElement.prototype as { scrollLeft?: number }).scrollLeft;
    delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
  });

  it('finds rows by typed letters within a column and ignores other keys', () => {
    const { row, press, focused } = open(['docs']);
    row('work').focus();
    let now = 10_000;
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => (now += 600));
    press('n');
    expect(focused()).toBe('notes');
    clock.mockImplementation(() => now);
    press('x');
    expect(focused()).toBe('notes');
    clock.mockRestore();
    expect(press('ArrowDown', { altKey: true }).defaultPrevented).toBe(false);
    expect(press(' ').defaultPrevented).toBe(false);
    expect(press('Tab').defaultPrevented).toBe(false);
  });
});
