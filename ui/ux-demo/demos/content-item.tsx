import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { List } from '@kerfjs/ui/list';
import { Pane } from '@kerfjs/ui/pane';
import { Text } from '@kerfjs/ui/text';

function itemCopy(title: string, detail: string) {
  return (
    <List gap="2xs">
      <Text variant="span">
        <strong>{title}</strong>
      </Text>
      <Text variant="span" tone="quiet" size="compact">
        {detail}
      </Text>
    </List>
  );
}

export function ContentItemDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'content-item' }}>
      <CatalogExample
        label="Unframed and framed items"
        note={
          <>
            Every item reserves the same 1px border, so an unframed item and a{' '}
            <code>frame="framed"</code> item share one content edge. Frame an
            item only when it marks a real distinction.
          </>
        }
        align="none"
      >
        <Pane label="Content items">
          <ContentItem rootAttributes={{ 'data-demo-item': 'plain' }}>
            {itemCopy(
              'Workspace details',
              'An ordinary item sits directly on the surface.',
            )}
          </ContentItem>
          <ContentItem
            frame="framed"
            rootAttributes={{ 'data-demo-item': 'framed' }}
          >
            {itemCopy(
              'Unsaved changes',
              'A framed item reads as visibly bounded without moving its content.',
            )}
          </ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Pill shape"
        note={
          <>
            <code>shape="pill"</code> selects the 22px radius that matches pill
            controls.
          </>
        }
        align="none"
      >
        <Pane label="Pill content item">
          <ContentItem
            frame="framed"
            shape="pill"
            rootAttributes={{ 'data-demo-item': 'pill' }}
          >
            <Text variant="span">Three reviewers approved this change.</Text>
          </ContentItem>
        </Pane>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
