/// <reference types="vite/client" />
// Kerf UI's own catalog for the editor tests (KF-6GT5QY: editor host): the
// published editor takes its catalogs from its host, as the private editor
// app and the Vite editor plugin pass them.
import '../../../src/popup-menu-register.js';
import '../../../src/select-register.js';

import type { ViewDocument } from '@kerfjs/ui/view';

import catalogJson from '../../../ai/component-catalog.json';
import compositionJson from '../../../ai/component-composition.json';
import propsJson from '../../../ai/component-props.json';
import {
  componentMap,
  createEditor as createPublishedEditor,
  createEditorCatalog,
  type EditorOptions,
} from '../../../src/editor/editor.js';
import inbox from '../../fixtures/view/inbox.kui.json';

export { createEditorCatalog };

// Every public facade, keyed by the subpath a props catalog records as its
// components' `import`, as the Vite editor plugin's generated imports are.
const facades = import.meta.glob<Record<string, unknown>>(
  '../../../src/*.{ts,tsx}',
  { eager: true },
);
const modules: Record<string, Record<string, unknown>> = Object.fromEntries(
  Object.entries(facades).map(([path, module]) => {
    const name = path.replace(/^.*\/src\/|\.tsx?$/g, '');
    return [name === 'index' ? '@kerfjs/ui' : `@kerfjs/ui/${name}`, module];
  }),
);

export const componentFunctions = () => componentMap([propsJson], modules);

export const defaultCatalog = createEditorCatalog({
  props: [propsJson],
  composition: [compositionJson],
  selection: [catalogJson],
  components: componentFunctions(),
});
export const { viewCatalog, propsByKey, componentNames } = defaultCatalog;
export const paletteGroups = () => defaultCatalog.paletteGroups();
export const sample = inbox as unknown as ViewDocument;

/** The editor over Kerf UI's catalog, starting with the inbox sample. */
export function createEditor(options: Partial<EditorOptions> = {}) {
  return createPublishedEditor({
    catalog: defaultCatalog,
    document: globalThis.structuredClone(sample),
    ...options,
  });
}
