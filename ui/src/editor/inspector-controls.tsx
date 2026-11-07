// Editable Inspector controls and the field-opening rows.
import type { ViewNode, ViewValue } from '@kerfjs/ui/view';
import type { ReadonlySignal, SafeHtml, Signal } from 'kerfjs';
import { Ban, ChevronRight } from 'lucide';

import { Button } from '../components/actions/button/button.js';
import { ListItem } from '../components/collections/list-item/list-item.js';
import { CheckboxGroup } from '../components/forms/checkbox-group/checkbox-group.js';
import { Select } from '../components/forms/select/select.js';
import { Switch } from '../components/forms/switch/switch.js';
import { TagField } from '../components/forms/tag-field/tag-field.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { icons } from './canvas-renderer.js';
import { HOOK } from './dom-hooks.js';
import type { EditorContext } from './editor-context.js';
import { controlKey, type FieldPlace, placeKey } from './field-place.js';
import {
  AXES_SIZE,
  controlFor,
  type ControlKind,
  cssGrammar,
  cssHint,
  cssPlaceholder,
  CUSTOM_SIZE,
  isBinding,
  SIZE_AXES,
  typeLabel,
  valueChoices,
  valuePicker,
} from './model/controls.js';
import { findNode } from './model/document.js';
import { exampleValue, slotNamer, usedSlots } from './model/examples.js';
import { fieldEditorKind, fieldSummary, propLabel } from './model/fields.js';
import type { InspectorProp } from './model/inspector.js';
import {
  EXAMPLE_ACTION,
  FIELD_OPEN_ACTION,
  ICON_OPEN_ACTION,
  UNSET_ACTION,
} from './shell-names.js';

export interface InspectorControlState {
  readonly fieldProblems: ReadonlySignal<ReadonlyMap<string, string>>;
  readonly customSize: Signal<string>;
}

