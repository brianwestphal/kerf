import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

const overflowLabel =
  'A very long workspace name that does not fit the available width and keeps going past two lines';

export function ToolbarTextDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'toolbar-text' }}>
      <CatalogExample label="Extra large" align="inline-control">
        <ToolbarText text="Workspace settings" size="xlarge" />
      </CatalogExample>
      <CatalogExample label="Large" align="inline-control">
        <ToolbarText text="Component library" size="large" />
      </CatalogExample>
      <CatalogExample label="Default" align="inline-control">
        <ToolbarText text="Saved just now" />
      </CatalogExample>
      <CatalogExample label="Small" align="inline-control">
        <ToolbarText text="read-only" size="small" />
      </CatalogExample>
      <CatalogExample
        label="Placeholder"
        note="A loading label skeletons its text while keeping its type slot."
        align="inline-control"
      >
        <ToolbarText text="" size="large" placeholder />
      </CatalogExample>
      <CatalogExample
        label="Ellipsis (default)"
        note="One line, ellipsized when it does not fit."
        align="none"
        viewport={{ layout: 'flex', width: 'text', frame: 'dashed' }}
        rootAttributes={{ 'data-demo-toolbar-text-overflow': 'ellipsis' }}
      >
        <ToolbarText text={overflowLabel} size="large" />
      </CatalogExample>
      <CatalogExample
        label="Wrap"
        note={
          <>
            <code>wrap</code> flows onto multiple lines instead.
          </>
        }
        align="none"
        viewport={{ layout: 'flex', width: 'text', frame: 'dashed' }}
        rootAttributes={{ 'data-demo-toolbar-text-overflow': 'wrap' }}
      >
        <ToolbarText text={overflowLabel} size="large" wrap />
      </CatalogExample>
      <CatalogExample
        label="Wrap, capped to 2 lines"
        note={
          <>
            <code>maxLines</code> caps the wrap and ellipsizes past it.
          </>
        }
        align="none"
        viewport={{ layout: 'flex', width: 'text', frame: 'dashed' }}
        rootAttributes={{ 'data-demo-toolbar-text-overflow': 'capped' }}
      >
        <ToolbarText text={overflowLabel} size="large" wrap maxLines={2} />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
