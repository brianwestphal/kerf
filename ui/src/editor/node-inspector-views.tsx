// Inspector views for a selected document node or composed #view.
import type { ViewNode } from '@kerfjs/ui/view';
import type { ReadonlySignal, SafeHtml, Signal } from 'kerfjs';
import { ChevronRight, CopyPlus } from 'lucide';

import { Button } from '../components/actions/button/button.js';
import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListInsetText } from '../components/collections/list-inset-text/list-inset-text.js';
import { ListItem } from '../components/collections/list-item/list-item.js';
import { ValueTableRow } from '../components/data-display/value-table/value-table.js';
import { StateBanner } from '../components/feedback/state-banner/state-banner.js';
import { Select } from '../components/forms/select/select.js';
import { TextField } from '../components/forms/text-field/text-field.js';
import { LucideIcon } from '../components/media/lucide-icon/lucide-icon.js';
import { Text } from '../components/typography/text/text.js';
import type { PropsComponent } from './catalog.js';
import { addSlotFields, controlFlowSection } from './control-flow-section.js';
import { dataAttributesSection } from './data-attributes-section.js';
import { HOOK } from './dom-hooks.js';
import type { EditorContext } from './editor-context.js';
import { embedSection, extractSection } from './embed-extract-views.js';
import type { createFieldEditorViews } from './field-editor-views.js';
import { inspectorBindSection } from './inspector-bind-section.js';
import type { createInspectorControls } from './inspector-controls.js';
import {
  propertiesDirectory,
  propertiesPages,
  type PropertiesState,
} from './inspector-groups.js';
import { controlFor, isBinding } from './model/controls.js';
import { findNode } from './model/document.js';
import {
  isMovable,
  paramTypeFor,
  primaryFirst,
  type ZoneOption,
} from './model/edits.js';
import {
  appParamFor,
  fieldEditorKind,
  isAppSupplied,
  propLabel,
} from './model/fields.js';
import type { InspectorProp } from './model/inspector.js';
import { groupedProps, inspectorSections } from './model/inspector.js';
import { zoneLabel } from './model/outline.js';
import { rowDesignChoices } from './model/row-designs.js';
import { viewPath } from './model/views.js';
import {
  ADD_ACTION,
  DUPLICATE_ACTION,
  INSERT_DOCUMENT,
  INSPECTOR_TAB_ACTION,
  type InspectorArea,
  type InspectorRow,
  OPEN_VIEW_ACTION,
  PROMOTE_ACTION,
  PROMOTE_PROP_ACTION,
  TEXT_RUN,
} from './shell-names.js';

type FieldViews = ReturnType<typeof createFieldEditorViews>;
type InspectorControls = ReturnType<typeof createInspectorControls>;

export interface NodeInspectorState {
  readonly documentPath: () => string | undefined;
  readonly propControl: InspectorControls['propControl'];
  readonly configureRow: InspectorControls['configureRow'];
  readonly inspectorRuns: FieldViews['inspectorRuns'];
  readonly customFor: FieldViews['customFor'];
  readonly opensEditor: FieldViews['opensEditor'];
  readonly moveSection: (node: ViewNode) => SafeHtml | undefined;
  readonly viewsSection: (node: ViewNode) => SafeHtml | undefined;
  readonly contentControl: (
    node: ViewNode,
    prop: InspectorProp,
  ) => SafeHtml | undefined;
  readonly nodeContentRow: (node: ViewNode, prop: string) => SafeHtml;
  readonly zonesOf: (node: ViewNode, wanted?: string) => ZoneOption[];
  readonly addableIn: (
    zone:
      | { readonly key?: string; readonly accepts?: readonly string[] }
      | undefined,
    parent?: string,
  ) => { value: string; label: string; group?: string }[];
  readonly replaceRootSection: () => SafeHtml;
  readonly areaTabs: (
    id: string,
    label: string,
    action: string,
    current: InspectorArea,
    allocation: 'fill' | 'intrinsic',
    areas: readonly {
      area: InspectorArea;
      name: string;
      trailing?: SafeHtml;
      panel: unknown;
    }[],
  ) => SafeHtml[];
  readonly extractBlocked: (id: string) => string | undefined;
  readonly embedFirstLegal: ReadonlySignal<ReadonlySet<string>>;
  readonly bindProp: Signal<string>;
  readonly addZone: Signal<string>;
  readonly addComponent: Signal<string>;
  readonly promoteProp: Signal<string>;
  /** The selected node's problems by prop (KF-H782W9). */
  readonly fieldProblems: ReadonlySignal<ReadonlyMap<string, string>>;
}

