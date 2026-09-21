import { CatalogExample } from '@kerfjs/ui/catalog';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

const overflowLabel =
  'A very long workspace name that does not fit the available width and keeps going past two lines';

export function ToolbarTextDemo() {
  return (
    <div class="kui-catalog-example-stack" data-demo="toolbar-text">
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
        note={
          <>A loading label skeletons its text while keeping its type slot.</>
        }
        align="inline-control"
      >
        <ToolbarText text="" size="large" placeholder />
      </CatalogExample>
      <CatalogExample
        label="Ellipsis (default)"
        note={<>One line, ellipsized when it does not fit.</>}
        align="none"
      >
        <div class="toolbar-text-overflow-demo">
          <ToolbarText text={overflowLabel} size="large" />
        </div>
      </CatalogExample>
      <CatalogExample
        label="Wrap"
        note={
          <>
            <code>wrap</code> flows onto multiple lines instead.
          </>
        }
        align="none"
      >
        <div class="toolbar-text-overflow-demo">
          <ToolbarText text={overflowLabel} size="large" wrap />
        </div>
      </CatalogExample>
      <CatalogExample
        label="Wrap, capped to 2 lines"
        note={
          <>
            <code>maxLines</code> caps the wrap and ellipsizes past it.
          </>
        }
        align="none"
      >
        <div class="toolbar-text-overflow-demo">
          <ToolbarText text={overflowLabel} size="large" wrap maxLines={2} />
        </div>
      </CatalogExample>
    </div>
  );
}
