import type { KerfUiContent } from '@kerfjs/ui';
import { SunkenPanel } from '@kerfjs/ui/sunken-panel';

export function DemoListInsetPane({ children }: { children: KerfUiContent }) {
  return <SunkenPanel ariaLabel="List inset example">{children}</SunkenPanel>;
}
