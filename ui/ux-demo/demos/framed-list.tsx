import '@awesome.me/webawesome/dist/components/button/button.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { FramedList, FramedListRow } from '@kerfjs/ui/framed-list';
import { IconButton } from '@kerfjs/ui/icon-button';
import { List } from '@kerfjs/ui/list';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { Pencil, RotateCcw } from 'lucide';

const shortcuts = [
  {
    id: 'new-ticket',
    name: 'New Ticket',
    detail: 'Create a ticket in the current project.',
    keys: 'N',
  },
  {
    id: 'search',
    name: 'Search',
    detail: 'Focus the search field.',
    keys: '/',
  },
  {
    id: 'complete',
    name: 'Complete Ticket',
    detail: 'Mark the selected ticket done.',
    keys: '⌘ ↵',
  },
] as const;

export function FramedListDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'framed-list' }}>
      <CatalogExample
        label="Settings rows"
        note="One rounded frame with dividers between rows of arbitrary content; the highlighted row is the one being edited."
        viewport={{ width: 'medium' }}
      >
        <FramedList label="Keyboard Shortcuts">
          {shortcuts.map((shortcut) => (
            <FramedListRow highlighted={shortcut.id === 'search'}>
              <Row gap="s" vAlign="middle">
                <List flex>
                  <Text variant="span">{shortcut.name}</Text>
                  <Text variant="span" tone="quiet" size="compact">
                    {shortcut.detail}
                  </Text>
                </List>
                <Text variant="span" font="monospace" wrap="nowrap">
                  {shortcut.keys}
                </Text>
                <IconButton
                  icon={Pencil}
                  iconName="pencil"
                  label={`Edit ${shortcut.name} shortcut`}
                  appearance="plain"
                  action="log-edit-shortcut"
                />
                <IconButton
                  icon={RotateCcw}
                  iconName="rotate-ccw"
                  label={`Reset ${shortcut.name} shortcut`}
                  appearance="plain"
                  action="log-reset-shortcut"
                />
              </Row>
            </FramedListRow>
          ))}
        </FramedList>
      </CatalogExample>
      <CatalogExample
        label="Base surface"
        align="none"
        viewport={{ width: 'medium', surface: 'lowered', frame: 'solid' }}
      >
        <List controlInsets="tb">
          <FramedList label="Accounts" surface="base">
            <FramedListRow>
              <Text variant="span">GitHub · connected</Text>
            </FramedListRow>
            <FramedListRow>
              <Text variant="span">Linear · not connected</Text>
            </FramedListRow>
          </FramedList>
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
