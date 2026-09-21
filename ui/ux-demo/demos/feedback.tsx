import { EmptyState } from '@kerfjs/ui/empty-state';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Check, CircleHelp, Search } from 'lucide';

import { bannerTone, button, icon } from './state.js';

export function FeedbackDemo() {
  const tone = bannerTone.value;
  return (
    <div class="demo-feedback" data-demo="feedback">
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
      <div class="demo-spinner-row">
        <LoadingSpinner label="Loading preview" />
        <span>Meaningfully labeled progress</span>
        <LoadingSpinner />
        <span>Decorative progress</span>
      </div>
    </div>
  );
}
