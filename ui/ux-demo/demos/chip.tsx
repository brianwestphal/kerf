import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Chip } from '@kerfjs/ui/chip';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { Check, Trophy } from 'lucide';

export function ChipDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'chip' }}>
      <CatalogExample
        label="Removable tag"
        note="The native button delegates removal; the application owns the tag list."
        align="inline-control"
      >
        <Chip
          tone="info"
          itemId="urgent"
          removeAction="log-chip-remove"
          removeLabel="Remove Urgent tag"
        >
          Urgent
        </Chip>
      </CatalogExample>
      <CatalogExample
        label="Compact"
        note="A 20px chip with a 16px remove button."
        align="inline-control"
      >
        <Chip
          tone="success"
          appearance="outline"
          shape="rounded"
          size="compact"
          icon={<LucideIcon icon={Check} name="check" />}
          itemId="reviewed"
          removeAction="log-chip-remove"
          removeLabel="Remove Reviewed tag"
        >
          Reviewed
        </Chip>
      </CatalogExample>
      <CatalogExample label="Disabled" align="inline-control">
        <Chip
          tone="warning"
          disabled
          itemId="locked"
          removeAction="log-chip-remove"
          removeLabel="Remove Locked tag"
        >
          Locked
        </Chip>
      </CatalogExample>
      <CatalogExample label="Plain label" align="inline-control">
        <Chip appearance="solid">Backlog</Chip>
      </CatalogExample>
      <CatalogExample
        label="Icon and truncated label"
        note="Chip sizes a decorative leading icon and clips a long label inside its own width. The adjacent price stays whole. Hover the label for the full native title."
        align="none"
        viewport={{ width: 'medium' }}
      >
        <Row gap="xs" rootAttributes={{ 'data-demo-chip-offer': '' }}>
          <Chip
            tone="success"
            icon={<LucideIcon icon={Trophy} name="trophy" />}
            truncate
          >
            Acme International Procurement and Manufacturing Limited
          </Chip>
          <Text variant="span" wrap="nowrap">
            $129 / unit
          </Text>
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
