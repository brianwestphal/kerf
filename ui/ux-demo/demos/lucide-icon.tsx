import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { Bell, Star } from 'lucide';

export function LucideIconDemo() {
  // Both render the same glyph — LucideIcon's two modes differ in semantics, not
  // appearance — so the labels/notes carry the distinction.
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'lucide-icon' }}>
      <CatalogExample
        label="Decorative"
        note={
          <>
            No name — hidden from assistive technology (<code>aria-hidden</code>
            ).
          </>
        }
        align="glyph"
      >
        <LucideIcon icon={Bell} name="bell" />
      </CatalogExample>
      <CatalogExample
        label="Meaningful"
        note="Named with a label — announced when the icon carries meaning."
        align="glyph"
      >
        <LucideIcon
          icon={Bell}
          name="notification"
          label="Notifications ready"
        />
      </CatalogExample>
      <CatalogExample
        label="Icon sizes"
        note="Named xs/s/m/l/xl steps use 12/16/20/24/32px at a 16px root; a positive numeric pixel size converts to rem. The default remains 1em."
        align="none"
      >
        <Row gap="m" rootAttributes={{ 'data-demo-icon-sizes': '' }}>
          <LucideIcon icon={Bell} name="bell-xs" size="xs" />
          <LucideIcon icon={Bell} name="bell-s" size="s" />
          <LucideIcon icon={Bell} name="bell-m" size="m" />
          <LucideIcon icon={Bell} name="bell-l" size="l" />
          <LucideIcon icon={Bell} name="bell-xl" size="xl" />
          <LucideIcon icon={Bell} name="bell-30" size={30} />
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Outline and solid"
        note="Use the solid appearance for a selected or emphasized glyph; its fill follows the current text color."
        align="glyph"
      >
        <Row gap="m" rootAttributes={{ 'data-demo-icon-appearance': '' }}>
          <LucideIcon icon={Star} name="star-outline" />
          <LucideIcon icon={Star} name="star-solid" appearance="solid" />
        </Row>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
