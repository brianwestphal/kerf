import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ColumnExplorer } from '@kerfjs/ui/column-explorer';
import { px } from '@kerfjs/ui/css-values';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { type TreeListNode, treeListPath } from '@kerfjs/ui/tree-list';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { wireColumnExplorer } from '@kerfjs/ui/wire-column-explorer';
import { signal } from 'kerfjs';
import { delegateActions } from 'kerfjs/actions';
import { File, FileCode, Folder, Music } from 'lucide';

const CHOOSE = 'column-explorer-demo-choose';

const folder = <LucideIcon icon={Folder} name="folder" />;
const code = <LucideIcon icon={FileCode} name="file-code" />;
const file = <LucideIcon icon={File} name="file" />;

/** File sizes the preview column shows, by id. */
const SIZES: Record<string, string> = {
  'button-tsx': '4 KB',
  'list-item-tsx': '9 KB',
  'readme-md': '2 KB',
  'notes-md': '1 KB',
};

const NODES: TreeListNode[] = [
  {
    id: 'src',
    label: 'src',
    icon: folder,
    children: [
      {
        id: 'components',
        label: 'components',
        icon: folder,
        children: [
          { id: 'button-tsx', label: 'button.tsx', icon: code },
          { id: 'list-item-tsx', label: 'list-item.tsx', icon: code },
          {
            id: 'legacy-tsx',
            label: 'legacy.tsx',
            description: 'Read-only',
            icon: code,
            disabled: true,
          },
        ],
      },
      { id: 'notes-md', label: 'notes.md', icon: file },
    ],
  },
  {
    id: 'music',
    label: 'Music',
    icon: <LucideIcon icon={Music} name="music" />,
    hasChildren: true,
  },
  { id: 'readme-md', label: 'README.md', icon: file },
];

const INITIAL: Record<string, readonly string[]> = {
  files: ['src', 'components', 'button-tsx'],
  phone: ['src'],
};
const paths = signal<Record<string, readonly string[]>>({ ...INITIAL });

export function resetColumnExplorerDemo(): void {
  paths.value = { ...INITIAL };
}

/** Chooses rows and wires the keyboard and column reveal. */
export function wireColumnExplorerDemo(canvas: HTMLElement): () => void {
  const stopActions = delegateActions<HTMLElement>(canvas, 'click', {
    [CHOOSE]: (_event, row) => {
      const explorer = row.closest<HTMLElement>('[data-column-explorer-id]')!
        .dataset.columnExplorerId!;
      paths.value = {
        ...paths.value,
        [explorer]: treeListPath(NODES, row.dataset.itemId!),
      };
    },
  });
  const stopKeys = wireColumnExplorer(canvas);
  return () => {
    stopActions();
    stopKeys();
  };
}

function preview(path: readonly string[]) {
  const id = path.at(-1) ?? '';
  return (
    <ValueTable label="File details" density="compact">
      <ValueTableRow label="Name" value={id.replace(/-(\w+)$/, '.$1')} />
      <ValueTableRow label="Size" value={SIZES[id] ?? '—'} />
    </ValueTable>
  );
}

export function ColumnExplorerDemo() {
  const current = paths.value;
  return (
    <CatalogExampleStack
      label="ColumnExplorer Variants"
      rootAttributes={{ 'data-demo': 'column-explorer' }}
    >
      <CatalogExample
        label="Files"
        note="Choose a folder to open its column and a file to preview it. With the keyboard: Up and Down move in a column, Right opens a folder and moves into it, Left returns, Home and End jump, and typing a name finds it. Music loads on demand; legacy.tsx is disabled."
        viewport={{ height: 'medium', frame: 'solid' }}
      >
        <ColumnExplorer
          id="files"
          label="Files"
          nodes={NODES}
          path={current.files ?? []}
          action={CHOOSE}
          minColumnWidth={px(200)}
          preview={preview(current.files ?? [])}
        />
      </CatalogExample>
      <CatalogExample
        label="Paged on a Phone"
        note='layout="paged" shows one column per page with the next peeking in; choosing a folder pages to its column.'
        viewport={{ height: 'medium', width: 'compact', frame: 'solid' }}
      >
        <ColumnExplorer
          id="phone"
          label="Files on a phone"
          nodes={NODES}
          path={current.phone ?? []}
          action={CHOOSE}
          layout="paged"
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
