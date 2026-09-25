import '@awesome.me/webawesome/dist/components/button/button.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Check, CircleHelp } from 'lucide';

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
                tone === 'danger' ? (
                  <LucideIcon icon={CircleHelp} name="circle-help" />
                ) : (
                  <LucideIcon icon={Check} name="check" />
                )
              }
              action={
                <wa-button size="small" data-action={`log-${tone}`}>
                  Act
                </wa-button>
              }
            />
          </CatalogExample>
        ))}
      </>
      <CatalogExample
        label="Scoped override"
        align="none"
        rootAttributes={{ 'data-demo-state-banner-override': '' }}
        viewport={{
          tokens: {
            '--kui-state-banner-background': 'light-dark(#f6efff, #2e203d)',
            '--kui-state-banner-border': 'light-dark(#b69ad9, #765a98)',
            '--kui-state-banner-foreground': 'light-dark(#6d3f9c, #e3c7ff)',
          },
        }}
      >
        <StateBanner
          tone="info"
          title="Consumer palette"
          detail="Only this instance uses the override."
          icon={<LucideIcon icon={Check} name="check" />}
        />
      </CatalogExample>
      <CatalogExample label="Placeholder" align="none">
        <StateBanner tone="neutral" title="" detail="" placeholder />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
