import '@kerfjs/ui/select/register';

import { Badge } from '@kerfjs/ui/badge';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { px } from '@kerfjs/ui/css-values';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Select } from '@kerfjs/ui/select';
import { Gauge } from 'lucide';

import { badgePlayground, type BadgePlaygroundState } from './state.js';

type BadgeSettingChoices = {
  [K in keyof BadgePlaygroundState]: {
    label: string;
    choices: { value: BadgePlaygroundState[K]; label: string }[];
  };
};

const badgeSettingChoices: BadgeSettingChoices = {
  tone: {
    label: 'Tone',
    choices: [
      { value: 'neutral', label: 'Neutral' },
      { value: 'info', label: 'Info' },
      { value: 'pop', label: 'Pop' },
      { value: 'success', label: 'Success' },
      { value: 'warning', label: 'Warning' },
      { value: 'danger', label: 'Danger' },
    ],
  },
  appearance: {
    label: 'Appearance',
    choices: [
      { value: 'quiet', label: 'Quiet' },
      { value: 'solid', label: 'Solid' },
      { value: 'outline', label: 'Outline' },
    ],
  },
  shape: {
    label: 'Shape',
    choices: [
      { value: 'pill', label: 'Pill' },
      { value: 'rounded', label: 'Rounded' },
    ],
  },
  size: {
    label: 'Size',
    choices: [
      { value: 'default', label: 'Default' },
      { value: 'compact', label: 'Compact' },
    ],
  },
};
const badgeSettingKeys = Object.keys(
  badgeSettingChoices,
) as (keyof BadgePlaygroundState)[];

/** Apply one Badge settings Select change; false when it is not a Badge setting. */
export function applyBadgeSetting(name: string | null, value: string): boolean {
  const key = badgeSettingKeys.find(
    (candidate) => name === `badge-playground-${candidate}`,
  );
  if (
    !key ||
    !badgeSettingChoices[key].choices.some((choice) => choice.value === value)
  )
    return false;
  badgePlayground.value = { ...badgePlayground.value, [key]: value };
  return true;
}

/** The Badge entry's catalog settings: one Select per playground prop. */
export function BadgeSettings() {
  return (
    <>
      {badgeSettingKeys.map((key, index) => (
        <ListInsetControl
          sides={index === badgeSettingKeys.length - 1 ? 'trbl' : 'trl'}
        >
          <Select
            name={`badge-playground-${key}`}
            label={badgeSettingChoices[key].label}
            value={badgePlayground.value[key]}
            choices={badgeSettingChoices[key].choices}
          />
        </ListInsetControl>
      ))}
    </>
  );
}

export function BadgeDemo() {
  const { tone, appearance, shape, size } = badgePlayground.value;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'badge' }}>
      <CatalogExample
        label="Playground"
        note="Change the tone, appearance, shape, and size in the Settings pane."
        align="inline-control"
        rootAttributes={{ 'data-badge-playground': '' }}
      >
        <Badge tone={tone} appearance={appearance} shape={shape} size={size}>
          Ready
        </Badge>
      </CatalogExample>
      <CatalogExample
        label="Status"
        note="Tone communicates emphasis while the text carries the meaning."
        align="inline-control"
      >
        <Badge tone="success">Ready</Badge>
      </CatalogExample>
      <CatalogExample label="Count" align="inline-control">
        <Badge
          tone="info"
          appearance="solid"
          size="compact"
          label="12 unread items"
        >
          12
        </Badge>
      </CatalogExample>
      <CatalogExample
        label="Dot"
        note="A text-free mark for new content without a count; it carries its own label or is hidden when its owner announces it."
        align="inline-control"
      >
        <Badge tone="danger" size="dot" label="New activity" />
      </CatalogExample>
      <CatalogExample
        label="Icon and title"
        note="A decorative leading icon sits 4px before the text; title explains the badge on hover, and rootAttributes carries app identity."
        align="inline-control"
      >
        <Badge
          tone="success"
          icon={<LucideIcon icon={Gauge} name="gauge" />}
          title="Confidence of the latest completion"
          label="82% confidence"
          rootAttributes={{ 'data-band': 'high' }}
        >
          82%
        </Badge>
      </CatalogExample>
      <CatalogExample label="Category tag" align="inline-control">
        <Badge tone="pop" appearance="outline" shape="rounded">
          Design
        </Badge>
      </CatalogExample>
      <CatalogExample
        label="Long text"
        note="maxWidth caps a badge holding app-supplied text and truncates it with an ellipsis; the full text is the hover title."
        align="inline-control"
      >
        <Badge
          tone="info"
          maxWidth={px(120)}
          rootAttributes={{ 'data-demo-badge': 'truncate' }}
        >
          customer-escalation-priority-review
        </Badge>
      </CatalogExample>
      <CatalogExample label="Neutral metadata" align="inline-control">
        <Badge>Draft</Badge>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
