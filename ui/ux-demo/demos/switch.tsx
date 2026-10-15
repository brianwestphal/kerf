import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { Switch } from '@kerfjs/ui/switch';

import { switchLiveUpdates } from './state.js';

export function SwitchDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'switch' }}>
      <CatalogExample
        label="Settings"
        note="A switch applies its setting immediately; use a Checkbox for a choice a form submits later."
        align="inline-control"
      >
        <List gap="xs">
          <Switch
            label="Live updates"
            checked={switchLiveUpdates.value}
            hint={
              switchLiveUpdates.value
                ? 'The list refreshes as tickets change.'
                : 'Refresh the list by hand.'
            }
            action="switch-demo"
          />
          <Switch label="Compact navigation" action="switch-demo" />
          <Switch label="Managed setting" checked disabled />
        </List>
      </CatalogExample>
      <CatalogExample label="Compact" align="inline-control">
        <List gap="xs">
          <Switch
            size="compact"
            label="Show avatars"
            checked
            action="switch-demo"
          />
          <Switch size="compact" label="Show timestamps" action="switch-demo" />
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
