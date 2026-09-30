import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Chip } from '@kerfjs/ui/chip';

export function ChipDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'chip' }}>
      <CatalogExample
        label="Removable tag"
        note="The native button delegates removal; the application owns the tag list."
        align="inline-control"
      >
        <Chip
          tone="brand"
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
    </CatalogExampleStack>
  );
}
