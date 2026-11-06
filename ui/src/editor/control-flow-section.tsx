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
import { findNode } from './model/document.js';
import { eachScopes } from './model/edits.js';
import {
  rowConditionOptions,
  rowDesignMoves,
  rowKindOptions,
} from './model/row-designs.js';

/** Adds a `$slot` to the chosen zone. */
export const ADD_SLOT_ACTION = 'editor-add-slot';

/** Adds the chosen row design to the selected node's list (KF-1CRGP1). */
export const ADD_ROW_DESIGN_ACTION = 'editor-add-row-design';

/** Removes the selected row design from its list (KF-1CRGP1). */
export const REMOVE_ROW_DESIGN_ACTION = 'editor-remove-row-design';

/** Moves the selected row design one place earlier (KF-STBQBG). */
export const MOVE_ROW_DESIGN_EARLIER_ACTION = 'editor-move-row-design-earlier';

/** Moves the selected row design one place later (KF-STBQBG). */
export const MOVE_ROW_DESIGN_LATER_ACTION = 'editor-move-row-design-later';

/**
 * KF-STBQBG: Move design earlier / later for the selected row design, each
 * disabled where the design cannot move that way. None for the last design
 * of an `$if` chain, which stays last.
 */
function moveRowDesignButtons(document: ViewDocument, id: string) {
  const moves = rowDesignMoves(document, id);
  if (!moves.earlier && !moves.later) return undefined;
  return (
    <>
      <Button
        emphasis="secondary"
        size="compact"
        action={MOVE_ROW_DESIGN_EARLIER_ACTION}
        disabled={!moves.earlier}
      >
        Move design earlier
      </Button>
      <Button
        emphasis="secondary"
        size="compact"
        action={MOVE_ROW_DESIGN_LATER_ACTION}
        disabled={!moves.later}
      >
        Move design later
      </Button>
    </>
  );
}

