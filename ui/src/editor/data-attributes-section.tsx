// The Inspector's name/value form for a node's application data attributes.
import type { ViewNode, ViewValue } from '@kerfjs/ui/view';
import { Plus, Trash } from 'lucide';

import { Button } from '../components/actions/button/button.js';
import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListInsetText } from '../components/collections/list-inset-text/list-inset-text.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { Grid } from '../components/layout/grid/grid.js';
import { Row } from '../components/layout/row/row.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { Text } from '../components/typography/text/text.js';
import { px } from '../shared/styles/css-values.js';
import type { PropsComponent } from './catalog.js';
import { HOOK } from './dom-hooks.js';
import type { EditorContext } from './editor-context.js';
import {
  DATA_ATTRIBUTES_PROP,
  dataAttributes,
} from './model/data-attributes.js';
import { formatValue } from './model/inspector.js';
import {
  DATA_ATTRIBUTE_ADD_ACTION,
  DATA_ATTRIBUTE_REMOVE_ACTION,
} from './shell-names.js';

/** The node's unreserved data-* fields, or nothing without this prop. */
export function dataAttributesSection(
  ctx: EditorContext,
  node: ViewNode,
  component: PropsComponent,
) {
  const prop = component.props.find(
    (item) => item.name === DATA_ATTRIBUTES_PROP,
  );
  if (!prop) return undefined;
  const value = node.props?.[DATA_ATTRIBUTES_PROP] as ViewValue | undefined;
  const attributes = dataAttributes(value);
  // A hand-edited document's KUI-V015 shows at the name it is about.
  const problems = new Map(
    ctx.currentProblems.value
      .filter(({ nodeId }) => nodeId === node.id)
      .map(({ diagnostic }) => [
        diagnostic.path.split(`.props.${DATA_ATTRIBUTES_PROP}.`)[1],
        diagnostic.message,
      ]),
  );
  return (
    <>
      <ListHeader label="Data attributes" size="xs" />
      <List rootAttributes={{ 'data-key': 'editor-data-attributes' }}>
        {attributes === undefined || !attributes.length ? (
          <ListInsetText>
            <Text tone="quiet">
              {attributes
                ? "Application data-* identity on the component's root, such as data-band."
                : `${formatValue(value!)}; edit it where it is set.`}
            </Text>
          </ListInsetText>
        ) : undefined}
        {attributes === undefined ? undefined : (
          <List controlInsets="trbl" gap>
            {attributes.map(([name, text], index) => (
              <Row
                gap="s"
                vAlign="bottom"
                rootAttributes={{
                  'data-key': `editor-data-attribute-${index}`,
                }}
              >
                <Grid minColumnWidth={px(128)} gap="s" flex>
                  <TextField
                    label="Name"
                    value={name}
                    error={
                      ctx.fieldErrors.value[`#data-attribute-${index}`] ??
                      problems.get(name)
                    }
                    spellcheck={false}
                    autocapitalize="off"
                    rootAttributes={{
                      [HOOK.attribute]: `${index}`,
                      'data-editor-attribute-part': 'name',
                    }}
                  />
                  <TextField
                    label="Value"
                    value={text}
                    rootAttributes={{
                      [HOOK.attribute]: `${index}`,
                      'data-editor-attribute-part': 'value',
                    }}
                  />
                </Grid>
                <Button
                  emphasis="plain"
                  ariaLabel={`Remove ${name}`}
                  icon={<LucideIcon icon={Trash} name="trash" />}
                  action={DATA_ATTRIBUTE_REMOVE_ACTION}
                  rootAttributes={{
                    'data-editor-attribute-remove': `${index}`,
                  }}
                />
              </Row>
            ))}
            <Button
              emphasis="secondary"
              size="compact"
              icon={<LucideIcon icon={Plus} name="plus" />}
              action={DATA_ATTRIBUTE_ADD_ACTION}
            >
              Add data attribute
            </Button>
          </List>
        )}
      </List>
    </>
  );
}
