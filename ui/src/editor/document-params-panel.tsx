// The Document rail's direct authoring surface for typed view inputs.
import type { ViewDocument, ViewType } from '@kerfjs/ui/view';

import { Button } from '../components/actions/button/button.js';
import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListInsetText } from '../components/collections/list-inset-text/list-inset-text.js';
import { StateBanner } from '../components/feedback/state-banner/state-banner.js';
import { Select } from '../components/forms/select/select.js';
import { Switch } from '../components/forms/switch/switch.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { Text } from '../components/typography/text/text.js';
import { paramIsReferenced } from './model/params.js';

export const CREATE_PARAM_ACTION = 'editor-create-document-param';
export const REMOVE_PARAM_ACTION = 'editor-remove-document-param';
export const ADD_PARAM_FIELD_ACTION = 'editor-add-document-param-field';
export const REMOVE_PARAM_FIELD_ACTION = 'editor-remove-document-param-field';

export const PARAM_EDIT = 'data-editor-document-param-edit';
export const PARAM_NEW = 'data-editor-document-param-new';
export const PARAM_REMOVE = 'data-editor-document-param-remove';
export const PARAM_FIELD = 'data-editor-document-param-field';

export type ParamEdit = {
  readonly name: string;
  readonly part:
    | 'name'
    | 'type'
    | 'itemType'
    | 'defaultEnabled'
    | 'default'
    | 'enumValues'
    | 'literalValue'
    | 'fieldName'
    | 'fieldType'
    | 'fieldRequired';
  readonly index?: number;
};

const edit = (at: ParamEdit) => ({ [PARAM_EDIT]: JSON.stringify(at) });
const kindChoices = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'content', label: 'Content' },
  { value: 'array', label: 'List' },
  { value: 'object', label: 'Object' },
  { value: 'enum', label: 'Choice' },
  { value: 'literal', label: 'Literal' },
];
const itemChoices = kindChoices.filter(({ value }) =>
  ['string', 'number', 'boolean', 'object'].includes(value),
);
const fieldChoices = kindChoices.filter(({ value }) =>
  ['string', 'number', 'boolean'].includes(value),
);

const choicesFor = (
  choices: readonly { value: string; label: string }[],
  value: string,
) =>
  choices.some((choice) => choice.value === value)
    ? choices
    : [{ value, label: value }, ...choices];

function fieldSchema(name: string, type: ViewType) {
  const item = type.kind === 'array' ? type.items : type;
  if (item?.kind !== 'object') return undefined;
  return (
    <List gap rootAttributes={{ 'data-editor-param-schema': name }}>
      <ListHeader label="Item fields" size="xs" />
      {(item.props ?? []).map((field, index) => (
        <List
          gap
          controlInsets="trbl"
          rootAttributes={{ 'data-editor-param-field-row': `${name}:${index}` }}
        >
          <TextField
            label={`Field ${index + 1} name`}
            value={field.name}
            rootAttributes={edit({ name, part: 'fieldName', index })}
          />
          <Select
            name={`param-${name}-field-${index}-type`}
            label="Field type"
            value={field.type.kind}
            choices={choicesFor(fieldChoices, field.type.kind)}
            rootAttributes={edit({ name, part: 'fieldType', index })}
          />
          <Switch
            label="Required"
            checked={field.required}
            rootAttributes={edit({ name, part: 'fieldRequired', index })}
          />
          <Button
            emphasis="secondary"
            size="compact"
            action={REMOVE_PARAM_FIELD_ACTION}
            rootAttributes={{ [PARAM_FIELD]: JSON.stringify({ name, index }) }}
          >
            Remove field
          </Button>
        </List>
      ))}
      <List controlInsets="trbl">
        <Button
          emphasis="secondary"
          size="compact"
          action={ADD_PARAM_FIELD_ACTION}
          rootAttributes={{ [PARAM_FIELD]: JSON.stringify({ name }) }}
        >
          Add field
        </Button>
      </List>
    </List>
  );
}

const defaultText = (value: unknown, kind: string) =>
  ['string', 'content', 'number'].includes(kind)
    ? String(value)
    : (JSON.stringify(value) ?? '');

