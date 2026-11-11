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
import { fieldLabel } from './model/fields.js';
import {
  groupSummary,
  type InspectorProp,
  matchesQuery,
  type PropGroup,
  splitsIntoPages,
} from './model/inspector.js';
import {
  ALL_PROPERTIES,
  BIND_STEP,
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
  /** How a field reads its value: "Not bound", or its param or item field. */
  readonly bindingOf: (prop: InspectorProp) => string;
  /** A field's Bind page (KF-FN28S3). */
  readonly bindPage: (prop: InspectorProp) => SafeHtml;
  /** What a group's page holds after its fields, such as data attributes. */
  readonly extra?: {
    readonly group: string;
    /** The props it edits, which count in the group's summary. */
    readonly props: readonly InspectorProp[];
    readonly content: SafeHtml;
  };
}

export interface PropertiesPage {
  readonly key: string;
  readonly toolbar: { readonly title: string };
  readonly pane: typeof INSPECTOR_PANE;
  readonly content: SafeHtml;
}

const problemCount = (count: number) =>
  count === 0 ? undefined : `${count} ${count === 1 ? 'problem' : 'problems'}`;

/**
 * KF-FPSWVF: fields shown under their task's heading or page title drop the
 * task's name from their labels ("Main toolbar" reads "Toolbar" on Main).
 * A label that is only the task's name keeps it; summaries, Bindings rows
 * and search still use the full label.
 */
function inTask(
  props: readonly InspectorProp[],
  task: string | undefined,
): readonly InspectorProp[] {
  if (task === undefined) return props;
  const prefix = `${task.toLowerCase()} `;
  return props.map((prop) => {
    const label = fieldLabel(prop);
    if (!label.toLowerCase().startsWith(prefix)) return prop;
    const rest = label.slice(prefix.length);
    return { ...prop, label: rest[0]!.toUpperCase() + rest.slice(1) };
  });
}

/** A row that opens the page at `path`, summarizing `props`. */
function groupRow(
  state: PropertiesState,
  path: readonly string[],
  props: readonly InspectorProp[],
) {
  const title = path.at(-1)!;
  const { description, problems } = groupSummary(
    state.extra?.group === path.join('/')
      ? [...props, ...state.extra.props]
      : props,
    state.values,
    state.problems,
    fieldLabel,
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

/**
 * KF-FN28S3: the page's fields' binding and promotion, a row per field
 * named for it and summarizing what it reads; a row opens its Bind page.
 */
function bindSection(
  state: PropertiesState,
  path: readonly string[],
  props: readonly InspectorProp[],
) {
  if (!props.length) return [];
  return [
    <ListHeader label="Bindings" size="xs" />,
    <List rootAttributes={{ 'data-editor-bind-rows': path.join('/') }}>
      {props.map((prop) => {
        const label = fieldLabel(prop);
        const binding = state.bindingOf(prop);
        return (
          <ListItem
            label={label}
            description={binding}
            action={INSPECTOR_GROUP_ACTION}
            accessibleLabel={`Bind or promote ${label.toLowerCase()}: ${binding}`}
            trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
            rootAttributes={{
              [HOOK.group]: [...path, `${BIND_STEP}${prop.name}`].join('/'),
              'data-editor-bind-row': prop.name,
            }}
          />
        );
      })}
    </List>,
  ];
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

const page = (
  path: readonly string[],
  content: SafeHtml,
  title = path.at(-1)!,
): PropertiesPage => ({
  key: `properties-${path
    .map((step) =>
      step
        .replace(/[^A-Za-z0-9]+/g, ' ')
        .trim()
        .replace(/ /g, '-'),
    )
    .join('-')}`,
  toolbar: { title },
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
                  inTask(subgroup.props, subgroup.title),
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
      {state.extra?.group === group.title ? state.extra.content : undefined}
      {bindSection(
        state,
        [group.title],
        split
          ? group.subgroups.flatMap((subgroup) =>
              subgroup.title === undefined ? subgroup.props : [],
            )
          : group.props,
      )}
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
          fieldLabel(prop),
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
              inTask(subgroup.props, subgroup.title),
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
 * task's, or the All properties page, then a field's Bind page. A path
 * naming nothing the node has (a group of a type the selection left) opens
 * none past what it does have.
 */
export function propertiesPages(
  state: PropertiesState,
  path: readonly string[],
  query: string,
  revision: number,
): PropertiesPage[] {
  if (!path.length) return [];
  const pages: PropertiesPage[] = [];
  let rest = path.slice(1);
  if (path[0] === ALL_PROPERTIES)
    pages.push(
      page([ALL_PROPERTIES], allPropertiesPage(state, query, revision)),
    );
  else {
    const group = state.groups.find((item) => item.title === path[0]);
    if (!group) return [];
    pages.push(page([group.title], groupPage(state, group)));
    // A task's title is never undefined, which names the group's own fields.
    const subgroup =
      rest[0] !== undefined && splitsIntoPages(group)
        ? group.subgroups.find((item) => item.title === rest[0])
        : undefined;
    if (subgroup) {
      const at = [group.title, subgroup.title!];
      pages.push(
        page(
          at,
          <List
            rootAttributes={{ 'data-editor-properties-page': at.join('/') }}
          >
            {state.fieldsOf(
              inTask(subgroup.props, subgroup.title),
              `${state.title} ${group.title} ${subgroup.title}`,
            )}
            {bindSection(state, at, subgroup.props)}
          </List>,
        ),
      );
      rest = rest.slice(1);
    }
  }
  const step = rest[0];
  const name = step?.startsWith(BIND_STEP)
    ? step.slice(BIND_STEP.length)
    : undefined;
  // A field the node lacks (a path kept past its node) opens no page.
  const prop = state.groups
    .flatMap((group) => group.props)
    .find((item) => item.name === name);
  if (prop)
    pages.push(
      page(
        path.slice(0, path.length - rest.length + 1),
        state.bindPage(prop),
        `Bind ${fieldLabel(prop)}`,
      ),
    );
  return pages;
}
