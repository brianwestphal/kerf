import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { EmptyState } from '@kerfjs/ui/empty-state';
import { List } from '@kerfjs/ui/list';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { Row } from '@kerfjs/ui/row';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Check, CircleHelp, Search } from 'lucide';

import { bannerTone, button, icon } from './state.js';

export function FeedbackDemo() {
  const tone = bannerTone.value;
  return (
    <CatalogExampleStack
      label="Feedback composition"
      rootAttributes={{ 'data-demo': 'feedback' }}
    >
      <CatalogExample label="Persistent, empty, and loading feedback">
        <List gap="m">
          <StateBanner
            tone={tone}
            urgency={tone === 'danger' ? 'alert' : 'status'}
            title={
              tone === 'danger' ? 'Action required' : 'Everything is connected'
            }
            detail="State is expressed with text and color."
            icon={
              tone === 'danger'
                ? icon(CircleHelp, 'circle-help')
                : icon(Check, 'check')
            }
            action={button('Cycle tone', 'cycle-tone')}
          />
          <EmptyState
            title="Nothing here yet"
            detail="Create the first item when you are ready."
            icon={icon(Search, 'search')}
            action={button('Create item', 'log-add')}
          />
          <Row vAlign="middle" wrap>
            <LoadingSpinner label="Loading preview" />
            <span>Meaningfully labeled progress</span>
            <LoadingSpinner />
            <span>Decorative progress</span>
          </Row>
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
