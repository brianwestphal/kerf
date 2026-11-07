// Inspector field editor forms, list steps, bindings, and custom editors.
import type {
  ViewDocument,
  ViewNode,
  ViewType,
  ViewValue,
} from '@kerfjs/ui/view';
import type { SafeHtml, Signal } from 'kerfjs';
import { Plus, Trash } from 'lucide';

import { Button } from '../components/actions/button/button.js';
import { PopupMenu } from '../components/actions/popup-menu/popup-menu.js';
import { List } from '../components/collections/list/list.js';
import { ListActionRow } from '../components/collections/list-action-row/list-action-row.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListInsetText } from '../components/collections/list-inset-text/list-inset-text.js';
import {
  ValueTable,
  ValueTableRow,
} from '../components/data-display/value-table/value-table.js';
import { Select } from '../components/forms/select/select.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { Row } from '../components/layout/row/row.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { Text } from '../components/typography/text/text.js';
import { HOOK } from './dom-hooks.js';
import type { EditorContext } from './editor-context.js';
import {
  type FieldEditorContext,
  fieldEditorFor,
  type FieldEditors,
} from './field-editors.js';
import { controlKey, type FieldPlace, placeKey } from './field-place.js';
import type { createInspectorControls } from './inspector-controls.js';
import { choiceOptions, controlFor, typeLabel } from './model/controls.js';
import { findNode } from './model/document.js';
import { bindingOptions, paramTypeFor, setProp } from './model/edits.js';
import {
  exampleValue,
  resolveType,
  slotNamer,
  usedSlots,
} from './model/examples.js';
import {
  type FieldEditorKind,
  fieldEditorKind,
  listItemLabel,
  listMembers,
  memberFor,
  memberSwitchField,
  objectFields,
  propLabel,
  stepTitle,
  typeAt,
  valueAt,
  withRequiredFilled,
} from './model/fields.js';
import type { InspectorProp } from './model/inspector.js';
import {
  FIELD_ADD_ITEM_ACTION,
  FIELD_EXAMPLE_ACTION,
  FIELD_JSON_ACTION,
  FIELD_OPEN_ACTION,
  FIELD_REMOVE_ITEM_ACTION,
  FIELD_RESET_ACTION,
  FIELD_SET_ACTION,
  type InspectorRow,
  PROMOTE_FIELD_ACTION,
} from './shell-names.js';

type InspectorControls = ReturnType<typeof createInspectorControls>;

export interface FieldEditorViewState {
  readonly propControl: InspectorControls['propControl'];
  readonly configureRow: InspectorControls['configureRow'];
  readonly iconRow: InspectorControls['iconRow'];
  readonly nodeContentRow: (
    node: ViewNode,
    prop: string,
    label?: string,
    unset?: string,
  ) => SafeHtml;
  readonly writeField: (place: FieldPlace, next: ViewValue | undefined) => void;
  readonly bindField: Signal<string>;
  readonly jsonSteps: Signal<ReadonlySet<string>>;
  readonly fieldEditors: FieldEditors | undefined;
}

