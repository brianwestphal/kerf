// The private editor's catalog: Kerf UI's own components (KF-6GT5QY: the
// editor shell is published as `@kerfjs/ui/editor`; this app is its host).
import catalogJson from '@kerfjs/ui/ai/component-catalog.json';
import compositionJson from '@kerfjs/ui/ai/component-composition.json';
import propsJson from '@kerfjs/ui/ai/component-props.json';
import { createEditorCatalog } from '@kerfjs/ui/editor';

import { kerfUiComponents } from './components.js';

export const kerfUiCatalog = createEditorCatalog({
  props: [propsJson],
  composition: [compositionJson],
  selection: [catalogJson],
  components: kerfUiComponents(propsJson),
});
