import './demo-list-inset-pane.css';

import type { KerfUiContent } from '@kerfjs/ui';

export function DemoListInsetPane({ children }: { children: KerfUiContent }) {
  return <div class="demo-list-inset-pane kui-content">{children}</div>;
}