export function createFieldEditorViews(
  ctx: EditorContext,
  state: FieldEditorViewState,
) {
  const { definitionsOf, doc, fieldErrors, propsEntryOf, resolveView } = ctx;
  const { viewCatalog } = ctx.catalog;
  const {
    propControl,
    configureRow,
    iconRow,
    nodeContentRow,
    writeField,
    bindField,
    jsonSteps,
    fieldEditors,
  } = state;
  /** What a field of the selected node's prop is: its type and value. */
  const fieldContext = (node: ViewNode, place: FieldPlace) => {
    const prop = propsEntryOf(node)!.props.find(
      (item) => item.name === place.prop,
    )!;
    const definitions = definitionsOf(node.type);
    const propValue = node.props?.[place.prop] as ViewValue | undefined;
    const value = valueAt(propValue, place.path);
    const declared = typeAt(
      prop.type as never,
      definitions,
      place.path,
      propValue,
    );
    // A list item's place narrows to its member; its list declares the
    // union the item's member switch picks among (KF-BGKYYH).
    const list =
      typeof place.path.at(-1) === 'number'
        ? (typeAt(
            prop.type as never,
            definitions,
            place.path.slice(0, -1),
            propValue,
          ) as { items?: ViewType } | undefined)
        : undefined;
    return {
      definitions,
      // A union's value edits as the member it holds (KF-3CKTKN).
      type: memberFor(declared, definitions, value),
      // The whole union, which a typed choice picks among.
      declared,
      /** A list item's declared item type: the union its members share. */
      items: (list && resolveType(list as never, definitions)?.items) as
        ViewType | undefined,
      value,
    };
  };

  /** Whether a structured kind opens its own editor rather than JSON. */
  const opensEditor = (kind: FieldEditorKind) =>
    kind === 'object' || kind === 'object-list' || kind === 'union-list';

  /** Whether a step's scalar type has a control of its own, not JSON. */
  const opensScalar = (
    prop: InspectorProp,
    value: ViewValue | undefined,
    definitions: Parameters<typeof controlFor>[2],
  ) => {
    const kind = controlFor(prop, value, definitions).kind;
    return kind !== 'list' && kind !== 'readonly';
  };

  /** A step's title: a field's name, or a list item's label ("Choice 2"). */
  const stepLabel = (node: ViewNode, place: FieldPlace) => {
    const index = place.path.at(-1);
    return typeof index === 'number'
      ? listItemLabel(fieldContext(node, place).value, index)
      : stepTitle(place);
  };

  /**
   * A list step (KF-CY1D5W): one row per item, labeled from the item and
   * opening its form, with Remove and drag-reorder; Add appends an item,
   * or for a union list offers each member in an Add menu.
   */
  const listStep = (
    node: ViewNode,
    place: FieldPlace,
    actions: (lead: SafeHtml) => SafeHtml,
  ) => {
    const { definitions, type, value } = fieldContext(node, place);
    const items = Array.isArray(value) ? value : [];
    const members = listMembers(type, definitions, stepTitle(place));
    const union = members.length > 1;
    const itemType = (resolveType(type, definitions) as { items?: ViewType })
      .items;
    const step = JSON.stringify(place);
    const rows = items.map((item, index) => {
      const at = { prop: place.prop, path: [...place.path, index] };
      const label = listItemLabel(item, index);
      const member = memberFor(itemType, definitions, item);
      // A union list's row names its member, unless the label already does.
      const kind = union
        ? members.find((option) => option.type === member)?.label
        : undefined;
      return (
        <ListActionRow
          label={label}
          description={kind === label ? undefined : kind}
          action={FIELD_OPEN_ACTION}
          itemId={`item-${index}`}
          draggable
          rootAttributes={{ [HOOK.open]: JSON.stringify(at) }}
          trailingAction={FIELD_REMOVE_ITEM_ACTION}
          trailingActionLabel={`Remove ${label}`}
          trailingActionIcon={<LucideIcon icon={Trash} name="trash" />}
          trailingActionAttributes={{ 'data-editor-item': JSON.stringify(at) }}
        />
      );
    });
    const add = union ? (
      <PopupMenu
        text="Add"
        emphasis="secondary"
        size="compact"
        icon={<LucideIcon icon={Plus} name="plus" />}
        items={members.map((member, index) => ({
          label: member.label,
          action: FIELD_ADD_ITEM_ACTION,
          attributes: {
            'data-editor-step': step,
            'data-editor-member': String(index),
          },
        }))}
      />
    ) : (
      <Button
        emphasis="secondary"
        size="compact"
        icon={<LucideIcon icon={Plus} name="plus" />}
        action={FIELD_ADD_ITEM_ACTION}
        rootAttributes={{
          'data-editor-step': step,
          'data-editor-member': '0',
        }}
      >
        Add
      </Button>
    );
    return (
      <List>
        {rows.length ? (
          <List rootAttributes={{ 'data-list-id': step }}>{rows}</List>
        ) : (
          <ListInsetText>
            <Text tone="quiet">No items yet.</Text>
          </ListInsetText>
        )}
        {actions(add)}
      </List>
    );
  };

  /**
   * One step of a field editor (KF-Z9S029): an object's form, built from
   * its fields with the Inspector's controls, nested objects opening the
   * same way again; or its typed JSON, the escape hatch. Reset and Fill
   * with example act on the whole step.
   */
  const fieldStep = (node: ViewNode, place: FieldPlace) => {
    const { definitions, type, value } = fieldContext(node, place);
    const key = placeKey(place);
    const step = { 'data-editor-step': JSON.stringify(place) };
    const kind = fieldEditorKind(type, definitions);
    const custom = customFor(type);
    const structured = Boolean(custom) || opensEditor(kind);
    const form = structured && !jsonSteps.value.has(key);
    // A list's text item (a Combobox suggestion) edits in its own control.
    const scalar = { name: stepLabel(node, place), type, required: true };
    if (!structured && opensScalar(scalar as never, value, definitions))
      return (
        <List controlInsets="trbl" gap>
          {propControl(scalar as never, value as never, node.type, place)}
        </List>
      );
    const example = exampleValue(
      type,
      definitions,
      stepTitle(place),
      slotNamer(usedSlots(doc.value)),
    );
    // A list's Add leads the row of actions (KF-CY1D5W).
    const actions = (lead?: SafeHtml) => (
      <List controlInsets="trbl">
        <Row gap="s" wrap>
          {lead}
          <Button
            emphasis="secondary"
            size="compact"
            action={FIELD_JSON_ACTION}
            rootAttributes={step}
          >
            {form
              ? 'Edit as JSON'
              : kind === 'object' || custom
                ? 'Edit as form'
                : 'Edit as list'}
          </Button>
          <Button
            emphasis="secondary"
            size="compact"
            action={FIELD_RESET_ACTION}
            disabled={value === undefined}
            rootAttributes={step}
          >
            Reset
          </Button>
          {/* An object of only optional fields has nothing to fill. */}
          {example !== undefined && JSON.stringify(example) !== '{}' ? (
            <Button
              emphasis="secondary"
              size="compact"
              action={FIELD_EXAMPLE_ACTION}
              rootAttributes={step}
            >
              Fill with example
            </Button>
          ) : undefined}
        </Row>
      </List>
    );
    if (!form) {
      return (
        <List>
          <List controlInsets="trbl" gap>
            <TextField
              label={stepTitle(place)}
              value={value === undefined ? '' : JSON.stringify(value, null, 2)}
              multiline
              rows={value === undefined ? 2 : 6}
              maxRows={20}
              hint={`JSON for ${typeLabel(type!.text!)}.`}
              error={fieldErrors.value[key]}
              rootAttributes={{
                [HOOK.field]: JSON.stringify(place),
                [HOOK.kind]: 'list',
              }}
            />
          </List>
          {actions()}
        </List>
      );
    }
    // An application's editor for the type replaces the form (KF-EXA2WH).
    if (custom && form)
      return (
        <List>
          {custom.editor.render(editorContext(node, place))}
          {actions()}
        </List>
      );
    if (kind !== 'object') return listStep(node, place, actions);
    return (
      <List>
        {objectForm(node, place)}
        {actions()}
      </List>
    );
  };

  /**
   * An object's type-driven form: its fields with the Inspector's controls,
   * nested objects, lists, icons, and app-edited types as rows that open
   * their own editors, and fields no control edits as a value table.
   */
  const objectForm = (node: ViewNode, place: FieldPlace) => {
    const { definitions, type, declared, items, value } = fieldContext(
      node,
      place,
    );
    const union = items ?? declared;
    const record = (value ?? {}) as Record<string, ViewValue>;
    // KF-BGKYYH: a discriminated union's item (a ScrollEffect effect)
    // switches its member from a Select in place of its fixed `kind`.
    const switchField = memberSwitchField(union, definitions);
    const switcher = switchField
      ? memberSwitch(switchField, union!, definitions, value, place)
      : undefined;
    // KF-3J47BY: rows keep the fields' order, as the Inspector's do.
    const fields = objectFields(type, definitions).filter(
      (field) => field.name !== switchField,
    );
    const rows = fields.map((field): InspectorRow => {
      const at = { prop: place.prop, path: [...place.path, field.name] };
      const fieldValue = record[field.name];
      const control = controlFor(field, fieldValue, definitions);
      const label = propLabel(field.name);
      // KF-3QEZFB: a field bound to a param or an item field names its source.
      if (isParamOrBind(fieldValue))
        return {
          kind: 'fixed',
          row: <ValueTableRow label={label} value={bindingLabel(fieldValue)} />,
        };
      if (customFor(field.type as never))
        return { kind: 'open', row: configureRow(label, fieldValue, at) };
      switch (control.kind) {
        case 'readonly':
          // KF-VSWT2Q: a content field is a field zone the outline fills,
          // so its row adds to that zone or selects what fills it. An item
          // slot there (KF-1ZSW5J) is named, and gives way to added nodes.
          if (field.type.kind === 'content') {
            const slot = (fieldValue as { $slot?: unknown } | undefined)?.$slot;
            if (fieldValue === undefined || typeof slot === 'string')
              return {
                kind: 'open',
                row: nodeContentRow(
                  node,
                  placeKey(at),
                  label,
                  typeof slot === 'string' ? `Slot · ${slot}` : undefined,
                ),
              };
          }
          return {
            kind: 'fixed',
            row: (
              <ValueTableRow
                label={label}
                value={
                  fieldValue === undefined
                    ? typeLabel(field.type.text!)
                    : JSON.stringify(fieldValue)
                }
              />
            ),
          };
        case 'icon':
          return {
            kind: 'open',
            row: iconRow(label, String(control.raw), at),
          };
      }
      return control.kind === 'list' &&
        opensEditor(
          fieldEditorKind(field.type as never, definitions, field.iconSource),
        )
        ? { kind: 'open', row: configureRow(label, fieldValue, at) }
        : {
            kind: 'edit',
            row: propControl(field, fieldValue as never, node.type, at)!,
          };
    });
    return (
      <List>
        {inspectorRuns(
          switcher ? [{ kind: 'edit', row: switcher }, ...rows] : rows,
          `${stepTitle(place)} fields`,
        )}
        {fieldBindSection(node, place, fields, definitions, record)}
      </List>
    );
  };

  /** Whether `value` reads a document param or an item field. */
  const isParamOrBind = (value: unknown) =>
    value !== null &&
    typeof value === 'object' &&
    ('$param' in value || '$bind' in value);

  /** How a bound value reads: its param, or its item path. */
  const bindingLabel = (value: unknown) => {
    const { $param, $bind } = value as { $param?: string; $bind?: string };
    return $param === undefined ? String($bind) : `Param ${$param}`;
  };

  /**
   * Bind or promote one field of an object (KF-3QEZFB: nested params): the
   * prop row's Bind a prop and Promote, for a scalar field inside the value,
   * such as a ContentItem's `media.src` beside its built `overlay`.
   */
  const fieldBindSection = (
    node: ViewNode,
    place: FieldPlace,
    fields: readonly InspectorProp[],
    definitions: Readonly<Record<string, ViewType>>,
    record: Record<string, ViewValue>,
  ) => {
    const bindable = fields.filter(
      (field) =>
        field.type.kind !== 'content' &&
        paramTypeFor(resolveType(field.type as never, definitions) as never) !==
          undefined,
    );
    const field =
      bindable.find((item) => item.name === bindField.value) ?? bindable[0];
    if (!field) return undefined;
    const at = { prop: place.prop, path: [...place.path, field.name] };
    const propType = propsEntryOf(node)?.props.find(
      (item) => item.name === at.prop,
    )?.type as ViewType | undefined;
    // KF-PTMNSZ: judge the field alone, with its object's other required
    // fields standing in, so an unset object's first field can be bound.
    const prepare = (document: ViewDocument) =>
      setProp(
        document,
        node.id,
        at.prop,
        withRequiredFilled(
          findNode(document, node.id)!.node.props?.[at.prop] as
            ViewValue | undefined,
          propType,
          definitionsOf(node.type),
          at.path,
        ),
      );
    const options = bindingOptions(
      doc.value,
      viewCatalog,
      node.id,
      at.prop,
      at.path,
      prepare,
      resolveView,
    );
    const current = record[field.name];
    const bound = isParamOrBind(current) ? JSON.stringify(current) : '';
    // KF-5ZMAEM: a field bound to a param names it, as a bound prop's row
    // does (KF-1HEZZZ); renaming it follows every use.
    const param = (current as { $param?: unknown } | undefined)?.$param;
    const choices = [
      { value: '', label: 'Not bound' },
      ...options.map((option) => ({
        value: JSON.stringify(option.value),
        label: option.label,
      })),
    ];
    return (
      <>
        <ListHeader label="Bind a field" size="xs" />
        <List controlInsets="trbl" gap>
          <Select
            name={`bind-field-${placeKey(place)}`}
            label="Field"
            value={field.name}
            choices={bindable.map((item) => ({
              value: item.name,
              label: propLabel(item.name),
            }))}
            rootAttributes={{ [HOOK.bind]: 'field' }}
          />
          <Select
            name={`bind-field-source-${placeKey(place)}`}
            label="Source"
            value={
              choices.some((choice) => choice.value === bound) ? bound : ''
            }
            choices={choices}
            hint={
              options.length
                ? undefined
                : 'No param or item field in scope fits this field.'
            }
            rootAttributes={{
              [HOOK.bind]: 'field-source',
              'data-editor-bind-place': JSON.stringify(at),
            }}
          />
          {typeof param !== 'string' ? undefined : (
            <TextField
              label={`${propLabel(field.name)} param`}
              value={param}
              hint="Renaming the param updates every prop and field that uses it."
              error={fieldErrors.value[`#param:${param}`]}
              rootAttributes={{ [HOOK.param]: param }}
            />
          )}
          <Row>
            <Button
              emphasis="secondary"
              size="compact"
              action={PROMOTE_FIELD_ACTION}
              disabled={Boolean(bound)}
              rootAttributes={{
                'data-editor-promote-field': JSON.stringify(at),
              }}
            >
              Promote to a param
            </Button>
          </Row>
        </List>
      </>
    );
  };

  /**
   * The Select that switches a discriminated union's value between its
   * members (KF-BGKYYH), labeled by the discriminant ("Kind"). Choosing one
   * starts from its placeholder and keeps the fields the two share (a
   * `range`), as a typed choice does.
   */
  const memberSwitch = (
    field: string,
    declared: ViewType,
    definitions: Readonly<Record<string, ViewType>>,
    value: ViewValue | undefined,
    place: FieldPlace,
  ) => {
    // Every member is an object (memberSwitchField), so each is an option
    // and the item's value holds one of them.
    const options = choiceOptions(declared, definitions)!;
    const member = memberFor(declared, definitions, value);
    return (
      <Select
        name={`field-${placeKey(place)}-${field}`}
        label={propLabel(field)}
        value={options.find((option) => option.member === member)!.value}
        choices={options.map(({ value: option, label }) => ({
          value: option,
          label: label.replace(/…$/, ''),
        }))}
        rootAttributes={{
          [HOOK.field]: JSON.stringify(place),
          [HOOK.kind]: 'choice',
          'data-key': `${controlKey(place)}-${field}`,
        }}
      />
    );
  };

  /**
   * Inspector rows in their order, each run of one kind in its container:
   * fields in an inset list, open rows in a list, read-only values in a
   * table labeled `tableLabel`.
   */
  const inspectorRuns = (rows: readonly InspectorRow[], tableLabel: string) => {
    const runs: { kind: InspectorRow['kind']; rows: SafeHtml[] }[] = [];
    for (const { kind, row } of rows) {
      const last = runs.at(-1);
      if (last?.kind === kind) last.rows.push(row);
      else runs.push({ kind, rows: [row] });
    }
    return runs.map(({ kind, rows: run }) => {
      switch (kind) {
        case 'edit':
          return (
            <List controlInsets="trbl" gap>
              {run}
            </List>
          );
        case 'open':
          return <List>{run}</List>;
        case 'fixed':
          return (
            <ValueTable label={tableLabel} density="compact">
              {run}
            </ValueTable>
          );
      }
    });
  };

  /** An application's field editor for `type`, if one is registered. */
  const customFor = (type: ViewType | undefined) =>
    fieldEditorFor(type, fieldEditors);

  /**
   * What an application's field editor renders from (KF-EXA2WH): the value
   * at `place` in the selected node's prop, and how to change it.
   */
  const editorContext = (
    node: ViewNode,
    place: FieldPlace,
  ): FieldEditorContext => {
    const { definitions, type, value } = fieldContext(node, place);
    return {
      value,
      type: type!,
      definitions,
      commit: (next) => {
        writeField(place, next);
      },
      setAction: FIELD_SET_ACTION,
      set: (next) => ({
        'data-editor-step': JSON.stringify(place),
        'data-editor-value': next === undefined ? '' : JSON.stringify(next),
      }),
      control: (path, kind) => ({
        [HOOK.field]: JSON.stringify({
          prop: place.prop,
          path: [...place.path, ...path],
        }),
        [HOOK.kind]: kind,
      }),
      form: (path = []) =>
        objectForm(node, { prop: place.prop, path: [...place.path, ...path] }),
    };
  };

  return {
    fieldContext,
    opensEditor,
    stepLabel,
    fieldStep,
    isParamOrBind,
    inspectorRuns,
    customFor,
    editorContext,
  };
}
