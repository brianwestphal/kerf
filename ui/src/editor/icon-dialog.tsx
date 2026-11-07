// The Inspector's Lucide icon picker, including its lazy name/alias table.
import type { SafeHtml, Signal } from 'kerfjs';
import { icons as lucideIcons } from 'lucide';

import { Button } from '../components/actions/button/button.js';
import { List } from '../components/collections/list/list.js';
import { SearchField } from '../components/forms/search-field/search-field.js';
import { Grid } from '../components/layout/grid/grid.js';
import { DialogSurface } from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import { Text } from '../components/typography/text/text.js';
import { px } from '../shared/styles/css-values.js';
import type { EditorContext } from './editor-context.js';
import type { FieldPlace } from './field-place.js';
import { findNode } from './model/document.js';
import { stepTitle, valueAt } from './model/fields.js';
import { iconAliases, iconNames, matchIcons } from './model/icons.js';
import {
  ICON_CHOOSE_ACTION,
  ICON_CLEAR_ACTION,
  ICON_DIALOG,
  ICON_REMOVE_ACTION,
} from './shell-names.js';

export interface IconDialogState {
  readonly iconPicker: Signal<FieldPlace | null>;
  readonly iconQuery: Signal<string>;
  readonly iconQueryRevision: Signal<number>;
  readonly iconOf: (name: string) => SafeHtml | undefined;
}

/** The icon picker view; its name table is built only when opened. */
export function createIconDialog(
  ctx: EditorContext,
  { iconPicker, iconQuery, iconQueryRevision, iconOf }: IconDialogState,
) {
  let allIcons: readonly string[] | undefined;
  let allAliases: ReadonlyMap<string, readonly string[]> | undefined;
  return () => {
    const place = iconPicker.value;
    const id = ctx.selectedNodeId();
    const open = place && id ? place : undefined;
    const current = open
      ? (
          valueAt(
            findNode(ctx.doc.value, id!)!.node.props?.[open.prop],
            open.path,
          ) as { $icon?: string } | undefined
        )?.$icon
      : undefined;
    if (open) {
      allIcons ??= iconNames(lucideIcons);
      allAliases ??= iconAliases(lucideIcons);
    }
    const found = open
      ? matchIcons(allIcons!, iconQuery.value, undefined, allAliases)
      : { names: [], total: 0 };
    return (
      <DialogSurface
        id={ICON_DIALOG}
        label={open ? `Choose ${stepTitle(open)}` : 'Choose an icon'}
        size="medium"
        rootAttributes={{ 'data-key': ICON_DIALOG }}
        footer={
          <>
            {current ? (
              <Button action={ICON_REMOVE_ACTION}>Remove icon</Button>
            ) : undefined}
            <Button rootAttributes={{ 'data-dialog-close': '' }}>Cancel</Button>
          </>
        }
      >
        <List controlInsets="trbl" gap>
          <SearchField
            id="editor-icon-search"
            label="Search icons"
            placeholder="Search icons"
            query={iconQuery.value}
            revision={iconQueryRevision.value}
            clearAction={ICON_CLEAR_ACTION}
            clearLabel="Clear Search"
            editorAttributes={{ 'data-editor-icon-search': '' }}
          />
          <Text tone="quiet">
            {found.total > found.names.length
              ? `Showing ${found.names.length} of ${found.total} icons; search to narrow them.`
              : `${found.total} ${found.total === 1 ? 'icon' : 'icons'}`}
          </Text>
          <Grid minColumnWidth={px(44)} gap="s">
            {found.names.map((name) => (
              <Button
                icon={iconOf(name)!}
                ariaLabel={name}
                title={name}
                emphasis="secondary"
                pressed={name === current}
                action={ICON_CHOOSE_ACTION}
                rootAttributes={{ 'data-editor-icon': name }}
              />
            ))}
          </Grid>
        </List>
      </DialogSurface>
    );
  };
}
