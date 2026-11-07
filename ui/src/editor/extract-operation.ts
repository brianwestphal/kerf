// The Extract operation (KF-N0CSVT). Its file write and document edit are
// coordinated so an intervening edit cannot replace the wrong subtree.
import type { ViewDocument } from '@kerfjs/ui/view';
import { batch, type Signal } from 'kerfjs';

import { closeDialog } from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import { type EditorStorage,isDraft } from './autosave.js';
import { HOOK, hook } from './dom-hooks.js';
import type { EditorContext } from './editor-context.js';
import { newNodeId } from './model/edits.js';
import { extractToDocument } from './model/extract.js';
import { type ViewLoad, viewPath } from './model/views.js';

interface ExtractState {
  readonly storage: EditorStorage;
  readonly error: Signal<string>;
  readonly viewLoads: Signal<ReadonlyMap<string, ViewLoad>>;
  readonly fileText: (document: ViewDocument) => string;
}

export function createExtractOperation(
  ctx: EditorContext,
  state: ExtractState,
) {
  return async (dialog: HTMLDialogElement): Promise<void> => {
    const saver = ctx.autosave!;
    const id = ctx.selectedNodeId()!;
    const from = saver.path.peek();
    const given = dialog
      .querySelector<HTMLInputElement>(`${hook(HOOK.extract, 'path')} input`)!
      .value.trim();
    const path = viewPath('', given);
    const fail = (message: string) => {
      state.error.value = message;
    };
    if (!path?.endsWith('.kui.json') || isDraft(path))
      return fail(
        'Name a .kui.json file inside the project, outside the drafts folder.',
      );
    if (path === from) return fail('That is this document’s own file.');
    const before = ctx.doc.peek();
    const result = extractToDocument(before, id, {
      documentPath: from,
      path,
      view: newNodeId(),
      catalog: ctx.catalog.viewCatalog,
      resolveView: ctx.resolveView,
    });
    if ('error' in result) return fail(result.error);
    try {
      if ((await state.storage.read(path)) !== undefined)
        return fail(`There is already a file at ${path}.`);
      await saver.flush();
      await state.storage.write(path, state.fileText(result.extracted));
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
    if (ctx.doc.peek() !== before)
      return fail('The document changed meanwhile; extract it again.');
    batch(() => {
      state.viewLoads.value = new Map(state.viewLoads.peek()).set(path, {
        state: 'loaded',
        document: result.extracted,
      });
      ctx.commit(result.document);
      ctx.select({ kind: 'node', id: result.view });
    });
    closeDialog(dialog);
  };
}