export function createNodeInspectorViews(
  ctx: EditorContext,
  state: NodeInspectorState,
) {
  const {
    autosave,
    catalog,
    currentProblems,
    definitionsOf,
    doc,
    fieldErrors,
    inspectorArea,
    inspectorGroup,
    propertiesQuery,
    propertiesQueryRevision,
    propsEntryOf,
    resolveView,
  } = ctx;
  const { viewCatalog } = catalog;
  const {
    documentPath,
    propControl,
    configureRow,
    inspectorRuns,
    customFor,
    opensEditor,
    moveSection,
    viewsSection,
    contentControl,
    nodeContentRow,
    zonesOf,
    addableIn,
    replaceRootSection,
    areaTabs,
    extractBlocked,
    embedFirstLegal,
    bindProp,
    addZone,
    addComponent,
    promoteProp,
    fieldProblems,
  } = state;
  /**
   * KF-5N26H6: the inspector for a `#view` node: the document it composes,
   * with Open document, and one field per param of that document, which
   * binds as any prop does (a row's `item.title`).
   */
  const viewEditor = (node: ViewNode, title: string) => {
    const src = node.src ?? '';
    const base = documentPath();
    const path = base === undefined ? undefined : viewPath(base, src);
    const composed = resolveView(src);
    const entry = propsEntryOf(node)!;
    const props = node.props ?? {};
    const own = currentProblems.value.filter(
      (problem) => problem.nodeId === node.id,
    );
    const rows = entry.props.map((prop): InspectorRow => {
      const value = props[prop.name] as never;
      const control = propControl(prop, value, node.type);
      if (control) return { kind: 'edit', row: control };
      const param = (value as { $param?: unknown } | undefined)?.$param;
      if (typeof param === 'string')
        return {
          kind: 'edit',
          row: (
            <TextField
              label={`${propLabel(prop.name)} param`}
              value={param}
              hint="Renaming the param updates every prop that uses it."
              error={fieldErrors.value[`#param:${param}`]}
              rootAttributes={{ [HOOK.param]: param }}
            />
          ),
        };
      return {
        kind: 'fixed',
        row: (
          <ValueTableRow
            label={propLabel(prop.name)}
            value={
              inspectorSections(node, {
                ...entry,
                props: [prop],
                groups: [],
              })[0]!.rows[0]!.value
            }
          />
        ),
      };
    });
    const properties = (
      <List>
        {own.length ? (
          <List
            controlInsets="trbl"
            gap
            rootAttributes={{ 'data-key': 'editor-node-problems' }}
          >
            {own.map(({ diagnostic }) => (
              <StateBanner
                tone="warning"
                title={diagnostic.message}
                detail={diagnostic.code}
                rootAttributes={{ 'data-editor-node-problem': diagnostic.code }}
              />
            ))}
          </List>
        ) : undefined}
        <ListHeader label="Document" size="xs" />
        <List>
          <ListItem
            label={composed?.name ?? src}
            description={path ?? src}
            status="Open document"
            accessibleLabel={`Open document ${path ?? src}`}
            action={OPEN_VIEW_ACTION}
            disabled={!composed}
            trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
            rootAttributes={{ 'data-editor-open-view': src }}
          />
        </List>
        <ListHeader
          label="Params"
          size="xs"
          count={entry.props.length}
          countLabel="params"
        />
        {rows.length ? (
          inspectorRuns(rows, `${title} Params`)
        ) : (
          <ListInsetText>
            <Text tone="quiet">
              {composed
                ? 'This document takes no params.'
                : 'Its params show once the document loads.'}
            </Text>
          </ListInsetText>
        )}
        {inspectorBindSection(ctx, bindProp, node, entry)}
        {moveSection(node)}
      </List>
    );
    return {
      header: (
        <List>
          <ListHeader
            label={title}
            action={DUPLICATE_ACTION}
            actionLabel="Duplicate"
            actionIcon={<LucideIcon icon={CopyPlus} name="copy-plus" />}
            actionDisabled={!isMovable(doc.value, node.id).placed}
            disabledReason="The root has no place to copy it beside."
          />
        </List>
      ),
      content: properties,
    };
  };

  /** The inspector for a selected node: name, editable props, add child. */
  const nodeEditor = (
    node: ViewNode,
    component: PropsComponent,
    title: string,
  ) => {
    const props = node.props ?? {};
    const promotable = component.props.filter(
      (prop) =>
        prop.control !== 'hidden' &&
        !prop.zone &&
        (paramTypeFor(prop.type as never) ??
          appParamFor(node.type, prop, definitionsOf(node.type))) !==
          undefined &&
        // A literal promotes; a bound prop is already a param.
        !isBinding(props[prop.name]),
    );
    const zones = zonesOf(node, addZone.value);
    const zone =
      zones.find(
        (option) => option.key === addZone.value && !option.disabledReason,
      ) ?? primaryFirst(zones).find((option) => !option.disabledReason);
    // KF-YBMVVM: a zone that takes text takes a text run beside its nodes.
    const takesText = component.props.some(
      (prop) =>
        prop.name === zone?.key &&
        prop.slot &&
        (prop.type as { acceptsText?: true }).acceptsText,
    );
    const components = addableIn(zone, node.type);
    const addable = [
      ...components,
      // Last, in a group of its own after the components' groups.
      ...(takesText
        ? [{ value: TEXT_RUN, label: 'Text run', group: 'Text' }]
        : []),
      // KF-PX5EVZ: a composed document, which storage reads.
      ...(autosave
        ? [
            {
              value: INSERT_DOCUMENT,
              label: 'Existing document…',
              group: 'Documents',
            },
          ]
        : []),
    ];
    // What can show otherwise: what the zone holding this node accepts.
    const parent = findNode(doc.value, node.id)?.ancestors.at(-1);
    const otherwiseChoices = parent
      ? addableIn(
          zonesOf(parent.node).find((option) => option.key === parent.zone),
          parent.node.type,
        )
      : [];
    const chosen =
      addable.find((item) => item.value === addComponent.value) ?? addable[0];
    // An object prop opens its form from a Configure row (KF-Z9S029).
    // Icon data opens the icon picker from its row (KF-VYRDDQ).
    // An app's editor for the type opens the same way (KF-EXA2WH).
    const opens = (prop: InspectorProp) =>
      (!isBinding(props[prop.name]) &&
        (Boolean(customFor(prop.type as never)) ||
          opensEditor(
            fieldEditorKind(
              prop.type as never,
              definitionsOf(node.type),
              prop.iconSource,
            ),
          ))) ||
      controlFor(prop, props[prop.name], definitionsOf(node.type)).kind ===
        'icon';
    // KF-DQFXWG: rows keep the group's prop order, so a required
    // icon row is not pushed below every field; runs of one kind share
    // a container.
    const rowsOf = (group: readonly InspectorProp[]) =>
      group.flatMap((prop): InspectorRow[] => {
        const value = props[prop.name] as never;
        if (opens(prop))
          return [
            {
              kind: 'open' as const,
              row:
                controlFor(prop, value, definitionsOf(node.type)).kind ===
                'icon'
                  ? propControl(prop, value, node.type)!
                  : configureRow(propLabel(prop.name), value, {
                      prop: prop.name,
                      path: [],
                    }),
            },
          ];
        // KF-D85GY0: what the app supplies promotes from its own row.
        if (
          !isBinding(value) &&
          isAppSupplied(prop.type as never, definitionsOf(node.type))
        )
          return [
            {
              kind: 'open',
              row: (
                <ListItem
                  label={propLabel(prop.name)}
                  description="The app supplies it"
                  status="Promote to a param"
                  accessibleLabel={`Promote ${propLabel(prop.name).toLowerCase()} to a param`}
                  action={PROMOTE_PROP_ACTION}
                  trailing={
                    <LucideIcon icon={ChevronRight} name="chevron-right" />
                  }
                  rootAttributes={{
                    'data-editor-promote-prop': prop.name,
                  }}
                />
              ),
            },
          ];
        // A content prop that takes only nodes is a row (KF-5T3TE4).
        if (
          prop.slot &&
          prop.name !== 'children' &&
          !(prop.type as { acceptsText?: true }).acceptsText
        )
          return [{ kind: 'open', row: nodeContentRow(node, prop.name) }];
        const control =
          contentControl(node, prop) ?? propControl(prop, value, node.type);
        if (control) return [{ kind: 'edit' as const, row: control }];
        // KF-1HEZZZ: a prop bound to a param names that param, and
        // renaming it here renames the param and every use of it.
        const param = (value as { $param?: unknown } | undefined)?.$param;
        if (typeof param === 'string')
          return [
            {
              kind: 'edit' as const,
              row: (
                <TextField
                  label={`${propLabel(prop.name)} param`}
                  value={param}
                  hint="Renaming the param updates every prop that uses it."
                  error={fieldErrors.value[`#param:${param}`]}
                  rootAttributes={{ [HOOK.param]: param }}
                />
              ),
            },
          ];
        // propControl leaves only a read-only prop without a control.
        return [
          {
            kind: 'fixed' as const,
            row: (
              <ValueTableRow
                label={propLabel(prop.name)}
                value={
                  inspectorSections(node, {
                    ...component,
                    props: [prop],
                    groups: [],
                  })[0]!.rows[0]!.value
                }
              />
            ),
          },
        ];
      });
    // KF-QWDPM3: Properties lists the node's groups; each opens as a page.
    const propertiesState: PropertiesState = {
      groups: groupedProps(component),
      values: props,
      problems: fieldProblems.value,
      fieldsOf: (group, label) => inspectorRuns(rowsOf(group), label),
      title,
    };
    // KF-H782W9: the node's own problems lead its Properties.
    const own = currentProblems.value.filter(
      (problem) => problem.nodeId === node.id,
    );
    const properties = (
      <List>
        {own.length ? (
          <List
            controlInsets="trbl"
            gap
            rootAttributes={{ 'data-key': 'editor-node-problems' }}
          >
            {own.map(({ diagnostic }) => (
              <StateBanner
                tone="warning"
                title={diagnostic.message}
                detail={diagnostic.code}
                rootAttributes={{ 'data-editor-node-problem': diagnostic.code }}
              />
            ))}
          </List>
        ) : undefined}
        <List
          controlInsets="trbl"
          rootAttributes={{ 'data-key': 'editor-ref-name' }}
        >
          <TextField
            label="Ref name"
            value={node.name ?? ''}
            hint="A name makes the node a typed ref in the generated module."
            error={fieldErrors.value['#name']}
            rootAttributes={{ [HOOK.name]: 'true' }}
          />
        </List>
        {propertiesDirectory(propertiesState)}
        {dataAttributesSection(ctx, node, component)}
        {promotable.length ? (
          <>
            <ListHeader label="Promote to a param" size="xs" />
            <List controlInsets="trbl" gap>
              <Select
                name="promote-prop"
                label="Prop"
                value={
                  promotable.some((prop) => prop.name === promoteProp.value)
                    ? promoteProp.value
                    : promotable[0]!.name
                }
                choices={promotable.map((prop) => ({
                  value: prop.name,
                  label: propLabel(prop.name),
                }))}
                rootAttributes={{ [HOOK.promote]: 'true' }}
              />
              <Button
                emphasis="secondary"
                size="compact"
                action={PROMOTE_ACTION}
              >
                Promote
              </Button>
            </List>
          </>
        ) : undefined}
        {inspectorBindSection(ctx, bindProp, node, component)}
      </List>
    );
    const flow = (
      <List>
        {controlFlowSection(
          doc.value,
          viewCatalog,
          node.id,
          fieldErrors.value['#item'],
          otherwiseChoices,
          rowDesignChoices(viewCatalog, otherwiseChoices),
          fieldErrors.value['#kind'],
          fieldErrors.value['#new-kind'],
        )}
        {viewsSection(node)}
        {embedSection({ catalog, legal: embedFirstLegal })}
        {extractSection(node, extractBlocked)}
        {moveSection(node)}
      </List>
    );
    const children = (
      <List>
        <ListHeader label="Add a child" size="xs" />
        {zones.length && zone ? (
          <List controlInsets="trbl" gap>
            <Select
              name="add-zone"
              label="Zone"
              value={zone.key}
              choices={zones.map((option) => ({
                value: option.key,
                label: zoneLabel(option.key),
                ...(option.disabledReason
                  ? { disabled: true, disabledReason: option.disabledReason }
                  : {}),
              }))}
              rootAttributes={{ [HOOK.add]: 'zone' }}
            />
            <Select
              name="add-component"
              label="Component"
              value={chosen?.value ?? ''}
              choices={addable}
              rootAttributes={{ [HOOK.add]: 'component' }}
            />
            <Button emphasis="secondary" size="compact" action={ADD_ACTION}>
              Add
            </Button>
          </List>
        ) : (
          <ListInsetText>
            <Text tone="quiet">
              {zones.length
                ? 'Every zone of this component is full.'
                : 'This component takes no children.'}
            </Text>
          </ListInsetText>
        )}
        {zones.length && zone
          ? addSlotFields(doc.value, node.id, fieldErrors.value['#slot'])
          : undefined}
        {node.id === doc.value.root?.id ? replaceRootSection() : undefined}
      </List>
    );
    const [strip, ...panels] = areaTabs(
      'editor-inspector-areas',
      'Inspector areas',
      INSPECTOR_TAB_ACTION,
      inspectorArea.value,
      'fill',
      [
        { area: 'properties', name: 'Properties', panel: properties },
        { area: 'flow', name: 'Flow', panel: flow },
        { area: 'children', name: 'Children', panel: children },
      ],
    );
    // KF-5QXNWS: the node's title and its tab strip stay pinned under the
    // rail's toolbar while a long area scrolls.
    return {
      header: (
        <List>
          <ListHeader
            label={node.name ? `${node.name} · ${title}` : title}
            count={component.props.length}
            countLabel="props"
            // KF-QAVK73: copies the node right after itself (⌘D).
            action={DUPLICATE_ACTION}
            actionLabel="Duplicate"
            actionIcon={<LucideIcon icon={CopyPlus} name="copy-plus" />}
            actionDisabled={!isMovable(doc.value, node.id).placed}
            disabledReason="The root has no place to copy it beside."
          />
          {strip}
        </List>
      ),
      content: <List>{panels}</List>,
      pages: propertiesPages(
        propertiesState,
        inspectorGroup.value,
        propertiesQuery.value,
        propertiesQueryRevision.value,
      ),
    };
  };

  return { viewEditor, nodeEditor };
}
