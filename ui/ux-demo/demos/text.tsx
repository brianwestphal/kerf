import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { foregroundColor, uiColor } from '@kerfjs/ui/css-values';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { Row } from '@kerfjs/ui/row';
import { FieldLabel, Text } from '@kerfjs/ui/text';
import { TextField } from '@kerfjs/ui/text-field';

export function TextDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'text' }}>
      <CatalogExample
        label="Semantic Variants"
        note="Text renders the selected native heading or paragraph while giving each text box the standard transparent border and content padding."
        align="inline-control"
        rootAttributes={{ 'data-demo-section': 'semantic-variants' }}
      >
        <Text variant="h1">Heading level 1</Text>
        <Text variant="h2">Heading level 2</Text>
        <Text variant="h3">Heading level 3</Text>
        <Text variant="h4">Heading level 4</Text>
        <Text variant="h5">Heading level 5</Text>
        <Text variant="h6">Heading level 6</Text>
        <Text
          id="text-demo-paragraph"
          lang="en"
          data-demo-copy="paragraph"
          aria-label="Example Paragraph"
        >
          Paragraph text keeps native semantics and accepts ordinary global,
          data, and ARIA attributes.
        </Text>
      </CatalogExample>
      <CatalogExample
        label="Strong Emphasis"
        note="weight=strong marks a title or key phrase as important with a strong element."
      >
        <Text variant="span" weight="strong">
          Release Notes
        </Text>
        <Text variant="span" tone="quiet" size="compact">
          Updated a moment ago
        </Text>
      </CatalogExample>
      <CatalogExample
        label="Text Colors"
        note="Use a semantic foreground token or an application color. Omit color to keep tone or inherited text color; an explicit color wins over tone."
        align="inline-control"
        rootAttributes={{ 'data-demo-section': 'text-colors' }}
      >
        <Text>Inherited foreground</Text>
        <Text color={uiColor('warning-on-quiet')}>Warning foreground</Text>
        <Text color={foregroundColor('rebeccapurple')}>
          Application foreground
        </Text>
        <Text tone="danger" color={uiColor('text-quiet')}>
          Explicit color overrides tone
        </Text>
      </CatalogExample>
      <CatalogExample
        label="Group Title"
        note='size="medium" keeps a heading at the 16px body size with its heading weight, for a group title inside a list; it wraps a long name instead of truncating it.'
        viewport={{ width: 'compact' }}
        rootAttributes={{ 'data-demo-section': 'group-title' }}
        align="inline-control"
      >
        <Text variant="h3" size="medium" data-demo-copy="medium-heading">
          Attachments from the March design review with the extended team
        </Text>
      </CatalogExample>
      <CatalogExample
        label="Presentation Roles"
        note="Tone, size, and font are independent of the native semantic element, so applications can express supporting copy, errors, compact metadata, prominent copy, and code without global utility classes."
        align="inline-control"
        rootAttributes={{ 'data-demo-section': 'presentation-roles' }}
      >
        <Text tone="quiet">Quiet supporting copy</Text>
        <Text tone="danger">Danger or validation copy</Text>
        <Text size="compact">Compact metadata</Text>
        <Text font="monospace">Monospace identifier: INV-2048</Text>
        <Text tone="quiet" size="compact" font="monospace">
          Quiet compact code: PO-1042
        </Text>
        <Text>
          <strong>
            Inbox
            <Text variant="span" tone="quiet" size="compact">
              {' · 3 msg'}
            </Text>
          </strong>
        </Text>
        <Text size="large">Large body copy</Text>
        <Text size="xlarge">Extra large body copy</Text>
      </CatalogExample>
      <CatalogExample
        label="Read-Only Field Preview"
        note="FieldLabel mirrors a Web Awesome form-control label when a field is a preview rather than an input. The preview group uses the label id as its accessible name."
        align="none"
        rootAttributes={{ 'data-demo-section': 'field-label' }}
      >
        <div role="group" aria-labelledby="needed-by-label">
          <ListInsetControl sides="trl">
            <FieldLabel id="needed-by-label">Needed By</FieldLabel>
          </ListInsetControl>
          <ContentItem>October 16, 2026</ContentItem>
        </div>
        <ListInsetControl sides="trl">
          <TextField label="Needed By" value="October 16, 2026" />
        </ListInsetControl>
      </CatalogExample>
      <CatalogExample
        label="Control Margins"
        note="Text adds the shared 8px gutter outside selected sides, keeping its own border and padding. No Row wrapper is needed for an isolated paragraph."
        align="none"
        rootAttributes={{ 'data-demo-section': 'control-margins' }}
      >
        <Text controlMargins="trbl" data-demo-copy="margin-all">
          A paragraph aligned with neighboring content items.
        </Text>
        <Text controlMargins="rl" data-demo-copy="margin-horizontal">
          Horizontal margins keep the same text column without a vertical
          gutter.
        </Text>
        <Text controlMargins="rl" flush data-demo-copy="margin-flush">
          Flush supporting copy retains the exterior control gutter.
        </Text>
        <Text>
          Inline{' '}
          <Text
            variant="span"
            controlMargins="rl"
            data-demo-copy="margin-inline"
          >
            copy
          </Text>{' '}
          stays in its sentence.
        </Text>
      </CatalogExample>
      <CatalogExample label="Flush Dialog Copy" align="glyph">
        <Text flush lineHeight="tight" data-demo-copy="flush">
          Compact supporting copy inside a dialog body.
        </Text>
      </CatalogExample>
      <CatalogExample
        label="Centered Status Copy"
        note="align centers short status copy that wraps in a narrow surface; end aligns trailing values."
        align="glyph"
        viewport={{ width: 'compact' }}
      >
        <Text align="center" tone="quiet" data-demo-copy="align-center">
          The terminal could not start. Check the shell path in settings, then
          try again.
        </Text>
        <Text align="end" data-demo-copy="align-end">
          Total: 42 items
        </Text>
      </CatalogExample>
      <CatalogExample
        label="Long Copy and Truncation"
        note="Text breaks long identifiers, caps summaries, yields space to a fixed sibling with a one-line ellipsis, and truncates a path in the middle or a branch name at the start."
        align="inline-control"
        viewport={{ width: 'medium' }}
      >
        <Text wrap="anywhere" data-demo-copy="anywhere">
          DOCUMENT-2026-OCTOBER-PROCUREMENT-VERY-LONG-UNBROKEN-REFERENCE-123456789
        </Text>
        <Text wrap="normal" maxLines={2} data-demo-copy="capped">
          A long summary can stop after two lines while retaining a useful
          preview of the original message. Additional detail stays available in
          the full record, and the summary keeps the surrounding layout compact.
        </Text>
        <Row gap="xs" controlInsets="rl">
          <Text variant="span" wrap="truncate" data-demo-copy="truncate">
            Acme International Procurement and Manufacturing Limited
          </Text>
          <Text variant="span" wrap="nowrap" data-demo-copy="price">
            $129 / unit
          </Text>
        </Row>
        <Text wrap="nowrap" data-demo-copy="nowrap">
          This status stays on one line.
        </Text>
        <Text
          wrap="truncate"
          truncate="middle"
          font="monospace"
          data-demo-copy="truncate-middle"
        >
          src/components/navigation/application-tabs/internal/tab-overflow-menu.tsx
        </Text>
        <Text
          wrap="truncate"
          truncate="start"
          font="monospace"
          data-demo-copy="truncate-start"
        >
          feature/kf-482-procurement-approval-routing-refactor
        </Text>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
