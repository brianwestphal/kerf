import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Select } from '@kerfjs/ui/select';
import { Bell, SlidersHorizontal, Wrench } from 'lucide';

import { selectedChoice } from './state.js';

export function SelectDemo() {
  return (
    <CatalogExampleStack
      className="demo-control-stack"
      rootAttributes={{ 'data-demo': 'select' }}
    >
      <CatalogExample label="Rendering balance" align="inline-control">
        <Select
          name="rendering-balance"
          value={selectedChoice.value}
          ariaLabel="Rendering balance"
          choices={[
            {
              value: 'quiet',
              label: 'Quiet',
              icon: Bell,
              iconName: 'bell',
              group: 'Attention',
            },
            {
              value: 'balanced',
              label: 'Balanced',
              icon: SlidersHorizontal,
              iconName: 'sliders-horizontal',
              group: 'Attention',
            },
            {
              value: 'explicit',
              label: 'Explicit',
              icon: Wrench,
              iconName: 'wrench',
              group: 'Control',
              separatorBefore: true,
            },
          ]}
          renderSelected={(choice) => (
            <span class="demo-select-selected">
              {choice.icon ? (
                <LucideIcon
                  icon={choice.icon}
                  name={
                    choice.iconName ??
                    choice.label.toLowerCase().replaceAll(' ', '-')
                  }
                />
              ) : null}
              <span>{choice.label}</span>
            </span>
          )}
        />
        <p class="kui-catalog-example__note">
          Live value: <strong data-select-value>{selectedChoice.value}</strong>
        </p>
      </CatalogExample>
      <CatalogExample
        label="Placeholder"
        note={
          <>
            Loading renders a static, inert box in place of the interactive
            control.
          </>
        }
        align="inline-control"
      >
        <Select
          name="select-placeholder"
          value=""
          label="Rendering balance"
          ariaLabel="Rendering balance"
          choices={[]}
          placeholder
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
