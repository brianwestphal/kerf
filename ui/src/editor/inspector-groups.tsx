// KF-QWDPM3: the Properties area as a task directory. Its overview lists the
// selected node's groups, each a row that summarizes what the node sets;
// a row pushes that group's fields onto the Inspector as a page of their own.
import type { SafeHtml } from 'kerfjs';
import { ChevronRight } from 'lucide';

import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListInsetText } from '../components/collections/list-inset-text/list-inset-text.js';
import { ListItem } from '../components/collections/list-item/list-item.js';
import { SearchField } from '../components/forms/search-field/search-field.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { Text } from '../components/typography/text/text.js';
import { HOOK } from './dom-hooks.js';
import { propLabel } from './model/fields.js';
import {
  groupSummary,
  type InspectorProp,
  matchesQuery,
  type PropGroup,
  splitsIntoPages,
} from './model/inspector.js';
import {
  ALL_PROPERTIES,
  INSPECTOR_GROUP_ACTION,
  INSPECTOR_PANE,
  PROPERTIES_CLEAR_ACTION,
} from './shell-names.js';

/** Renders a run of the selected node's fields; `label` names the run. */
export type FieldsOf = (
  props: readonly InspectorProp[],
  label: string,
) => readonly SafeHtml[];

export interface PropertiesState {
  readonly groups: readonly PropGroup[];
  /** The selected node's props. */
  readonly values: Readonly<Record<string, unknown>>;
  /** Its problems by the prop each is about. */
  readonly problems: ReadonlyMap<string, string>;
  readonly fieldsOf: FieldsOf;
  /** The node's title, which names its runs of fields. */
  readonly title: string;
}

export interface PropertiesPage {
  readonly key: string;
  readonly toolbar: { readonly title: string };
  readonly pane: typeof INSPECTOR_PANE;
  readonly content: SafeHtml;
}

const problemCount = (count: number) =>
  count === 0 ? undefined : `${count} ${count === 1 ? 'problem' : 'problems'}`;

/** A row that opens the page at `path`, summarizing `props`. */
function groupRow(
  state: PropertiesState,
  path: readonly string[],
  props: readonly InspectorProp[],
) {
  const title = path.at(-1)!;
  const { description, problems } = groupSummary(
    props,
    state.values,
    state.problems,
    propLabel,
  );
  const status = problemCount(problems);
  return (
    <ListItem
      label={title}
      description={description}
      status={status}
      action={INSPECTOR_GROUP_ACTION}
      accessibleLabel={`${title}: ${description}${status ? `, ${status}` : ''}`}
      trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
      rootAttributes={{
        [HOOK.group]: path.join('/'),
        // The props the page holds, for finding a field's page.
        'data-editor-group-props': props.map((prop) => prop.name).join(' '),
      }}
    />
  );
}

/** The Properties overview's directory: a row per group, then All properties. */
export function propertiesDirectory(state: PropertiesState): SafeHtml {
  const every = state.groups.flatMap((group) => group.props);
  return (
    <List rootAttributes={{ 'data-key': 'editor-properties-directory' }}>
      {state.groups.map((group) => groupRow(state, [group.title], group.props))}
      <ListItem
        label={ALL_PROPERTIES}
        description={`Search all ${every.length} by name`}
        action={INSPECTOR_GROUP_ACTION}
        trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
        rootAttributes={{ [HOOK.group]: ALL_PROPERTIES }}
      />
    </List>
  );
}

const page = (path: readonly string[], content: SafeHtml): PropertiesPage => ({
  key: `properties-${path.join('-').replace(/[^A-Za-z0-9-]+/g, '-')}`,
  toolbar: { title: path.at(-1)! },
  pane: INSPECTOR_PANE,
  content,
});

