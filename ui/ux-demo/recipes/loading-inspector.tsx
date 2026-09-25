import '@kerfjs/ui/layout.css';
import '@kerfjs/ui/select/register';
import './recipes.css';

import { em } from '@kerfjs/ui/css-values';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { SegmentedControl } from '@kerfjs/ui/segmented-control';
import { Select } from '@kerfjs/ui/select';
import { Skeleton } from '@kerfjs/ui/skeleton';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { signal } from 'kerfjs';
import { Columns3, FileText, Inbox, List } from 'lucide';

import type { RecipeFactory } from './types.js';

const icon = (node: Parameters<typeof LucideIcon>[0]['icon'], name: string) => (
  <LucideIcon icon={node} name={name} />
);

/**
 * A record inspector whose per-record values load asynchronously. Every
 * value-bearing component takes `placeholder` from one loading flag, so the same
 * chrome renders a faithful loading state and then the populated record — no
 * separate skeleton markup. The composition is the point; `Skeleton` is the
 * primitive it is built on (see the Skeleton component demo).
 */
export const createRecipe: RecipeFactory = (announce) => {
  const loading = signal(true);
  const render = () => {
    const p = loading.value;
    return (
      <Pane
        element="section"
        className="kui-recipe recipe-inspector kui-recipe__surface"
        contentClassName="recipe-inspector__body"
        rootAttributes={{
          'data-recipe': 'recipe-loading-inspector',
          'data-inspector-loading': String(p),
        }}
        header={
          <>
            <Toolbar
              label="Ticket inspector"
              dividerSides=""
              leading={
                <>
                  <ToolbarControlGroup appearance="borderless" single>
                    {icon(FileText, 'file-text')}
                  </ToolbarControlGroup>
                  <ToolbarText
                    text="Ticket · KF-2048"
                    size="xlarge"
                    id="recipe-inspector-title"
                    placeholder={p}
                  />
                </>
              }
              trailing={
                <ToolbarControlGroup
                  appearance="borderless"
                  content="text"
                  single
                >
                  <button
                    type="button"
                    data-action="recipe-action"
                    data-recipe-command="toggle"
                  >
                    {p ? 'Show loaded' : 'Show loading'}
                  </button>
                </ToolbarControlGroup>
              }
            />
            <Text
              class="kui-recipe__heading-summary"
              id="recipe-inspector-summary"
            >
              {p ? (
                <Skeleton width={em(18)} />
              ) : (
                'Restore keyboard focus after a dialog closes'
              )}
            </Text>
          </>
        }
      >
        <section>
          <ValueTable label="Ticket details">
            <ValueTableRow
              label="Status"
              value="In review"
              icon={icon(Inbox, 'inbox')}
              placeholder={p}
            />
            <ValueTableRow label="Owner" value="Mara Lopez" placeholder={p} />
            <ValueTableRow label="Priority" value="High" placeholder={p} />
            <ValueTableRow
              label="Updated"
              value="2 hours ago"
              placeholder={p}
            />
          </ValueTable>
        </section>
        <div class="recipe-inspector__controls">
          <Select
            name="recipe-inspector-status"
            value="review"
            label="Status"
            placeholder={p}
            choices={[
              { value: 'review', label: 'In review' },
              { value: 'ready', label: 'Ready' },
              { value: 'done', label: 'Done' },
            ]}
          />
          <SegmentedControl
            id="recipe-inspector-view"
            label="Inspector view"
            value="details"
            appearance="toolbar"
            shape="pill"
            size="small"
            placeholder={p}
            choices={[
              {
                value: 'details',
                label: 'Details',
                content: icon(List, 'list'),
              },
              {
                value: 'activity',
                label: 'Activity',
                content: icon(Columns3, 'columns-3'),
              },
              {
                value: 'files',
                label: 'Files',
                content: icon(FileText, 'file-text'),
              },
            ]}
          />
        </div>
        <section>
          <ListItem
            action="recipe-action"
            itemId="reassign"
            label="Reassign ticket"
            icon={icon(Inbox, 'inbox')}
            placeholder={p}
          />
          <ListItem
            action="recipe-action"
            itemId="watch"
            label="Watch for changes"
            placeholder={p}
          />
        </section>
        {p ? (
          <StateBanner
            tone="info"
            title=""
            detail=""
            icon={icon(FileText, 'file-text')}
            placeholder
          />
        ) : (
          <StateBanner
            tone="success"
            title="Up to date"
            detail="All checks passed on the latest revision."
            icon={icon(FileText, 'file-text')}
          />
        )}
        <Text class="kui-recipe__ownership kui-content-item">
          Each value-bearing component's <code>placeholder</code> prop renders
          skeletons in its value slots while loading, so the recipe composes a
          faithful loading inspector from real chrome. The app owns the loading
          lifecycle and which values are still unknown.
        </Text>
      </Pane>
    );
  };
  return {
    render,
    action(command) {
      if (command === 'toggle') {
        loading.value = !loading.value;
        announce(loading.value ? 'Inspector is loading' : 'Inspector loaded');
      }
    },
  };
};