export function documentParamsPanel(
  document: ViewDocument,
  newName: string,
  newKind: string,
  errors: Readonly<Record<string, string>>,
) {
  const params = Object.entries(document.params ?? {});
  return (
    <List gap rootAttributes={{ 'data-editor-document-params': '' }}>
      <ListHeader
        label="Parameters"
        count={params.length}
        countLabel="parameters"
      />
      {params.length ? (
        params.map(([name, param]) => {
          const type = param.type;
          const hasDefault = Object.hasOwn(param, 'default');
          const referenced = paramIsReferenced(document, name);
          return (
            <List gap rootAttributes={{ 'data-editor-param-row': name }}>
              <ListHeader label={name} size="xs" />
              {errors[`#doc-param:${name}`] ? (
                <StateBanner
                  tone="warning"
                  title={errors[`#doc-param:${name}`]!}
                />
              ) : undefined}
              <List gap controlInsets="trbl">
                <TextField
                  label="Name"
                  value={name}
                  error={errors[`#doc-param:${name}`]}
                  rootAttributes={edit({ name, part: 'name' })}
                />
                <Select
                  name={`param-${name}-type`}
                  label="Type"
                  value={type.kind}
                  choices={choicesFor(kindChoices, type.kind)}
                  rootAttributes={edit({ name, part: 'type' })}
                />
                {type.kind === 'array' ? (
                  <Select
                    name={`param-${name}-item-type`}
                    label="Item type"
                    value={type.items?.kind ?? 'string'}
                    choices={choicesFor(
                      itemChoices,
                      type.items?.kind ?? 'string',
                    )}
                    rootAttributes={edit({ name, part: 'itemType' })}
                  />
                ) : undefined}
                {type.kind === 'enum' ? (
                  <TextField
                    label="Choices (JSON array)"
                    value={JSON.stringify(type.values ?? [])}
                    rootAttributes={edit({ name, part: 'enumValues' })}
                  />
                ) : undefined}
                {type.kind === 'literal' ? (
                  <TextField
                    label="Literal (JSON value)"
                    value={JSON.stringify(type.value)}
                    rootAttributes={edit({ name, part: 'literalValue' })}
                  />
                ) : undefined}
                {type.kind === 'prop' ? (
                  <Text tone="quiet">
                    This input uses {type.component}.{type.prop} from the
                    component catalog.
                  </Text>
                ) : undefined}
                {fieldSchema(name, type)}
                <Switch
                  label="Use default"
                  checked={hasDefault}
                  disabled={
                    !hasDefault &&
                    (type.kind === 'prop' ||
                      (type.kind === 'content' && !type.acceptsText))
                  }
                  rootAttributes={edit({ name, part: 'defaultEnabled' })}
                />
                {type.kind === 'content' && !type.acceptsText && !hasDefault ? (
                  <Text tone="quiet">
                    Content inputs are supplied by the app and cannot have a
                    JSON default.
                  </Text>
                ) : undefined}
                {hasDefault ? (
                  type.kind === 'boolean' ? (
                    <Select
                      name={`param-${name}-default`}
                      label="Default value"
                      value={param.default === true ? 'true' : 'false'}
                      choices={[
                        { value: 'false', label: 'False' },
                        { value: 'true', label: 'True' },
                      ]}
                      rootAttributes={edit({ name, part: 'default' })}
                    />
                  ) : (
                    <TextField
                      label="Default value"
                      value={defaultText(param.default, type.kind)}
                      hint={
                        ['array', 'object', 'enum', 'literal', 'prop'].includes(
                          type.kind,
                        )
                          ? 'Enter a JSON value matching this type.'
                          : undefined
                      }
                      error={errors[`#doc-param:${name}:default`]}
                      rootAttributes={edit({ name, part: 'default' })}
                    />
                  )
                ) : undefined}
                <Button
                  emphasis="secondary"
                  size="compact"
                  action={REMOVE_PARAM_ACTION}
                  disabled={referenced}
                  rootAttributes={{ [PARAM_REMOVE]: name }}
                >
                  Remove parameter
                </Button>
                {referenced ? (
                  <Text tone="quiet">
                    Remove this parameter’s bindings before deleting it.
                  </Text>
                ) : undefined}
              </List>
            </List>
          );
        })
      ) : (
        <ListInsetText>
          <Text tone="quiet">This document has no parameters yet.</Text>
        </ListInsetText>
      )}
      <ListHeader label="Add parameter" size="xs" />
      <List gap controlInsets="trbl">
        <TextField
          label="Name"
          value={newName}
          error={errors['#doc-param-new']}
          rootAttributes={{ [PARAM_NEW]: 'name' }}
        />
        <Select
          name="new-document-param-type"
          label="Type"
          value={newKind}
          choices={kindChoices.filter(
            ({ value }) => value !== 'enum' && value !== 'literal',
          )}
          rootAttributes={{ [PARAM_NEW]: 'type' }}
        />
        <Button action={CREATE_PARAM_ACTION}>Add parameter</Button>
      </List>
    </List>
  );
}