export function createInspectorControls(
  ctx: EditorContext,
  state: InspectorControlState,
) {
  const { definitionsOf, doc, fieldErrors, selectedNodeId } = ctx;
  const { fieldProblems, customSize } = state;
  /** One editable control for a prop, or a read-only row's worth of text. */
  const propControl = (
    prop: InspectorProp,
    value: ViewNode['props'] extends infer P
      ? P extends Record<string, infer V>
        ? V
        : never
      : never,
    /** The node's component key, whose catalog types the prop. */
    type: string,
    /** A field inside a prop (KF-Z9S029: object forms); the prop itself by default. */
    place: FieldPlace = { prop: prop.name, path: [] },
  ): SafeHtml | undefined => {
    const control = controlFor(prop, value, definitionsOf(type));
    const key = placeKey(place);
    const error =
      fieldErrors.value[key] ??
      (place.path.length ? undefined : fieldProblems.value.get(place.prop));
    // KF-9AWGPS: a value beside literal choices picks one of them, or
    // several when the value is an array (KF-8MEWP2).
    const owner =
      prop.name === 'value' && !place.path.length
        ? findNode(doc.value, selectedNodeId()!)!.node.props
        : undefined;
    const picker = owner
      ? valuePicker(prop.type as never, prop.required, owner)
      : undefined;
    const offered =
      owner && (picker!.multiple || !Array.isArray(value))
        ? valueChoices(owner, prop.choicesFrom)
        : undefined;
    if (offered && picker!.multiple && !isBinding(value as never)) {
      // A single value picked before `multiple` was on stays picked.
      const picked = (
        value === undefined ? [] : Array.isArray(value) ? value : [value]
      ).map((item) => JSON.stringify(item));
      return (
        <CheckboxGroup
          label={propLabel(prop.name)}
          name={`prop-${key}`}
          choices={offered.map((choice) => ({
            value: JSON.stringify(choice.value),
            label: choice.label,
          }))}
          value={picked}
          hint="Check every choice the value holds; none is an empty list."
          rootAttributes={{
            [HOOK.prop]: place.prop,
            [HOOK.kind]: 'value-choices',
            'data-key': controlKey(place),
          }}
        />
      );
    }
    if (offered && (value === undefined || !isBinding(value)))
      return (
        <Select
          name={`prop-${key}`}
          label={propLabel(prop.name)}
          value={value === undefined ? '' : JSON.stringify(value)}
          choices={[
            { value: '', label: 'Not set' },
            ...offered.map((choice) => ({
              value: JSON.stringify(choice.value),
              label: choice.label,
            })),
            // A required string with nothing chosen yet (KF-8MEWP2).
            ...(picker!.empty && !offered.some((choice) => choice.value === '')
              ? [{ value: '""', label: 'Empty ("")' }]
              : []),
            ...(value === undefined ||
            value === '' ||
            offered.some((choice) => choice.value === value)
              ? []
              : [
                  {
                    value: JSON.stringify(value),
                    label: `${String(value)} (not one of the choices)`,
                  },
                ]),
          ]}
          hint={
            value === undefined ||
            (picker!.empty && value === '') ||
            offered.some((choice) => choice.value === value)
              ? undefined
              : 'This value is not one of the choices; pick one.'
          }
          rootAttributes={{
            [HOOK.prop]: place.prop,
            [HOOK.kind]: 'value-choice',
            'data-key': controlKey(place),
          }}
        />
      );
    const marker = (kind: ControlKind) =>
      place.path.length
        ? {
            [HOOK.field]: JSON.stringify(place),
            [HOOK.kind]: kind,
            'data-key': controlKey(place),
          }
        : {
            [HOOK.prop]: place.prop,
            [HOOK.kind]: kind,
            'data-key': controlKey(place),
          };
    // KF-PE0PTT: a color field suggests color builders, not a length.
    const grammar = cssGrammar(prop.type as never, definitionsOf(type));
    const builderField = (raw: string) => (
      <TextField
        label={`${propLabel(prop.name)} value`}
        value={raw}
        hint={cssHint(prop.cssValue?.helpers, grammar)}
        placeholder={cssPlaceholder(prop.cssValue?.helpers, grammar)}
        error={error}
        rootAttributes={marker('css')}
      />
    );
    switch (control.kind) {
      case 'size': {
        // A keyword Select, and the builder field while the value is custom.
        // A field's size (a gap's axis) keeps its value until the builder
        // field sets one, so Custom… shows over it (KF-VA14AP).
        const custom =
          control.raw === CUSTOM_SIZE ||
          ((control.raw === '' || place.path.length > 0) &&
            customSize.value === `${selectedNodeId()} ${key}`);
        const sizeChoiceLabel = (choice: string): string => {
          if (choice === '')
            return prop.default !== undefined
              ? `Default (${String(prop.default)})`
              : 'Not set';
          switch (choice) {
            case CUSTOM_SIZE:
              return 'Custom…';
            case AXES_SIZE:
              return 'Columns and rows…';
            default:
              return choice;
          }
        };
        return (
          <>
            <Select
              name={`prop-${key}`}
              label={propLabel(prop.name)}
              value={custom ? CUSTOM_SIZE : String(control.raw)}
              choices={control.choices!.map((choice) => ({
                value: choice,
                label: sizeChoiceLabel(choice),
              }))}
              rootAttributes={marker('size')}
            />
            {custom ? builderField(control.css ?? '') : undefined}
            {/* KF-VA14AP: a `{ column, row }` gap, one size Select per axis. */}
            {control.raw === AXES_SIZE
              ? SIZE_AXES.map((axis) =>
                  propControl(
                    {
                      name: axis,
                      type: control.member as InspectorProp['type'],
                      required: true,
                    } as typeof prop,
                    (value as Record<string, ViewValue>)[axis] as typeof value,
                    type,
                    { prop: place.prop, path: [...place.path, axis] },
                  ),
                )
              : undefined}
          </>
        );
      }
      case 'select': {
        const choiceLabel = (choice: string): string => {
          if (choice === '')
            return prop.default !== undefined
              ? `Default (${String(prop.default)})`
              : 'Not set';
          if (prop.type.kind === 'boolean')
            return choice === 'true' ? 'On' : 'Off';
          return choice;
        };
        return (
          <Select
            name={`prop-${key}`}
            label={propLabel(prop.name)}
            value={String(control.raw)}
            choices={control.choices!.map((choice) => ({
              value: choice,
              label: choiceLabel(choice),
            }))}
            rootAttributes={marker('select')}
          />
        );
      }
      case 'switch':
        return (
          <Switch
            label={propLabel(prop.name)}
            checked={control.raw === true}
            rootAttributes={marker('switch')}
          />
        );
      case 'readonly':
        return undefined;
      case 'icon':
        return iconRow(propLabel(prop.name), String(control.raw), place);
      // KF-3CKTKN: a typed value from a Select, and an open member's own
      // control (text, a number, a list) or form (an object) beneath it.
      case 'choice': {
        const member = control.member && {
          name: propLabel(prop.name),
          type: control.member as InspectorProp['type'],
          required: false,
        };
        return (
          <>
            <Select
              name={`prop-${key}`}
              label={`${propLabel(prop.name)} type`}
              value={String(control.raw)}
              choices={[
                {
                  value: '',
                  label:
                    prop.default !== undefined
                      ? `Default (${String(prop.default)})`
                      : 'Not set',
                },
                ...control.options!.map(({ value, label }) => ({
                  value,
                  label,
                })),
              ]}
              rootAttributes={marker('choice')}
            />
            {member
              ? fieldEditorKind(member.type as never, definitionsOf(type)) ===
                'object'
                ? configureRow(propLabel(prop.name), value as ViewValue, place)
                : propControl(member, value, type, place)
              : undefined}
          </>
        );
      }
      // KF-A9ZHGW: strings edit inline as tags, enum values as checkboxes.
      case 'tags':
        return (
          <TagField
            id={`editor-tags-${key}`}
            label={propLabel(prop.name)}
            tags={JSON.parse(String(control.raw)) as string[]}
            error={error}
            rootAttributes={marker('tags')}
          />
        );
      case 'enum-set':
        return (
          <CheckboxGroup
            label={propLabel(prop.name)}
            name={`prop-${key}`}
            choices={control.choices!.map((choice) => ({
              value: choice,
              label: choice,
            }))}
            value={JSON.parse(String(control.raw)) as string[]}
            error={error}
            rootAttributes={marker('enum-set')}
          />
        );
      case 'list': {
        // A list or object literal as JSON (KF-HNNWN9), with a placeholder
        // to start from while a required one is unset.
        // Whether there is an example; Fill with example names its slots.
        const example = exampleValue(
          prop.type as never,
          definitionsOf(type),
          prop.name,
          slotNamer(usedSlots(doc.value)),
        );
        return (
          <>
            <TextField
              label={propLabel(prop.name)}
              value={String(control.raw)}
              multiline
              rows={control.raw === '' ? 2 : 4}
              maxRows={12}
              hint={`JSON for ${typeLabel(prop.type.text!)}.`}
              error={error}
              rootAttributes={marker('list')}
            />
            {prop.required &&
            control.raw === '' &&
            example !== undefined &&
            !place.path.length ? (
              <Button
                emphasis="secondary"
                size="compact"
                action={EXAMPLE_ACTION}
                rootAttributes={{ 'data-editor-example': prop.name }}
              >
                Fill with example
              </Button>
            ) : undefined}
          </>
        );
      }
      default: {
        // KF-3Y2GS2: an optional text prop's Not set toggle. A list's text
        // item is never unset in place (KF-CY1D5W).
        const unsettable =
          control.kind === 'text' &&
          !prop.required &&
          typeof place.path.at(-1) !== 'number';
        // KF-8FCJ02: a prop the overlay marks `textarea` holds line breaks;
        // Enter types one, and the field commits on change (blur).
        const multiline =
          control.kind === 'text' && prop.control === 'textarea';
        let placeholder: string | undefined;
        if (control.kind === 'css')
          placeholder = cssPlaceholder(prop.cssValue?.helpers, grammar);
        else if (prop.default !== undefined) placeholder = String(prop.default);
        else if (unsettable && value === undefined) placeholder = 'Not set';
        return (
          <TextField
            label={propLabel(prop.name)}
            value={String(control.raw)}
            type={control.kind === 'number' ? 'number' : 'text'}
            multiline={multiline}
            rows={multiline ? 3 : undefined}
            hint={
              control.kind === 'css'
                ? cssHint(prop.cssValue?.helpers, grammar)
                : undefined
            }
            placeholder={placeholder}
            error={error}
            toggle={
              unsettable
                ? {
                    label: 'Not set',
                    icon: <LucideIcon icon={Ban} name="ban" />,
                    pressed: value === undefined,
                    action: UNSET_ACTION,
                  }
                : undefined
            }
            rootAttributes={marker(control.kind)}
          />
        );
      }
    }
  };

  /**
   * The row that opens an object's form (KF-Z9S029): its name, what it
   * holds, and a chevron, in place of the JSON field.
   */
  const configureRow = (
    label: string,
    value: ViewValue | undefined,
    place: FieldPlace,
  ) => (
    <ListItem
      label={label}
      status={fieldSummary(value)}
      accessibleLabel={`Configure ${label.toLowerCase()}`}
      action={FIELD_OPEN_ACTION}
      trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
      rootAttributes={{ [HOOK.open]: JSON.stringify(place) }}
    />
  );

  /** A Lucide icon by its document name, or nothing for an unknown name. */
  const iconOf = (name: string) => {
    const node = icons[name] as Parameters<typeof LucideIcon>[0]['icon'];
    return node ? <LucideIcon icon={node} name={name} /> : undefined;
  };

  /**
   * The row that opens the icon picker for icon data (KF-VYRDDQ): the
   * chosen icon and its name, in place of the JSON field.
   */
  const iconRow = (label: string, name: string, place: FieldPlace) => (
    <ListItem
      label={label}
      icon={name ? iconOf(name) : undefined}
      status={name || 'Not set'}
      accessibleLabel={`Choose ${label.toLowerCase()}`}
      action={ICON_OPEN_ACTION}
      trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
      rootAttributes={{ 'data-editor-icon-place': JSON.stringify(place) }}
    />
  );

  return { propControl, configureRow, iconOf, iconRow };
}
