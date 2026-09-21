import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Bell } from 'lucide';

import { icon } from './state.js';

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
        {icon(Bell, 'bell')}
      </CatalogExample>
      <CatalogExample
        label="Meaningful"
        note={
          <>Named with a label — announced when the icon carries meaning.</>
        }
        align="glyph"
      >
        <LucideIcon
          icon={Bell}
          name="notification"
          label="Notifications ready"
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
