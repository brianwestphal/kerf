import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/nav-stack.css';
import '@kerfjs/ui/toolbar-text.css';
import './recipes.css';

import { ListHeader } from '@kerfjs/ui/list-header';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { NavStack, type NavStackView } from '@kerfjs/ui/nav-stack';
import { Text } from '@kerfjs/ui/text';
import { signal } from 'kerfjs';
import { ChevronRight, FileText, Folder } from 'lucide';

import type { RecipeFactory } from './types.js';

interface LibraryItem {
  id: string;
  label: string;
  detail: string;
}

const ITEMS: LibraryItem[] = [
  {
    id: 'tokens',
    label: 'Design tokens',
    detail:
      'Semantic color, spacing, and radius scales shared across every surface.',
  },
  {
    id: 'controls',
    label: 'Toolbar controls',
    detail:
      'Control groups and segmented controls with their hover and pressed contracts.',
  },
  {
    id: 'layouts',
    label: 'App layouts',
    detail:
      'Navigation stacks, split views, workbench, and bottom-tab scaffolds.',
  },
];

export const createRecipe: RecipeFactory = (announce) => {
  const listView = (): NavStackView => ({
    key: 'library',
    title: 'Library',
    content: (
      <div class="recipe-navstack__view kui-pane__content kui-content">
        <section>
          <ListHeader label="Components" />
          {ITEMS.map((item) => (
            <ListItem
              action="recipe-action"
              itemId={item.id}
              label={item.label}
              icon={<LucideIcon icon={Folder} name="folder" />}
              trailing={<LucideIcon icon={ChevronRight} name="chevron-right" />}
            />
          ))}
        </section>
        <Text variant="p" class="kui-recipe__ownership kui-content-item">
          The recipe owns the stack as a signal of views and pushes/pops it;
          `NavStack` renders the stack and `wireNavStack` slides the content and
          settles the chrome. The app owns selection, data, and routing.
        </Text>
      </div>
    ),
  });

  const detailView = (item: LibraryItem): NavStackView => ({
    key: item.id,
    title: item.label,
    content: (
      <div class="recipe-navstack__view kui-pane__content kui-content">
        <div class="kui-content-item">
          <LucideIcon icon={FileText} name="file-text" />
          <strong>{item.label}</strong>
          <Text variant="p" class="kui-recipe__muted">
            {item.detail}
          </Text>
        </div>
      </div>
    ),
  });

  const views = signal<NavStackView[]>([listView()]);

  const render = () => (
    <section
      class="kui-recipe recipe-navstack kui-recipe__surface"
      data-recipe="recipe-navigation-stack"
    >
      <div class="recipe-navstack__stage">
        <NavStack
          id="recipe-nav"
          label="Component library"
          views={views.value}
        />
      </div>
    </section>
  );

  return {
    render,
    action(command, element) {
      if (command === 'nav-back') {
        if (views.value.length > 1) {
          views.value = views.value.slice(0, -1);
          announce('Navigated back');
        }
        return;
      }
      const id = element.dataset.itemId;
      const item = ITEMS.find((candidate) => candidate.id === id);
      if (item) {
        views.value = [...views.value, detailView(item)];
        announce(`Opened ${item.label}`);
      }
    },
  };
};