/** A group's page: its own fields, then each task's, or a row per task. */
function groupPage(state: PropertiesState, group: PropGroup): SafeHtml {
  const split = splitsIntoPages(group);
  return (
    <List rootAttributes={{ 'data-editor-properties-page': group.title }}>
      {group.subgroups.map((subgroup) =>
        subgroup.title === undefined
          ? state.fieldsOf(subgroup.props, `${state.title} ${group.title}`)
          : split
            ? undefined
            : [
                <ListHeader
                  label={subgroup.title}
                  size="xs"
                  rootAttributes={{
                    'data-editor-prop-subgroup': `${group.title}/${subgroup.title}`,
                  }}
                />,
                ...state.fieldsOf(
                  subgroup.props,
                  `${state.title} ${group.title} ${subgroup.title}`,
                ),
              ],
      )}
      {split ? (
        <List>
          {group.subgroups.flatMap((subgroup) =>
            subgroup.title === undefined
              ? []
              : [
                  groupRow(
                    state,
                    [group.title, subgroup.title],
                    subgroup.props,
                  ),
                ],
          )}
        </List>
      ) : undefined}
    </List>
  );
}

/** The All properties page: a search, and every field that answers it. */
function allPropertiesPage(
  state: PropertiesState,
  query: string,
  revision: number,
): SafeHtml {
  const matching = state.groups.flatMap((group) => {
    const subgroups = group.subgroups.flatMap((subgroup) => {
      const props = subgroup.props.filter((prop) =>
        matchesQuery(
          prop,
          propLabel(prop.name),
          [group.title, subgroup.title ?? ''],
          query,
        ),
      );
      return props.length ? [{ title: subgroup.title, props }] : [];
    });
    return subgroups.length ? [{ title: group.title, subgroups }] : [];
  });
  return (
    <List rootAttributes={{ 'data-editor-properties-page': ALL_PROPERTIES }}>
      <List controlInsets="trbl">
        <SearchField
          id="editor-properties-search"
          label="Search Properties"
          placeholder="Search properties"
          query={query}
          revision={revision}
          clearAction={PROPERTIES_CLEAR_ACTION}
          clearLabel="Clear Search"
          editorAttributes={{
            [HOOK.propertiesSearch]: '',
            'data-nav-focus': '',
          }}
        />
      </List>
      {matching.length ? (
        matching.map((group) => [
          // Each field shows under the group and task it belongs to.
          ...group.subgroups.flatMap((subgroup) => [
            <ListHeader
              label={
                subgroup.title === undefined
                  ? group.title
                  : `${group.title} · ${subgroup.title}`
              }
              size="xs"
            />,
            ...state.fieldsOf(
              subgroup.props,
              `${state.title} ${group.title} ${subgroup.title ?? ''}`.trim(),
            ),
          ]),
        ])
      ) : (
        <ListInsetText>
          <Text tone="quiet">No properties match “{query}”.</Text>
        </ListInsetText>
      )}
    </List>
  );
}

/**
 * The pages open over the Inspector for `path`: a group's page, then a
 * task's, or the All properties page. A path naming nothing the node has
 * (a group of a type the selection left) opens none.
 */
export function propertiesPages(
  state: PropertiesState,
  path: readonly string[],
  query: string,
  revision: number,
): PropertiesPage[] {
  if (!path.length) return [];
  if (path[0] === ALL_PROPERTIES)
    return [page(path, allPropertiesPage(state, query, revision))];
  const group = state.groups.find((item) => item.title === path[0]);
  if (!group) return [];
  const pages = [page([group.title], groupPage(state, group))];
  const subgroup =
    path.length > 1 && splitsIntoPages(group)
      ? group.subgroups.find((item) => item.title === path[1])
      : undefined;
  if (subgroup)
    pages.push(
      page(
        [group.title, subgroup.title!],
        <List
          rootAttributes={{
            'data-editor-properties-page': `${group.title}/${subgroup.title}`,
          }}
        >
          {state.fieldsOf(
            subgroup.props,
            `${state.title} ${group.title} ${subgroup.title}`,
          )}
        </List>,
      ),
    );
  return pages;
}
