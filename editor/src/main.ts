import '@kerfjs/ui/document.css';
import '@kerfjs/ui/styles.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/workbench.css';
import '@kerfjs/ui/editor.css';
import '@kerfjs/ui/popup-menu/register';
import '@kerfjs/ui/select/register';
import '@kerfjs/ui/surface-scaffold/register';

import { createEditor, devServerStorage } from '@kerfjs/ui/editor';
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';

import { kerfUiCatalog } from './catalog.js';
import sample from './sample.kui.json';

const root = document.getElementById('editor')!;
const editor = createEditor({
  catalog: kerfUiCatalog,
  document: sample as unknown as ViewDocument,
  storage: devServerStorage(),
});
mount(root, editor.render);
editor.wire(root);