/** Adds the kind chosen in the Row designs add form (KF-YX6HMT). */
export const ADD_KIND_ACTION = 'editor-add-kind';

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
  /** Components that can be a row design there: each has a data-* channel. */
  rowChoices: readonly { value: string; label: string }[] = [],
  /** KF-YX6HMT: why the last kind name typed was refused. */
  kindError?: string,
  /** KF-YX6HMT: why the last kind added was refused. */
  newKindError?: string,
) {
  const control = controlOf(document, id);
  if (!control) {
    return id === document.root?.id ? undefined : (
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
      {control.repeat
        ? control.rows?.kind === undefined
          ? rowDesignFields(document, catalog, id, control, rowChoices)
          : kindFields(
              document,
              catalog,
              id,
              control,
              rowChoices,
              kindError,
              newKindError,
            )
        : undefined}
    </>
  );
}

/**
 * KF-1CRGP1: the row designs of a repeated node's list. A node in an `$if`
 * chain shows when it is picked and can be removed; any repeated node can
 * add a design, shown for the items where a true/false value holds.
 */
function rowDesignFields(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
  control: NonNullable<ReturnType<typeof controlOf>>,
  choices: readonly { value: string; label: string }[],
) {
  const rows = control.rows;
  const last = rows && rows.index === rows.branches.length - 1;
  const conditions = rowConditionOptions(document, catalog, id);
  const ready = conditions.length > 0 && choices.length > 0;
  const own = findNode(document, id)!.node.type;
  const current =
    rows && !last ? rows.branches[rows.index]!.condition : undefined;
  // KF-YX6HMT: a one-node list can pick its designs by kind instead.
  const kinds = rows ? [] : rowKindOptions(document, catalog, id);
  return (
    <>
      <ListHeader label="Row designs" size="xs" />
      <List controlInsets="trbl" gap>
        {rows ? (
          <>
            {last ? (
              <Select
                name="control-row-condition"
                label="This design shows"
                value=""
                choices={[{ value: '', label: 'For every other item' }]}
                disabled
                hint={`The last of ${rows.branches.length} designs shows for every item no earlier design takes, so it stays last.`}
              />
            ) : (
              <Select
                name="control-row-condition"
                label="This design shows when"
                value={JSON.stringify(current)}
                choices={choicesWith(
                  conditions,
                  current,
                  'Choose a value',
                ).slice(1)}
                hint={`Design ${rows.index + 1} of ${rows.branches.length}. An item whose value matches several designs shows the first.`}
                rootAttributes={{ 'data-editor-control': 'row-condition' }}
              />
            )}
            {moveRowDesignButtons(document, id)}
            <Button
              emphasis="secondary"
              size="compact"
              action={REMOVE_ROW_DESIGN_ACTION}
            >
              Remove row design
            </Button>
          </>
        ) : undefined}
        {ready ? (
          <>
            <Select
              name="row-design-component"
              label="Add a row design"
              // The selected design's own component: a variant row.
              value={own}
              choices={choices}
              hint="A row of another component, for the items a true/false value picks."
              rootAttributes={{ 'data-editor-row-design': 'component' }}
            />
            <Select
              name="row-design-condition"
              label="Shown when"
              value={JSON.stringify(conditions[0]!.value)}
              choices={conditions.map((option) => ({
                value: JSON.stringify(option.value),
                label: option.label,
              }))}
              rootAttributes={{ 'data-editor-row-design': 'condition' }}
            />
            <Button
              emphasis="secondary"
              size="compact"
              action={ADD_ROW_DESIGN_ACTION}
            >
              Add row design
            </Button>
          </>
        ) : undefined}
        {kinds.length ? (
          <Select
            name="control-row-kind"
            label="Or pick designs by kind"
            value=""
            choices={choicesWith(kinds, undefined, 'Not by kind')}
            hint="A text field of the item names each row's design; this one becomes the default."
            rootAttributes={{ 'data-editor-control': 'row-kind' }}
          />
        ) : undefined}
      </List>
      {ready ? undefined : (
        <ListInsetText>
          <Text tone="quiet">
            No true/false param or item field can pick a row design here.
          </Text>
        </ListInsetText>
      )}
      {rows ? (
        // KF-B0ZDE6: a chain reads true/false values and a kinds map one
        // kind value, so switching is a redesign, not a conversion.
        <ListInsetText>
          <Text
            tone="quiet"
            rootAttributes={{ 'data-editor-row-kind-note': '' }}
          >
            Rows chosen by conditions; to pick them by kind, remove designs down
            to one.
          </Text>
        </ListInsetText>
      ) : undefined}
    </>
  );
}

/**
 * KF-YX6HMT: the row designs of a list keyed by kind: the value that picks
 * a design, the selected design's kind (the `default` one takes every other
 * kind and keeps its name), and adding a kind with its component.
 */
function kindFields(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
  control: NonNullable<ReturnType<typeof controlOf>>,
  choices: readonly { value: string; label: string }[],
  error: string | undefined,
  addError: string | undefined,
) {
  const rows = control.rows!;
  const kind = rows.branches[rows.index]!.kind!;
  const fallback = kind === 'default';
  const own = findNode(document, id)!.node.type;
  return (
    <>
      <ListHeader label="Row designs" size="xs" />
      <List controlInsets="trbl" gap>
        <Select
          name="control-row-kind"
          label="Pick the design by"
          value={JSON.stringify(rows.kind)}
          choices={choicesWith(
            rowKindOptions(document, catalog, id),
            rows.kind,
            'Choose a value',
          ).slice(1)}
          hint="Each item shows the design named by this text value."
          rootAttributes={{ 'data-editor-control': 'row-kind' }}
        />
        <TextField
          label="Kind"
          value={kind}
          disabled={fallback}
          hint={
            fallback
              ? 'Items of any other kind show this design.'
              : 'Items whose kind is this name show this design.'
          }
          error={error}
          rootAttributes={{ 'data-editor-control': 'kind-name' }}
        />
        {moveRowDesignButtons(document, id)}
        {fallback ? undefined : (
          <Button
            emphasis="secondary"
            size="compact"
            action={REMOVE_ROW_DESIGN_ACTION}
          >
            Remove row design
          </Button>
        )}
        <TextField
          label="Add a kind"
          placeholder="header"
          error={addError}
          rootAttributes={{ 'data-editor-kind': 'name' }}
        />
        <Select
          name="kind-component"
          label="Shown as"
          value={own}
          choices={choices}
          rootAttributes={{ 'data-editor-kind': 'component' }}
        />
        <Button emphasis="secondary" size="compact" action={ADD_KIND_ACTION}>
          Add kind
        </Button>
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

/**
 * The inspector for a selected `$slot`: its inputs. The Inspector toolbar
 * moves and deletes it, as it does a node (KF-5RKX3W).
 */
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
    </List>
  );
}
