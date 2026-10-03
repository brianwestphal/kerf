import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Chip } from '@kerfjs/ui/chip';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

const overflowLabel =
  'A very long workspace name that does not fit the available width and keeps going past two lines';

export function ToolbarTextDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'toolbar-text' }}>
      <CatalogExample label="Extra large" align="inline-control">
        <ToolbarText text="Workspace settings" size="xlarge" />
      </CatalogExample>
      <CatalogExample label="Fixed extra large" align="inline-control">
        <ToolbarText
          text="Terminal tickets"
          size="xlarge-fixed"
          headingLevel={2}
        />
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
      <CatalogExample label="Extra small" align="inline-control">
        <ToolbarText text="rail heading" size="xsmall" />
      </CatalogExample>
      <CatalogExample
        label="Actionable title beside status"
        note="Click or press Enter to request editing. The title keeps its content width until the center search needs space, then ellipsizes beside the chip."
        viewport={{ width: 'wide', frame: 'solid' }}
        rootAttributes={{ 'data-demo-toolbar-text-action': '' }}
      >
        <Toolbar
          label="Demand toolbar"
          leading={
            <>
              <ToolbarText
                text="Annual maintenance procurement plan"
                size="large"
                action="edit-toolbar-title"
              />
              <Chip tone="success">Approved</Chip>
            </>
          }
          center={
            <ToolbarControlGroup
              label="Search"
              content="search"
              sizing="grow"
              expanded
            >
              <input
                type="search"
                aria-label="Search demands"
                placeholder="Search demands"
              />
            </ToolbarControlGroup>
          }
        />
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
        align="inline-control"
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
        align="inline-control"
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
        align="inline-control"
        viewport={{ layout: 'flex', width: 'text', frame: 'dashed' }}
        rootAttributes={{ 'data-demo-toolbar-text-overflow': 'capped' }}
      >
        <ToolbarText text={overflowLabel} size="large" wrap maxLines={2} />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
