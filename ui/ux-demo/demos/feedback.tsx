import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { EmptyState } from '@kerfjs/ui/empty-state';
import { List } from '@kerfjs/ui/list';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Text } from '@kerfjs/ui/text';
import { Check, CircleHelp, Search } from 'lucide';

import { bannerTone } from './state.js';

export function FeedbackDemo() {
  const tone = bannerTone.value;
  return (
    <CatalogExampleStack
      label="Feedback Composition"
      rootAttributes={{ 'data-demo': 'feedback' }}
    >
      <CatalogExample label="Persistent, Empty, and Loading Feedback">
        <List gap="m">
          <StateBanner
            tone={tone}
            urgency={tone === 'danger' ? 'alert' : 'status'}
            title={
              tone === 'danger' ? 'Action Required' : 'Everything Is Connected'
            }
            detail="State is expressed with text and color."
            icon={
              tone === 'danger' ? (
                <LucideIcon icon={CircleHelp} name="circle-help" />
              ) : (
                <LucideIcon icon={Check} name="check" />
              )
            }
            action={
              <button type="button" data-action="cycle-tone">
                Cycle Tone
              </button>
            }
          />
          <EmptyState
            title="Nothing Here Yet"
            detail="Create the first item when you are ready."
            icon={<LucideIcon icon={Search} name="search" />}
            action={
              <button type="button" data-action="log-add">
                Create Item
              </button>
            }
          />
          <Row vAlign="middle" wrap>
            <LoadingSpinner label="Loading preview…" />
            <Text variant="span">Meaningfully labeled progress</Text>
            <LoadingSpinner />
            <Text variant="span">Decorative progress</Text>
          </Row>
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
