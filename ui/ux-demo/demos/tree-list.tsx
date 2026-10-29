import { Badge } from '@kerfjs/ui/badge';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import {
  moveTreeListNode,
  TreeList,
  type TreeListNode,
  treeListPath,
} from '@kerfjs/ui/tree-list';
import {
  treeListExternalDrop,
  type TreeListMove,
  wireTreeList,
} from '@kerfjs/ui/wire-tree-list';
import { signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { File, FileCode, Folder, Plus } from 'lucide';

const PICK = 'tree-list-demo-pick';
/** The source id the "New node" drag carries. */
const NEW_NODE = 'tree-list-demo-new';
const TOGGLE = 'tree-list-demo-toggle';

const folder = <LucideIcon icon={Folder} name="folder" />;
const code = <LucideIcon icon={FileCode} name="file-code" />;
const file = <LucideIcon icon={File} name="file" />;

/** The children a lazy folder loads the first time it opens. */
const LAZY: Record<string, readonly TreeListNode[]> = {
  docs: [
    { id: 'docs-guide', label: 'guide.md', icon: file },
    { id: 'docs-api', label: 'api.md', icon: file },
  ],
};

const INITIAL_EXPANDED: Record<string, readonly string[]> = {
  files: ['src', 'components'],
  outline: ['pane', 'toolbar', 'folders'],
};
const expanded = signal<Record<string, ReadonlySet<string>>>(
  Object.fromEntries(
    Object.entries(INITIAL_EXPANDED).map(([id, ids]) => [id, new Set(ids)]),
  ),
);
const selected = signal<Record<string, string>>({ files: 'button' });
const loaded = signal<ReadonlySet<string>>(new Set());
/** How many nodes the outline's "New node" source has added. */
const added = signal(0);

/** A new outline node, numbered by how many have been added. */
function newNode(): TreeListNode {
  added.value += 1;
  return {
    id: `new-${added.value}`,
    label: `Badge ${added.value}`,
    description: 'new',
    draggable: true,
  };
}

export function resetTreeListDemo(): void {
  expanded.value = Object.fromEntries(
    Object.entries(INITIAL_EXPANDED).map(([id, ids]) => [id, new Set(ids)]),
  );
  selected.value = { files: 'button' };
  loaded.value = new Set();
  outline.value = OUTLINE;
  added.value = 0;
}

/** Chooses rows, opens and closes folders (loading a lazy one), and wires keys. */
export function wireTreeListDemo(canvas: HTMLElement): () => void {
  const treeOf = (target: HTMLElement) =>
    target.closest<HTMLElement>('[data-tree-list-id]')!.dataset.treeListId!;
  const stopActions = delegateActions<HTMLElement>(canvas, 'click', {
    // Choosing "New node" (the keyboard path) adds it at the root's end.
    [NEW_NODE]: () => {
      outline.value = moveTreeListNode([...outline.value, newNode()], {
        sourceId: `new-${added.value}`,
        target: { id: 'pane', position: 'inside' },
      });
    },
    [PICK]: (_event, target) => {
      selected.value = {
        ...selected.value,
        [treeOf(target)]: target.dataset.itemId!,
      };
    },
    [TOGGLE]: (_event, target) => {
      const tree = treeOf(target);
      const id = target.dataset.itemId!;
      const next = new Set(expanded.value[tree]);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        if (id in LAZY) loaded.value = new Set([...loaded.value, id]);
      }
      expanded.value = { ...expanded.value, [tree]: next };
    },
  });
  // Rows land beside any row but the root, and inside a container (a node
  // with children); the root stays the root.
  const canDrop = ({ target }: TreeListMove) => {
    const node = find(outline.value, target.id);
    return target.position === 'inside'
      ? Boolean(node?.children)
      : treeListPath(outline.value, target.id).length > 1;
  };
  const stopKeys = wireTreeList(canvas, {
    canDrop,
    onMove: (move) => {
      outline.value = moveTreeListNode(outline.value, move);
    },
  });
  const stopNew = wireNewNode();
  return () => {
    stopActions();
    stopKeys();
    stopNew();
  };

  /**
   * The "New node" source: the application's own pointer drag, which drops
   * on the outline's rows through `treeListExternalDrop` with the tree's
   * indicator (KF-7KV6H4).
   */
  function wireNewNode(): () => void {
    const outlineDrop = treeListExternalDrop(canvas, { canDrop });
    let press: { pointer: number; move?: TreeListMove } | undefined;
    const end = () => {
      press = undefined;
      outlineDrop.clear();
    };
    const down = (event: PointerEvent) => {
      if (
        event.button !== 0 ||
        !(event.target as Element).closest('[data-tree-list-demo-new]')
      )
        return;
      event.preventDefault();
      press = { pointer: event.pointerId };
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== press?.pointer) return;
      const hit = canvas.ownerDocument.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      press.move = outlineDrop.over(hit, event.clientY, NEW_NODE);
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== press?.pointer) return;
      const landed = press.move;
      end();
      if (!landed) return;
      const node = newNode();
      // Placed at the top level first, the new node moves where it landed.
      outline.value = moveTreeListNode([...outline.value, node], {
        ...landed,
        sourceId: node.id,
      });
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && press) end();
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('keydown', key);
    return () => {
      end();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', end);
      canvas.removeEventListener('keydown', key);
    };
  }
}

