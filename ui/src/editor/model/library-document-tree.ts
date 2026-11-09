import type { TreeListNode } from '../../components/collections/tree-list/model/tree-rows.js';
import { documentName } from './insert-view.js';

export const documentFolderId = (path: string) => `folder:${path}`;
export const isDocumentFolderId = (id: string) =>
  id.startsWith('folder:') && id.endsWith('/');

interface Folder {
  readonly name: string;
  readonly path: string;
  readonly folders: Map<string, Folder>;
  readonly files: string[];
}

/** Present one project path set as folders first, then files, at every level. */
export function libraryDocumentTree(paths: readonly string[]): TreeListNode[] {
  const root: Folder = { name: '', path: '', folders: new Map(), files: [] };
  for (const path of paths) {
    const parts = path.split('/');
    let folder = root;
    for (const name of parts.slice(0, -1)) {
      if (!name) continue;
      let child = folder.folders.get(name);
      if (!child) {
        child = {
          name,
          path: `${folder.path}${name}/`,
          folders: new Map(),
          files: [],
        };
        folder.folders.set(name, child);
      }
      folder = child;
    }
    folder.files.push(path);
  }
  const rows = (folder: Folder): TreeListNode[] => [
    ...[...folder.folders.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((child) => ({
        id: documentFolderId(child.path),
        label: child.name,
        children: rows(child),
      })),
    ...folder.files
      .sort((a, b) => documentName(a).localeCompare(documentName(b)))
      .map((path) => ({
        id: path,
        label: documentName(path),
        rootAttributes: { 'data-editor-palette-document': path },
      })),
  ];
  return rows(root);
}
