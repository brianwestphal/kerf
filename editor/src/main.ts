import { mount } from 'kerfjs';

import { createEditor } from './editor.js';

const root = document.getElementById('editor')!;
const editor = createEditor();
mount(root, editor.render);
editor.wire(root);
