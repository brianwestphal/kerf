import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';

import { renderFeedbackStates } from '../views/feedback-states.view.js';
import { bannerTone } from './state.js';

export function FeedbackDemo() {
  const tone = bannerTone.value;
  return (
    <CatalogExampleStack
      label="Feedback Composition"
      rootAttributes={{ 'data-demo': 'feedback' }}
    >
      <CatalogExample label="Persistent, Empty, and Loading Feedback">
        {renderFeedbackStates({
          tone,
          danger: tone === 'danger',
          urgency: tone === 'danger' ? 'alert' : 'status',
          title:
            tone === 'danger' ? 'Action Required' : 'Everything Is Connected',
        })}
      </CatalogExample>
    </CatalogExampleStack>
  );
}
