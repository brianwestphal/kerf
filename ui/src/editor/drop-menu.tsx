// The asking drop menu and replacement confirmation for Library drag/drop.
import { Button } from '../components/actions/button/button.js';
import { PopupMenu } from '../components/actions/popup-menu/popup-menu.js';
import { List } from '../components/collections/list/list.js';
import { DialogSurface } from '../components/surfaces/surface-scaffold/surface-scaffold.js';
import { Text } from '../components/typography/text/text.js';
import type { createLibraryDrag } from './library-drag.js';
import {
  DROP_CHOICE_ACTION,
  DROP_MENU,
  REPLACE_CONFIRM_ACTION,
  REPLACE_DIALOG,
  replaceTarget,
} from './shell-names.js';

type LibraryDrag = ReturnType<typeof createLibraryDrag>;

export function createDropViews({
  dropChoices,
  pendingReplace,
  rowLabel,
}: Pick<LibraryDrag, 'dropChoices' | 'pendingReplace' | 'rowLabel'>) {
  const dropMenu = () => (
    <PopupMenu
      context
      label="Drop into"
      rootAttributes={{ [DROP_MENU]: '' }}
      items={dropChoices.value.map((choice, index) => ({
        label: choice.label,
        action: DROP_CHOICE_ACTION,
        attributes: { 'data-editor-drop-choice': String(index) },
      }))}
    />
  );

  const replaceDialog = () => {
    const move = pendingReplace.value;
    const target = move ? replaceTarget(move.target.id)! : undefined;
    const name = target ? rowLabel(target) : '';
    return (
      <DialogSurface
        id={REPLACE_DIALOG}
        label={`Replace ${name}?`}
        size="small"
        rootAttributes={{ 'data-key': REPLACE_DIALOG }}
        footer={
          <>
            <Button rootAttributes={{ 'data-dialog-close': '' }}>Cancel</Button>
            <Button tone="danger" action={REPLACE_CONFIRM_ACTION}>
              Replace
            </Button>
          </>
        }
      >
        <List textInsets="trbl">
          <Text>
            {`${name} and everything inside it will be removed. Undo restores it.`}
          </Text>
        </List>
      </DialogSurface>
    );
  };

  return { dropMenu, replaceDialog };
}
