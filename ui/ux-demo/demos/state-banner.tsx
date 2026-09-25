import './state-banner.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Check, CircleHelp } from 'lucide';

import { button, icon } from './state.js';

export function StateBannerDemo() {
  const specimens = [
    { tone: 'neutral', title: 'Standing by' },
    { tone: 'info', title: 'Connecting to server' },
    { tone: 'pop', title: 'Featured workspace' },
    { tone: 'success', title: 'Everything is connected' },
    { tone: 'warning', title: 'Connection interrupted' },
    { tone: 'danger', title: 'Authentication required' },
  ] as const;
  return (
    <div class="demo-state-banner-grid">
      <CatalogExampleStack rootAttributes={{ 'data-demo': 'state-banner' }}>
        <>
          {specimens.map(({ tone, title }, index) => (
            <CatalogExample label={tone} align="none">
              <StateBanner
                tone={tone}
                urgency={tone === 'danger' ? 'alert' : 'status'}
                title={title}
                badge={String(index + 1)}
                detail="Semantic defaults remain overridable."
                icon={
                  tone === 'danger'
                    ? icon(CircleHelp, 'circle-help')
                    : icon(Check, 'check')
                }
                action={button('Act', `log-${tone}`)}
              />
            </CatalogExample>
          ))}
        </>
        <CatalogExample label="Scoped override" align="none">
          <div class="demo-state-banner--override">
            <StateBanner
              tone="info"
              title="Consumer palette"
              detail="Only this instance uses the override."
              icon={icon(Check, 'check')}
            />
          </div>
        </CatalogExample>
        <CatalogExample label="Placeholder" align="none">
          <StateBanner tone="neutral" title="" detail="" placeholder />
        </CatalogExample>
      </CatalogExampleStack>
    </div>
  );
}
