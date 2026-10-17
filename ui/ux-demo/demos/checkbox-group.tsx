import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { CheckboxGroup } from '@kerfjs/ui/checkbox-group';

import { checkboxGroupChannels, checkboxGroupPlatforms } from './state.js';

export function CheckboxGroupDemo() {
  const platforms = checkboxGroupPlatforms.value;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'checkbox-group' }}>
      <CatalogExample
        label="Vertical"
        note="Every checked value submits under one name; a choice may carry its own hint."
        align="inline-control"
      >
        <CheckboxGroup
          label="Notification Channels"
          name="notification-channels"
          value={checkboxGroupChannels.value}
          hint="Sent to your work account."
          action="checkbox-group-demo"
          choices={[
            { value: 'email', label: 'Email' },
            {
              value: 'push',
              label: 'Push notifications',
              hint: 'On devices where you are signed in.',
            },
            { value: 'digest', label: 'Weekly digest' },
            { value: 'sms', label: 'Text messages', disabled: true },
          ]}
        />
      </CatalogExample>
      <CatalogExample
        label="Horizontal and Compact"
        note="Short choices can line up and wrap; an error marks the group invalid until one is checked."
        align="inline-control"
      >
        <CheckboxGroup
          label="Platforms"
          name="platforms"
          size="compact"
          orientation="horizontal"
          value={platforms}
          error={platforms.length === 0 ? 'Choose a platform.' : undefined}
          action="checkbox-group-demo"
          choices={[
            { value: 'macos', label: 'macOS' },
            { value: 'windows', label: 'Windows' },
            { value: 'linux', label: 'Linux' },
          ]}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
