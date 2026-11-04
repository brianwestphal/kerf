// KF-XX4Y95: the editor places a Form from the palette like any container;
// it holds fields, renders a native form on the canvas, and a submission on
// the canvas never navigates the editor.
import type { ViewDocument } from '@kerfjs/ui/view';
import { validateView } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { embedNode } from '../../../src/editor/model/edits.js';
import { createEditor, paletteGroups, viewCatalog } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3TF0';
const FORM = '01JB8Z1M6Q8E1X9V4S7K2R3TF1';
const FIELD = '01JB8Z1M6Q8E1X9V4S7K2R3TF2';
const field = {
  id: FIELD,
  type: '@kerfjs/ui:text-field',
  props: { name: 'project', label: 'Project Name' },
};
const view = (content: object[]) =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Settings',
    catalogs: ['@kerfjs/ui'],
    root: { id: PANE, type: '@kerfjs/ui:pane', zones: { content } },
  }) as unknown as ViewDocument;
const withForm = view([
  {
    id: FORM,
    type: '@kerfjs/ui:form',
    props: { id: 'settings', action: 'save-settings' },
    zones: { children: [field] },
  },
]);

describe('Form in the editor', () => {
  it('is a palette entry under Controls', () => {
    const controls = paletteGroups().find(
      (group) => group.category === 'Controls',
    );
    expect(controls?.items).toContainEqual({
      key: '@kerfjs/ui:form',
      name: 'Form',
    });
  });

  it('holds fields in its children zone and validates', () => {
    expect(validateView(withForm, viewCatalog).diagnostics).toEqual([]);
    const embedded = embedNode(
      view([field]),
      FIELD,
      { type: '@kerfjs/ui:form' },
      'children',
    );
    expect(embedded).toBeDefined();
    expect(validateView(embedded!.document, viewCatalog).diagnostics).toEqual(
      [],
    );
  });

  it('renders a native form on the canvas that never navigates', () => {
    const root = window.document.createElement('div');
    window.document.body.append(root);
    const editor = createEditor({ document: withForm });
    const stopMount = mount(root, editor.render);
    const unwire = editor.wire(root);
    cleanup = () => {
      unwire();
      stopMount();
    };
    const form = root.querySelector<HTMLFormElement>('form.kui-form#settings');
    expect(form?.dataset.action).toBe('save-settings');
    expect(form?.querySelector('input[name="project"]')).not.toBeNull();
    const submit = new Event('submit', { bubbles: true, cancelable: true });
    form!.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(true);
  });
});
