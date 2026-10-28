// The inspector's control-flow sections (KF-90GTJN): show a node only when a
// condition holds, repeat it for each item of a list, add a slot, and edit a
// selected slot. The editor wires the controls' data attributes to the
// document edits in model/control-flow.ts.
import type {
  ViewCatalog,
  ViewChild,
  ViewDocument,
  ViewValue,
} from '@kerfjs/ui/view';

import { Button } from '../components/actions/button/button.js';
import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListInsetText } from '../components/collections/list-inset-text/list-inset-text.js';
import { Select } from '../components/forms/select/select.js';
import { Switch } from '../components/forms/switch/switch.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { Text } from '../components/typography/text/text.js';
import {
  conditionOptions,
  controlOf,
  repeatOptions,
  type SlotAddress,
  slotAt,
  slotInputOptions,
  slotInputs,
} from './model/control-flow.js';
import { eachScopes } from './model/edits.js';

/** Adds a `$slot` to the chosen zone. */
export const ADD_SLOT_ACTION = 'editor-add-slot';
/** Removes the selected `$slot`. */
export const DELETE_SLOT_ACTION = 'editor-delete-slot';

/** How a `$param` or `$bind` reads as a choice label. */
const sourceLabel = (value: ViewValue) => {
  const source = value as { $param?: string; $bind?: string };
  return source.$param ? `Param ${source.$param}` : String(source.$bind);
};

/** Choices from options, keeping the current value even when it no longer fits. */
function choicesWith(
  options: readonly { label: string; value: ViewValue }[],
  current: ViewValue | undefined,
  none: string,
) {
  const choices = [
    { value: '', label: none },
    ...options.map((option) => ({
      value: JSON.stringify(option.value),
      label: option.label,
    })),
  ];
  if (
    current !== undefined &&
    !choices.some((choice) => choice.value === JSON.stringify(current))
  )
    choices.push({
      value: JSON.stringify(current),
      label: sourceLabel(current),
    });
  return choices;
}

/**
 * Show-when and repeat controls for node `id`, or a note when its control
 * flow is a shape the inspector does not edit.
 */
export function controlFlowSection(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
  itemError: string | undefined,
  /** Components that can show otherwise, in the node's zone (KF-5S56VQ). */
  otherwiseChoices: readonly { value: string; label: string }[],
) {
  const control = controlOf(document, id);
  if (!control) {
    return id === document.root.id ? undefined : (
      <>
        <ListHeader label="Control flow" size="xs" />
        <ListInsetText>
          <Text tone="quiet">
            This node sits in a nested condition; edit its control flow in the
            document file.
          </Text>
        </ListInsetText>
      </>
    );
  }
  const repeats = repeatOptions(document, catalog, id);
  return (
    <>
      <ListHeader label="Control flow" size="xs" />
      <List controlInsets="trbl" gap>
        <Select
          name="control-condition"
          label="Show"
          value={
            control.condition === undefined
              ? ''
              : JSON.stringify(control.condition)
          }
          choices={choicesWith(
            conditionOptions(document, catalog, id),
            control.condition,
            'Always',
          )}
          hint={
            control.branch === 'else'
              ? 'This node shows while the condition does not hold; changing it changes both branches.'
              : 'Show this node only while a true/false param or item field is true.'
          }
          rootAttributes={{ 'data-editor-control': 'condition' }}
        />
        {control.condition !== undefined && control.branch !== 'else'
          ? otherwiseSelect(control.otherwise, otherwiseChoices)
          : undefined}
        <Select
          name="control-repeat"
          label="Repeat for each"
          value={control.repeat ? JSON.stringify(control.repeat.source) : ''}
          choices={choicesWith(
            repeats.map((option) => ({
              label: option.label,
              value: option.source,
            })),
            control.repeat?.source,
            'Do not repeat',
          )}
          hint={
            repeats.length || control.repeat
              ? 'Render this node once per item of a list.'
              : 'No list of objects in scope can repeat this node.'
          }
          rootAttributes={{ 'data-editor-control': 'repeat' }}
        />
        {control.repeat ? (
          <TextField
            label="Item name"
            value={control.repeat.as}
            hint={`Rows are keyed by ${control.repeat.key}. Renaming updates the row's bindings.`}
            error={itemError}
            rootAttributes={{ 'data-editor-control': 'item' }}
          />
        ) : undefined}
      </List>
    </>
  );
}

/** What shows while the condition does not hold: nothing, or one component. */
function otherwiseSelect(
  otherwise: ViewChild | undefined,
  choices: readonly { value: string; label: string }[],
) {
  // An otherwise branch that repeats or is a slot is edited by selecting it.
  const plain = !otherwise || !('type' in otherwise) ? undefined : otherwise;
  if (otherwise && !plain)
    return (
      <Select
        name="control-otherwise"
        label="Otherwise show"
        value=""
        choices={[{ value: '', label: 'A repeated row or slot' }]}
        disabled
        hint="Select the otherwise branch in the outline to edit it."
      />
    );
  return (
    <Select
      name="control-otherwise"
      label="Otherwise show"
      value={plain?.type ?? ''}
      choices={[
        { value: '', label: 'Nothing' },
        ...choices,
        ...(plain && !choices.some((choice) => choice.value === plain.type)
          ? [{ value: plain.type, label: plain.type }]
          : []),
      ]}
      hint="Shows in this node's place while the condition does not hold."
      rootAttributes={{ 'data-editor-control': 'otherwise' }}
    />
  );
}

/** The add-a-slot fields under "Add a child", for node `id`'s chosen zone. */
export function addSlotFields(
  document: ViewDocument,
  id: string,
  error: string | undefined,
) {
  const inRow = eachScopes(document, id).length > 0;
  return (
    <List controlInsets="trbl" gap>
      <TextField
        label="Slot name"
        placeholder="actions"
        hint="The application fills a slot with its own content."
        error={error}
        rootAttributes={{ 'data-editor-slot': 'name' }}
      />
      {inRow ? (
        <Switch
          label="Pass the row item"
          checked
          rootAttributes={{ 'data-editor-slot': 'pass-item' }}
        />
      ) : undefined}
      <Button emphasis="secondary" size="compact" action={ADD_SLOT_ACTION}>
        Add slot
      </Button>
    </List>
  );
}

/** The inspector for a selected `$slot`: its inputs and a delete control. */
export function slotEditor(
  document: ViewDocument,
  catalog: ViewCatalog,
  address: SlotAddress,
) {
  const slot = slotAt(document, address)!;
  const inputs = slotInputs(document, address);
  return (
    <List>
      <ListHeader label={`${slot.$slot} slot`} />
      <ListInsetText>
        <Text tone="quiet">
          The application fills this slot with its own content when it renders
          the view.
        </Text>
      </ListInsetText>
      {inputs.length ? (
        <>
          <ListHeader label="Input" size="xs" />
          <List controlInsets="trbl" gap>
            {inputs.map((input) => (
              <Select
                name={`slot-input-${input.name}`}
                label={input.name}
                value={
                  slot.input?.[input.name] === undefined
                    ? ''
                    : JSON.stringify(slot.input[input.name])
                }
                choices={choicesWith(
                  slotInputOptions(document, catalog, address, input.name),
                  slot.input?.[input.name],
                  'Not set',
                )}
                rootAttributes={{ 'data-editor-slot-input': input.name }}
              />
            ))}
          </List>
        </>
      ) : undefined}
      <List controlInsets="trbl" gap>
        <Button emphasis="secondary" size="compact" action={DELETE_SLOT_ACTION}>
          Delete slot
        </Button>
      </List>
    </List>
  );
}
