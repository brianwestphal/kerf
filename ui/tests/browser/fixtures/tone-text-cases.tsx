import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/lucide-icon.css';
import '@kerfjs/ui/badge.css';
import '@kerfjs/ui/text.css';
import '@kerfjs/ui/value-table.css';
import '@kerfjs/ui/list-header.css';
import '@kerfjs/ui/skeleton.css';
import '@kerfjs/ui/state-banner.css';
// The browser test bundles this fixture twice, once with the theme stylesheet
// omitted, so the foundation's own fallbacks are what the page resolves.
import '@kerfjs/ui/webawesome.css';

import { Badge } from '@kerfjs/ui/badge';
import { ListHeader } from '@kerfjs/ui/list-header';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Text } from '@kerfjs/ui/text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';

/** Tones that Web Awesome's theme also defines; pop is Kerf-only. */
export const TONES = [
  'neutral',
  'brand',
  'success',
  'warning',
  'danger',
] as const;

const semanticTone = (tone: (typeof TONES)[number]) =>
  tone === 'brand' ? 'info' : tone;

const host = document.querySelector('[data-tone-text-cases]')!;
host.innerHTML = String(
  <div class="kui-content">
    <section data-lowered-tone-compositions>
      <Text variant="h1">Lowered tone compositions</Text>
      <ValueTable label="Status values">
        <ValueTableRow
          label="Quiet value"
          value={
            <Text variant="span" tone="quiet">
              Quiet value text
            </Text>
          }
        />
        <ValueTableRow
          label="Danger value"
          value={
            <Text variant="span" tone="danger">
              Danger value text
            </Text>
          }
        />
      </ValueTable>
      <ListHeader
        label="Quiet status"
        status={
          <Text variant="span" tone="quiet">
            Quiet status text
          </Text>
        }
      />
      <ListHeader
        label="Danger status"
        status={
          <Text variant="span" tone="danger">
            Danger status text
          </Text>
        }
      />
    </section>
    <Text tone="danger">Danger text: the sync failed.</Text>
    {TONES.map((tone) => (
      <p class="kui-text" data-tone-probe={tone}>
        <span style={`color: var(--kui-color-${tone}-on-quiet)`}>
          {tone} on-quiet
        </span>{' '}
        ·{' '}
        <span style={`color: var(--kui-color-${tone}-on-normal)`}>
          {tone} on-normal
        </span>{' '}
        <span
          style={`color: var(--kui-color-${tone}-on-loud); background: var(--kui-color-${tone}-fill-loud); padding: 0 4px`}
        >
          {tone} on-loud
        </span>
      </p>
    ))}
    {TONES.map((tone) => (
      <StateBanner
        tone={semanticTone(tone)}
        title={`${tone} Banner`}
        badge="3"
        detail="Supporting detail"
      />
    ))}
    <p class="kui-text">
      {TONES.flatMap((tone) => [
        <Badge tone={semanticTone(tone)}>quiet</Badge>,
        ' ',
        <Badge tone={semanticTone(tone)} appearance="solid">
          solid
        </Badge>,
        ' ',
      ])}
    </p>
  </div>,
);
