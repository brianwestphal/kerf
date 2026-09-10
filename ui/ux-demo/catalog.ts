export const catalogCategories = ['Foundation', 'Structure', 'Navigation', 'Controls', 'Feedback'] as const;
export type CatalogCategory = typeof catalogCategories[number];

export interface CatalogEntry {
  id: string;
  name: string;
  category: CatalogCategory;
  kind: 'component' | 'composition';
  description: string;
  uses?: readonly string[];
}

export const catalog = [
  { id: 'lucide-icon', name: 'LucideIcon', category: 'Foundation', kind: 'component', description: 'Decorative and meaningfully labeled Lucide-compatible icons.', uses: [] },
  { id: 'toolbar', name: 'Toolbar', category: 'Structure', kind: 'component', description: 'Leading, centered, and trailing toolbar composition.', uses: ['toolbar-text', 'toolbar-control-group'] },
  { id: 'toolbar-control-group', name: 'ToolbarControlGroup', category: 'Structure', kind: 'component', description: 'Contained, borderless, pressed, and single-control toolbar groups.', uses: ['lucide-icon'] },
  { id: 'toolbar-text', name: 'ToolbarText', category: 'Structure', kind: 'component', description: 'Large, default, and compact toolbar identity text.', uses: [] },
  { id: 'headers', name: 'Header composition', category: 'Structure', kind: 'composition', description: 'Page, dialog, and definition-list hierarchy.', uses: ['page-header', 'dialog-header', 'value-table'] },
  { id: 'page-header', name: 'PageHeader', category: 'Structure', kind: 'component', description: 'Page identity with an optional trailing action.', uses: [] },
  { id: 'dialog-header', name: 'DialogHeader', category: 'Structure', kind: 'component', description: 'Dialog title, summary, icon, and action hierarchy.', uses: ['lucide-icon'] },
  { id: 'value-table', name: 'ValueTable', category: 'Structure', kind: 'component', description: 'Semantic key/value rows with inset separators.', uses: [] },
  { id: 'menu', name: 'Menu composition', category: 'Navigation', kind: 'composition', description: 'Navigation rows and section headers with explicit state.', uses: ['menu-header', 'menu-item'] },
  { id: 'menu-header', name: 'MenuHeader', category: 'Navigation', kind: 'component', description: 'Section headings with optional action and disclosure states.', uses: ['lucide-icon'] },
  { id: 'menu-item', name: 'MenuItem', category: 'Navigation', kind: 'component', description: 'Selectable, disabled, trailing, and multiline navigation rows.', uses: ['lucide-icon'] },
  { id: 'tabs', name: 'AppTab', category: 'Navigation', kind: 'component', description: 'Roving-tabindex-ready tabs with optional close affordances.', uses: ['lucide-icon'] },
  { id: 'resize', name: 'ResizableRegion', category: 'Controls', kind: 'component', description: 'Pointer and keyboard-operable split region.', uses: [] },
  { id: 'select', name: 'Select', category: 'Controls', kind: 'component', description: 'Web Awesome select adapter with grouped choices.', uses: ['lucide-icon'] },
  { id: 'feedback', name: 'Feedback composition', category: 'Feedback', kind: 'composition', description: 'Banners, empty states, and labeled progress.', uses: ['state-banner', 'empty-state', 'loading-spinner'] },
  { id: 'state-banner', name: 'StateBanner', category: 'Feedback', kind: 'component', description: 'Polite status and assertive alert feedback with semantic tones.', uses: ['lucide-icon'] },
  { id: 'empty-state', name: 'EmptyState', category: 'Feedback', kind: 'component', description: 'Actionable empty and busy content states.', uses: ['lucide-icon', 'loading-spinner'] },
  { id: 'loading-spinner', name: 'LoadingSpinner', category: 'Feedback', kind: 'component', description: 'Meaningfully labeled or decorative progress.', uses: [] },
] as const satisfies readonly CatalogEntry[];

export type CatalogId = typeof catalog[number]['id'];

export const catalogSections = catalogCategories.map((category) => ({
  category,
  entries: catalog.filter((entry) => entry.category === category),
}));

export function findCatalogEntry(id: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.id === id);
}

export function catalogEntriesUsing(id: string): CatalogEntry[] {
  return catalog.filter((entry) => (entry.uses as readonly string[]).includes(id));
}

export function isCatalogId(value: string | null): value is CatalogId {
  return catalog.some((entry) => entry.id === value);
}
