// KF-ECR4XG: TreeList's model, markup, and keyboard wiring, including the
// expand → move → collapse → re-render sequences a tree goes through.
import { mount, signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TreeList,
  type TreeListNode,
  treeListPath,
  treeListRows,
} from '../../src/components/collections/tree-list/tree-list.js';
import { wireTreeList } from '../../src/components/collections/tree-list/wiring/wire-tree-list.js';

const nodes: TreeListNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          { id: 'button', label: 'button.tsx' },
          { id: 'badge', label: 'badge.tsx', disabled: true },
        ],
      },
      { id: 'index', label: 'index.ts' },
    ],
  },
  { id: 'docs', label: 'docs', hasChildren: true },
  { id: 'readme', label: 'README.md' },
];

describe('treeListRows', () => {
  it('shows top-level nodes and the children of expanded ones, depth first', () => {
    expect(treeListRows(nodes, []).map((row) => row.node.id)).toEqual([
      'src',
      'docs',
      'readme',
    ]);
    const rows = treeListRows(nodes, new Set(['src', 'components']));
    expect(
      rows.map((row) => [row.node.id, row.level, row.position, row.setSize]),
    ).toEqual([
      ['src', 1, 1, 3],
      ['components', 2, 1, 2],
      ['button', 3, 1, 2],
      ['badge', 3, 2, 2],
      ['index', 2, 2, 2],
      ['docs', 1, 2, 3],
      ['readme', 1, 3, 3],
    ]);
    expect(rows[1]).toMatchObject({
      parentId: 'src',
      expandable: true,
      expanded: true,
    });
    expect(rows[0]).not.toHaveProperty('parentId');
    // A lazy node expands without rendering children it has not loaded.
    expect(
      treeListRows(nodes, ['docs']).find((row) => row.node.id === 'docs'),
    ).toMatchObject({ expandable: true, expanded: true });
    // An expanded id for a node with no children changes nothing.
    expect(treeListRows(nodes, ['readme'])[2]).toMatchObject({
      expandable: false,
      expanded: false,
    });
    // A collapsed parent hides an expanded descendant.
    expect(treeListRows(nodes, ['components'])).toHaveLength(3);
  });

  it('finds the path to a node', () => {
    expect(treeListPath(nodes, 'badge')).toEqual([
      'src',
      'components',
      'badge',
    ]);
    expect(treeListPath(nodes, 'readme')).toEqual(['readme']);
    expect(treeListPath(nodes, 'missing')).toEqual([]);
  });
});

describe('TreeList markup', () => {
  const render = (props: Partial<Parameters<typeof TreeList>[0]> = {}) => {
    const host = document.createElement('div');
    host.innerHTML = String(
      TreeList({
        id: 'files',
        label: 'Files',
        nodes,
        expanded: ['src'],
        action: 'pick',
        toggleAction: 'toggle',
        ...props,
      }),
    );
    return host.firstElementChild as HTMLElement;
  };

  it('renders an ARIA tree of ListItem treeitem rows', () => {
    const tree = render({ selected: 'index' });
    expect(tree.getAttribute('role')).toBe('tree');
    expect(tree.getAttribute('aria-label')).toBe('Files');
    expect(tree.dataset.component).toBe('tree-list');
    const rows = [...tree.querySelectorAll<HTMLElement>('[role="treeitem"]')];
    expect(rows.map((row) => row.dataset.itemId)).toEqual([
      'src',
      'components',
      'index',
      'docs',
      'readme',
    ]);
    const [src, components, index, docs, readme] = rows;
    expect(src!.className).toBe('kui-list-item');
    expect(src!.dataset.component).toBe('list-item');
    expect(src!.getAttribute('aria-expanded')).toBe('true');
    expect(components!.getAttribute('aria-expanded')).toBe('false');
    expect(components!.getAttribute('aria-level')).toBe('2');
    expect(components!.getAttribute('style')).toBe(
      '--_kui-list-item-tree-level:2',
    );
    expect(readme!.hasAttribute('aria-expanded')).toBe(false);
    expect(docs!.getAttribute('aria-posinset')).toBe('2');
    expect(docs!.getAttribute('aria-setsize')).toBe('3');
    expect(index!.getAttribute('aria-selected')).toBe('true');
    expect(src!.getAttribute('aria-selected')).toBe('false');
    // One Tab stop: the selected row.
    expect(rows.map((row) => row.tabIndex)).toEqual([-1, -1, 0, -1, -1]);
    expect(src!.dataset.action).toBe('pick');
    const arrow = src!.querySelector<HTMLElement>(
      '.kui-list-item__disclosure',
    )!;
    expect(arrow.dataset.action).toBe('toggle');
    expect(arrow.dataset.itemId).toBe('src');
    expect(arrow.getAttribute('aria-hidden')).toBe('true');
    expect(arrow.querySelector('[data-component="disclosure-arrow"]')).not.toBe(
      null,
    );
    // A leaf keeps the disclosure column but has no arrow or toggle.
    const leaf = readme!.querySelector<HTMLElement>(
      '.kui-list-item__disclosure',
    )!;
    expect(leaf.childElementCount).toBe(0);
    expect(leaf.hasAttribute('data-action')).toBe(false);
  });

  it('puts the Tab stop on a hidden selection’s visible ancestor, or the first row', () => {
    const hidden = render({ selected: 'badge', expanded: [] });
    expect(
      hidden.querySelector<HTMLElement>('[tabindex="0"]')?.dataset.itemId,
    ).toBe('src');
    const none = render();
    expect(
      none.querySelector<HTMLElement>('[tabindex="0"]')?.dataset.itemId,
    ).toBe('src');
    expect(
      String(
        TreeList({
          id: 'e',
          label: 'Empty',
          nodes: [],
          expanded: [],
          action: 'a',
          toggleAction: 't',
        }),
      ),
    ).not.toContain('treeitem');
  });

  it('keeps a disabled row focusable but without actions', () => {
    const tree = render({
      expanded: ['src', 'components'],
      density: 'compact',
    });
    const badge = tree.querySelector<HTMLElement>('[data-item-id="badge"]')!;
    expect(badge.getAttribute('aria-disabled')).toBe('true');
    expect(badge.hasAttribute('disabled')).toBe(false);
    expect(badge.hasAttribute('data-action')).toBe(false);
    expect(badge.dataset.density).toBe('compact');
  });

  it('protects its own markers among the root attributes', () => {
    const tree = render({
      rootAttributes: { 'data-key': 'outline', 'data-component': 'forged' },
      className: 'wide',
    });
    expect(tree.dataset.key).toBe('outline');
    expect(tree.dataset.component).toBe('tree-list');
    expect(tree.className).toBe('kui-tree-list wide');
  });
});

