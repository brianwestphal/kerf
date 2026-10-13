import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Chip } from '@kerfjs/ui/chip';
import { ContentItem } from '@kerfjs/ui/content-item';
import { Grid } from '@kerfjs/ui/grid';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { Check, ExternalLink, FileCode, FileText, Trophy } from 'lucide';

interface DemoFile {
  readonly name: string;
  readonly icon: typeof FileText;
  readonly iconName: string;
  readonly body: string;
}

const userFiles: readonly DemoFile[] = [
  {
    name: 'failing-checks.log',
    icon: FileText,
    iconName: 'file-text',
    body: 'bundle budget: +213 B',
  },
];

const assistantFiles: readonly DemoFile[] = [
  {
    name: 'chip.tsx',
    icon: FileCode,
    iconName: 'file-code',
    body: 'export function Chip() {}',
  },
  {
    name: 'design-template-drift-report-2026-10-13.md',
    icon: FileText,
    iconName: 'file-text',
    body: '# Design template drift',
  },
];

function fileChips(files: readonly DemoFile[], group: string) {
  return (
    <Row gap="xs" wrap rootAttributes={{ 'data-demo-chip-files': group }}>
      {files.map((file) => (
        <Chip
          tone="inherit"
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(file.body)}`}
          download={file.name}
          icon={<LucideIcon icon={file.icon} name={file.iconName} />}
          truncate
        >
          {file.name}
        </Chip>
      ))}
    </Row>
  );
}

export function ChipDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'chip' }}>
      <CatalogExample
        label="Removable Tag"
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
      <CatalogExample
        label="Downloadable Files in Transcript Bubbles"
        note={
          <>
            <code>href</code> with <code>download</code> renders a native link
            with Chip geometry. <code>tone="inherit"</code> follows the bubble's
            foreground, so the same chip reads on a <code>neutral</code> and a{' '}
            <code>brand-loud</code> ContentItem.
          </>
        }
        align="none"
        viewport={{ width: 'medium' }}
      >
        <Pane label="Referenced Files">
          <List gap="xs" rootAttributes={{ 'data-demo-chip-transcript': '' }}>
            <ContentItem bubble="end" appearance="brand-loud">
              <Grid columns={1} gap="xs">
                <Text variant="span">Why is the build red?</Text>
                {fileChips(userFiles, 'user')}
              </Grid>
            </ContentItem>
            <ContentItem bubble="start" appearance="neutral">
              <Grid columns={1} gap="xs">
                <Text variant="span">
                  The bundle budget grew and one design template drifted.
                </Text>
                {fileChips(assistantFiles, 'assistant')}
              </Grid>
            </ContentItem>
          </List>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="External Link"
        note={
          <>
            <code>external</code> opens a new tab with a safe rel and announces
            it in the accessible name.
          </>
        }
        align="inline-control"
      >
        <Chip
          tone="info"
          href="https://github.com/brianwestphal/kerf"
          external
          icon={<LucideIcon icon={ExternalLink} name="external-link" />}
          itemId="kerf-source"
        >
          Kerf Source
        </Chip>
      </CatalogExample>
      <CatalogExample label="Plain Label" align="inline-control">
        <Chip appearance="solid">Backlog</Chip>
      </CatalogExample>
      <CatalogExample
        label="Icon and Truncated Label"
        note="Chip sizes a decorative leading icon and clips a long label inside its own width. The adjacent price stays whole. Hover the label for the full native title."
        align="inline-control"
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
