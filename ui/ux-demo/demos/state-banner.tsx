import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Check, CircleAlert, CircleHelp } from 'lucide';

export function StateBannerDemo() {
  const specimens = [
    { tone: 'neutral', title: 'Standing By' },
    { tone: 'info', title: 'Connecting to Server' },
    { tone: 'pop', title: 'Featured Workspace' },
    { tone: 'success', title: 'Everything Is Connected' },
    { tone: 'warning', title: 'Connection Interrupted' },
    { tone: 'danger', title: 'Authentication Required' },
  ] as const;
  const iconFor = (tone: (typeof specimens)[number]['tone']) =>
    tone === 'danger' ? (
      <LucideIcon icon={CircleHelp} name="circle-help" />
    ) : (
      <LucideIcon icon={Check} name="check" />
    );
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
              icon={iconFor(tone)}
              action={
                <Button size="compact" action={`log-${tone}`}>
                  Act
                </Button>
              }
            />
          </CatalogExample>
        ))}
      </>
      <CatalogExample
        label="Scoped Override"
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
          title="Consumer Palette"
          detail="Only this instance uses the override."
          icon={<LucideIcon icon={Check} name="check" />}
        />
      </CatalogExample>
      <CatalogExample label="Stacked Copy and Action" align="none">
        <StateBanner
          tone="warning"
          title="Migration Needs Review"
          detail="Check the imported projects before removing the old source."
          icon={<LucideIcon icon={CircleHelp} name="circle-help" />}
          copyLayout="stacked"
          actionPlacement="below"
          action={<Button size="compact">Review Projects</Button>}
        />
      </CatalogExample>
      {/* A side action that holds several controls: on a narrow banner the
          action drops to its own trailing row instead of squeezing the copy,
          both at phone width and in a narrow container on a wide screen. */}
      <>
        {(
          [
            ['Side Action Group', undefined],
            ['Side Action Group · Sidebar Width', 'sidebar'],
          ] as const
        ).map(([label, width]) => (
          <CatalogExample
            label={label}
            align="none"
            viewport={width ? { width } : undefined}
            rootAttributes={{ 'data-demo-state-banner-action-group': '' }}
          >
            <StateBanner
              tone="danger"
              urgency="alert"
              title="Markup was not saved. Retry or discard your changes."
              icon={<LucideIcon icon={CircleAlert} name="circle-alert" />}
              action={
                <Row wrap hAlign="right">
                  <Button size="compact">Retry Save</Button>
                  <Button size="compact">Discard Changes</Button>
                </Row>
              }
            />
          </CatalogExample>
        ))}
      </>
      <CatalogExample label="Strip" align="none">
        <StateBanner
          presentation="strip"
          tone="warning"
          title="Notifications Paused"
          detail="Desktop alerts resume when you reconnect."
          icon={<LucideIcon icon={CircleHelp} name="circle-help" />}
          copyLayout="stacked"
          action={<Button size="compact">Resume</Button>}
        />
      </CatalogExample>
      <CatalogExample label="Placeholder" align="none">
        <StateBanner
          tone="neutral"
          title="Syncing Workspace"
          detail="Fetching the latest changes."
          placeholder
        />
      </CatalogExample>
      {/* Every tone's placeholder with a badge, so visual QA and captures see
          the solid badge's skeleton tint on each tone's fill. */}
      <>
        {specimens.map(({ tone, title }, index) => (
          <CatalogExample
            label={`Placeholder with Badge · ${tone}`}
            align="none"
          >
            <StateBanner
              tone={tone}
              title={title}
              badge={String(index + 1)}
              detail="Semantic defaults remain overridable."
              icon={iconFor(tone)}
              placeholder
            />
          </CatalogExample>
        ))}
      </>
    </CatalogExampleStack>
  );
}
