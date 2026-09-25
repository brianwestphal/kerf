import type { TokenSearchToken } from '@kerfjs/ui/token-search-field';
import { signal } from 'kerfjs';

export const regionSize = signal(276);
export const tabBarActive = signal('components');
export const tabBarTabs = signal([
  { id: 'components', name: 'Components' },
  { id: 'design-guidance', name: 'Design guidance' },
  { id: 'accessibility', name: 'Accessibility contracts' },
  { id: 'integration', name: 'Integration patterns' },
  { id: 'release-notes', name: 'Release notes' },
  { id: 'migration', name: 'Hot Sheet migration' },
  { id: 'examples', name: 'Consumer examples' },
]);
export const selectedChoice = signal('balanced');
export const disclosureOpen = signal(false);
export const customDisclosureOpen = signal(false);
export const menuToolsOpen = signal(true);
export const tokenSearchQuery = signal('NOT  AND parser');
export const tokenSearchTokens = signal<TokenSearchToken[]>([
  {
    value: 'tag:client',
    label: 'tag:client',
    offset: 4,
    accessibleLabel: 'client tag',
  },
  { value: 'is:active', label: 'is:active', offset: 4 },
]);
export const bannerTone = signal<
  'neutral' | 'info' | 'pop' | 'success' | 'warning' | 'danger'
>('info');
export const toolbarChoice = signal<'list' | 'columns' | 'settings'>('list');
export const toolbarFindQuery = signal('');
export const toolbarFindOpen = signal(false);
export const collapsibleSearchOpen = signal(false);
export const toolbarGroupSearchOpen = signal(false);
export const toolbarGroupShape = signal<'pill' | 'rounded'>('pill');
export const toolbarAvatarChoice = signal<'primary' | 'secondary'>('primary');
export const floatingToolbarOpen = signal(false);
export const adoptionOpen = signal(true);
export const adoptionQuery = signal('');
export const adoptionTokens = signal<TokenSearchToken[]>([]);
export const adoptionReadout = signal('No edits yet');
export const ADOPTION_SUGGESTIONS: readonly TokenSearchToken[] = [
  { value: 'status:open', label: 'status:open' },
  { value: 'owner:me', label: 'owner:me' },
  { value: 'due:today', label: 'due:today' },
];
export const menuActionCurrent = signal('src/main.ts');
export const menuActionPressed = signal(false);
export const inspectorSection = signal<'summary' | 'activity' | 'files'>(
  'summary',
);
export const displayDensity = signal<'compact' | 'comfortable' | 'roomy'>(
  'comfortable',
);
