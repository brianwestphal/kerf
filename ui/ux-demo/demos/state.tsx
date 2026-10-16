import type { SearchFieldToken } from '@kerfjs/ui/search-field';
import { createSearchFieldModel } from '@kerfjs/ui/search-field-model';
import { signal } from 'kerfjs';

export const regionSize = signal(276);
export const choiceChipsColor = signal('blue');
export const choiceChipsDialogColor = signal('transparent');
export const choiceChipsView = signal('board');
export const choiceChipsIcon = signal('star');
export const choiceChipsLabels = signal<readonly string[]>(['bug', 'docs']);
export const choiceChipsIntents = signal<readonly string[]>(['comment']);
export const choiceChipsWorkspaces = signal<readonly string[]>(['atlas']);
export const tabBarActive = signal('components');
/** An application tab; `pending` while its content is still loading. */
export interface DemoTab {
  id: string;
  name: string;
  pending?: boolean;
}
export const tabBarTabs = signal<DemoTab[]>([
  { id: 'components', name: 'Components' },
  { id: 'design-guidance', name: 'Design Guidance' },
  { id: 'accessibility', name: 'Accessibility Contracts' },
  { id: 'integration', name: 'Integration Patterns' },
  { id: 'release-notes', name: 'Release Notes' },
  { id: 'migration', name: 'Hot Sheet Migration' },
  { id: 'examples', name: 'Consumer Examples' },
]);
export const selectedChoice = signal('balanced');
export const selectViewTitle = signal<'queue' | 'active' | 'archive'>('queue');
export const popupSortChoice = signal<'recent' | 'priority'>('recent');
export const disclosureOpen = signal(false);
export const customDisclosureOpen = signal(false);
export const sizedDisclosureOpen = signal(false);
export const menuToolsOpen = signal(true);
export const searchFieldHelpOpen = signal(false);
export const searchFieldQuery = signal('NOT  AND parser');
export const searchFieldTokens = signal<SearchFieldToken[]>([
  {
    value: 'tag:client',
    label: 'tag:client',
    offset: 4,
    accessibleLabel: 'client tag',
  },
  { value: 'is:active', label: 'is:active', offset: 4 },
]);
export const grammarSearchModel = createSearchFieldModel({
  rules: [
    {
      name: 'tag',
      suggest: (input: string, state) =>
        [
          'backend',
          'blocked',
          'client',
          'design system',
          'frontend',
          'needs review',
          'shipping',
          'triage',
          'urgent',
        ].filter(
          (value) =>
            value.startsWith(input.toLowerCase()) &&
            !state.tokens.some(
              (token) => token.kind === 'tag' && token.parsedValue === value,
            ),
        ),
    },
    {
      name: 'is',
      parse: (input: string) =>
        ['open', 'closed'].includes(input.toLowerCase())
          ? input.toLowerCase()
          : undefined,
      suggest: (input: string) =>
        ['open', 'closed'].filter((value) =>
          value.startsWith(input.toLowerCase()),
        ),
    },
  ],
  evaluate: ({ query, tokens }) =>
    `${query.trim() || 'No free text'} · ${tokens.length} filters`,
});
export const bannerTone = signal<
  'neutral' | 'info' | 'pop' | 'success' | 'warning' | 'danger'
>('info');
export const toolbarChoice = signal<'list' | 'columns' | 'settings'>('list');
export const toolbarFindQuery = signal('');
export const toolbarFindOpen = signal(false);
export const collapsibleSearchOpen = signal(false);
export const toolbarGroupSearchOpen = signal(false);
export const toolbarStackSearchOpen = signal(false);
export const toolbarGroupShape = signal<'pill' | 'rounded'>('pill');
export const toolbarGroupBusy = signal(false);
export const buttonToggleConversationOpen = signal(false);
export const splitButtonRunning = signal(false);
export const splitButtonOptionsOpen = signal(false);
export const edgeActivityBusy = signal(false);
export const filePickerFiles = signal<string[]>([]);
export const comboboxTags = signal<string[]>(['bug']);
export const summaryRowSelected = signal('KF-12');
export const contentSwapStep = signal<'a' | 'b'>('a');
export const contentSwapFaded = signal<'a' | 'b'>('a');
export const edgeActivityMessage = signal(true);
export const contentCardSelected = signal(false);
export const contentCardChoice = signal('document-a');
export const contentCardSelections = signal<string[]>([]);
export const gridTileSelections = signal<string[]>([]);
export const conversationSelections = signal<string[]>([]);
export const toolbarSort = signal<'recent' | 'priority' | 'title'>('recent');
export const ticketLabels = signal<readonly string[]>(['bug', 'docs']);
export const itemTypes = signal<readonly string[]>(['files']);
export const ticketLabelFilter = signal<readonly string[]>(['bug', 'docs']);
export const toolbarAvatarChoice = signal<'primary' | 'secondary'>('primary');
export const floatingToolbarOpen = signal(false);
export const adoptionOpen = signal(true);
export const adoptionQuery = signal('');
export const adoptionTokens = signal<SearchFieldToken[]>([]);
export const adoptionReadout = signal('No edits yet');
export const ADOPTION_SUGGESTIONS: readonly SearchFieldToken[] = [
  { value: 'status:open', label: 'status:open' },
  { value: 'owner:me', label: 'owner:me' },
  { value: 'due:today', label: 'due:today' },
];
export const menuActionCurrent = signal('src/main.ts');
export const menuActionPressed = signal(false);
export const iconTileCurrent = signal('tile-run-tests');
export const inspectorSection = signal<'summary' | 'activity' | 'files'>(
  'summary',
);
/** Where the PopupMenu entry's context menu opens: the last right-click or button. */
export const popupContextAnchor = signal({ x: 0, y: 0 });

export const displayDensity = signal<'compact' | 'comfortable' | 'roomy'>(
  'comfortable',
);

/** A row in the drag-to-reorder ListItem and ListActionRow demos. */
export interface DemoReorderRow {
  id: string;
  label: string;
}
export const reorderCommands = signal<DemoReorderRow[]>([
  { id: 'run-tests', label: 'Run Tests' },
  { id: 'build', label: 'Build Package' },
  { id: 'lint', label: 'Lint Sources' },
  { id: 'deploy-preview', label: 'Deploy Preview' },
]);
export const reorderFiles = signal<DemoReorderRow[]>([
  { id: 'readme', label: 'README.md' },
  { id: 'changelog', label: 'CHANGELOG.md' },
  { id: 'package', label: 'package.json' },
]);
/** Item ids pressed in the reorder demos; dragging a pressed row moves them all. */
export const reorderSelection = signal<readonly string[]>([]);

/** The Badge entry's playground configuration, edited from its catalog settings pane. */
export interface BadgePlaygroundState {
  tone: 'neutral' | 'info' | 'pop' | 'success' | 'warning' | 'danger';
  appearance: 'quiet' | 'solid' | 'outline';
  shape: 'pill' | 'rounded';
  size: 'compact' | 'default';
}
export const badgePlayground = signal<BadgePlaygroundState>({
  tone: 'info',
  appearance: 'quiet',
  shape: 'pill',
  size: 'default',
});
export const checkboxTasks = signal<readonly string[]>(['design']);
export const radioDensity = signal<'compact' | 'balanced' | 'roomy'>(
  'balanced',
);
export const switchLiveUpdates = signal(true);