/** The node with `id` in a tree. */
function find(
  nodes: readonly TreeListNode[],
  id: string,
): TreeListNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const below = node.children && find(node.children, id);
    if (below) return below;
  }
  return undefined;
}

function files(): TreeListNode[] {
  return [
    {
      id: 'src',
      label: 'src',
      icon: folder,
      children: [
        {
          id: 'components',
          label: 'components',
          icon: folder,
          trailing: <Badge>3</Badge>,
          children: [
            { id: 'button', label: 'button.tsx', icon: code },
            { id: 'list-item', label: 'list-item.tsx', icon: code },
            {
              id: 'legacy',
              label: 'legacy.tsx',
              description: 'Read-only',
              icon: code,
              disabled: true,
            },
          ],
        },
        { id: 'index', label: 'index.ts', icon: code },
      ],
    },
    loaded.value.has('docs')
      ? { id: 'docs', label: 'docs', icon: folder, children: LAZY.docs }
      : { id: 'docs', label: 'docs', icon: folder, hasChildren: true },
    { id: 'readme', label: 'README.md', icon: file },
  ];
}

/** The outline's nodes; every node but the root drags. */
const OUTLINE: TreeListNode[] = [
  {
    id: 'pane',
    label: 'Pane',
    description: 'Root',
    children: [
      {
        id: 'toolbar',
        label: 'Toolbar',
        description: 'header',
        draggable: true,
        children: [
          {
            id: 'title',
            label: 'ToolbarText',
            description: 'leading',
            draggable: true,
          },
          {
            id: 'compose',
            label: 'composeButton',
            description: 'trailing',
            draggable: true,
          },
        ],
      },
      {
        id: 'folders',
        label: 'folderList',
        description: 'content',
        draggable: true,
        children: [],
      },
    ],
  },
];
const outline = signal<readonly TreeListNode[]>(OUTLINE);

export function TreeListDemo() {
  const open = expanded.value;
  const chosen = selected.value;
  return (
    <CatalogExampleStack
      label="TreeList Variants"
      rootAttributes={{ 'data-demo': 'tree-list' }}
    >
      <CatalogExample
        label="Files"
        note="Click a row to choose it and its arrow to open or close it. With the keyboard: Up and Down move, Right opens or enters a folder, Left closes it or returns to its parent, Home and End jump, and typing a name finds it. docs loads its children the first time it opens; legacy.tsx is disabled but still reachable."
        viewport={{ width: 'compact' }}
      >
        <TreeList
          id="files"
          label="Files"
          nodes={files()}
          expanded={open.files ?? new Set()}
          selected={chosen.files}
          action={PICK}
          toggleAction={TOGGLE}
        />
      </CatalogExample>
      <CatalogExample
        label="Compact Outline"
        note={`density="compact" with two-line rows, as in an editor's document outline. Drag a row before or after another, or into Toolbar or folderList. Drag "New node" onto the outline to add one there: an application's own pointer drag from outside the tree drops through treeListExternalDrop, with the tree's indicator.`}
        viewport={{ width: 'compact' }}
      >
        <List>
          <ListItem
            label="New node"
            description="Drag onto the outline, or choose to add at the end"
            icon={<LucideIcon icon={Plus} name="plus" />}
            action={NEW_NODE}
            rootAttributes={{ 'data-tree-list-demo-new': '' }}
          />
        </List>
        <TreeList
          id="outline"
          label="Document outline"
          nodes={outline.value}
          expanded={open.outline ?? new Set()}
          selected={chosen.outline}
          action={PICK}
          toggleAction={TOGGLE}
          density="compact"
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