describe('wireTreeList', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.replaceChildren();
  });

  function open(initial: readonly string[] = []) {
    const root = document.createElement('div');
    document.body.append(root);
    const expanded = signal<ReadonlySet<string>>(new Set(initial));
    const selected = signal<string | undefined>(undefined);
    const picks: string[] = [];
    const dispose = mount(root, () => (
      <TreeList
        id="files"
        label="Files"
        nodes={nodes}
        expanded={expanded.value}
        selected={selected.value}
        action="pick"
        toggleAction="toggle"
      />
    ));
    const stopActions = delegateActions<HTMLElement>(root, 'click', {
      pick: (_event, target) => {
        picks.push(target.dataset.itemId!);
        selected.value = target.dataset.itemId;
      },
      toggle: (_event, target) => {
        const next = new Set(expanded.value);
        const id = target.dataset.itemId!;
        if (next.has(id)) next.delete(id);
        else next.add(id);
        expanded.value = next;
      },
    });
    const stopWire = wireTreeList(root);
    cleanup = () => {
      stopWire();
      stopActions();
      dispose();
    };
    const row = (id: string) =>
      root.querySelector<HTMLElement>(
        `[role="treeitem"][data-item-id="${id}"]`,
      )!;
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
    return { root, row, press, focused, expanded, picks };
  }

  it('moves between rows and keeps one Tab stop', () => {
    const { row, press, focused } = open(['src']);
    row('src').focus();
    press('ArrowDown');
    expect(focused()).toBe('components');
    expect(row('components').tabIndex).toBe(0);
    expect(row('src').tabIndex).toBe(-1);
    press('End');
    expect(focused()).toBe('readme');
    press('ArrowDown');
    expect(focused()).toBe('readme');
    press('Home');
    expect(focused()).toBe('src');
    press('ArrowUp');
    expect(focused()).toBe('src');
  });

  it('expands, enters, leaves, and collapses with Right and Left', () => {
    const { row, press, focused, expanded } = open();
    row('src').focus();
    press('ArrowRight');
    expect([...expanded.value]).toEqual(['src']);
    expect(focused()).toBe('src');
    press('ArrowRight');
    expect(focused()).toBe('components');
    press('ArrowRight');
    press('ArrowRight');
    expect(focused()).toBe('button');
    // A leaf ignores Right.
    press('ArrowRight');
    expect(focused()).toBe('button');
    press('ArrowLeft');
    expect(focused()).toBe('components');
    press('ArrowLeft');
    expect(expanded.value.has('components')).toBe(false);
    press('ArrowLeft');
    expect(focused()).toBe('src');
    press('ArrowLeft');
    expect(expanded.value.size).toBe(0);
    // Left at the top level with nothing to collapse stays put.
    press('ArrowLeft');
    expect(focused()).toBe('src');
    // Expanded with no visible children (a lazy node): Right stays put.
    row('docs').focus();
    press('ArrowRight');
    expect(expanded.value.has('docs')).toBe(true);
    press('ArrowRight');
    expect(focused()).toBe('docs');
  });

  it('chooses with a click, never a disabled row, and keeps focus across the re-render', () => {
    const { row, picks, focused } = open(['src', 'components']);
    row('button').focus();
    row('button').click();
    expect(picks).toEqual(['button']);
    expect(row('button').getAttribute('aria-selected')).toBe('true');
    expect(focused()).toBe('button');
    row('badge').click();
    expect(picks).toEqual(['button']);
  });

  it('jumps by typed letters, cycling on a repeated letter', () => {
    const { row, press, focused } = open(['src']);
    row('src').focus();
    press('i');
    expect(focused()).toBe('index');
    press('r', {});
    // "ir" matches nothing: focus stays.
    expect(focused()).toBe('index');
  });

  it('cycles a single letter and ignores modified and non-letter keys', () => {
    const { row, press, focused } = open(['src', 'components']);
    row('src').focus();
    // Each letter comes after the type-ahead pause, so it starts a new search.
    let now = 10_000;
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => (now += 600));
    press('b');
    expect(focused()).toBe('button');
    press('b');
    clock.mockRestore();
    expect(focused()).toBe('badge');
    expect(press('ArrowDown', { metaKey: true }).defaultPrevented).toBe(false);
    expect(focused()).toBe('badge');
    expect(press(' ').defaultPrevented).toBe(false);
    expect(press('Tab').defaultPrevented).toBe(false);
  });
});
