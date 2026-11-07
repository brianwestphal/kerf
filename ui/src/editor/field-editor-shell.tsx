// The field editor's subviews and dialog, both driven by one active path.
import type { Signal } from 'kerfjs';

import { Button } from '../components/actions/button/button.js';
import { DialogSurface } from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import type { EditorContext } from './editor-context.js';
import type { createFieldEditorViews } from './field-editor-views.js';
import { type FieldPlace, type OpenField, placeKey } from './field-place.js';
import { findNode } from './model/document.js';
import {
  FIELD_BACK_ACTION,
  FIELD_DIALOG,
  FIELD_DONE_ACTION,
  INSPECTOR_PANE,
} from './shell-names.js';

type FieldViews = ReturnType<typeof createFieldEditorViews>;

export function createFieldEditorShell(
  ctx: EditorContext,
  openField: Signal<OpenField | null>,
  { stepLabel, fieldStep }: Pick<FieldViews, 'stepLabel' | 'fieldStep'>,
) {
  /** The editor still belongs to the selected node after a change. */
  const activeField = (): OpenField | null => {
    const open = openField.value;
    return open && open.node === ctx.selectedNodeId() ? open : null;
  };

  const fieldSteps = (open: FieldPlace): FieldPlace[] =>
    Array.from({ length: open.path.length + 1 }, (_, index) => ({
      prop: open.prop,
      path: open.path.slice(0, index),
    }));

  const fieldViews = () => {
    const open = activeField();
    if (open?.container !== 'subview') return [];
    const node = findNode(ctx.doc.value, open.node)!.node;
    return fieldSteps(open).map((place) => ({
      key: `field-${placeKey(place)}`,
      toolbar: { title: stepLabel(node, place) },
      pane: INSPECTOR_PANE,
      content: fieldStep(node, place),
    }));
  };

  const fieldDialog = () => {
    const open = activeField();
    const place = open?.container === 'dialog' ? open : undefined;
    const node = place && findNode(ctx.doc.value, place.node)!.node;
    return (
      <DialogSurface
        id={FIELD_DIALOG}
        label={place ? stepLabel(node!, place) : 'Field'}
        size="medium"
        rootAttributes={{ 'data-key': FIELD_DIALOG }}
        footer={
          <>
            {place?.path.length ? (
              <Button action={FIELD_BACK_ACTION}>Back</Button>
            ) : undefined}
            <Button tone="brand" action={FIELD_DONE_ACTION}>
              Done
            </Button>
          </>
        }
      >
        {node
          ? fieldStep(node, { prop: place!.prop, path: place!.path })
          : undefined}
      </DialogSurface>
    );
  };

  return { activeField, fieldViews, fieldDialog };
}
