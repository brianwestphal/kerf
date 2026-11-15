import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Chip } from '@kerfjs/ui/chip';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { SearchField } from '@kerfjs/ui/search-field';
import { Text } from '@kerfjs/ui/text';
import { TextField } from '@kerfjs/ui/text-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { CircleQuestionMark, CircleX } from 'lucide';

import {
  ADOPTION_SUGGESTIONS,
  adoptionOpen,
  adoptionQuery,
  adoptionReadout,
  adoptionTokens,
  collapsibleSearchOpen,
  findReadoutGroupIndex,
  findReadoutGroupOpen,
  findReadoutGroupQuery,
  findReadoutIndex,
  findReadoutQuery,
  grammarSearchModel,
  searchFieldHelpOpen,
  searchFieldQuery,
  searchFieldTokens,
} from './state.js';

/** The passage the Find Readout example searches. */
export const FIND_READOUT_PASSAGE =
  'Release notes list each release candidate. Every release links its notes, and the notes name the release owner.';

/** "2 of 5" for the active match, "No matches", or nothing for no query. */
export function findReadout(query: string, index: number): string {
  const needle = query.trim().toLowerCase();
  if (!needle) return '';
  const haystack = FIND_READOUT_PASSAGE.toLowerCase();
  let count = 0;
  for (
    let at = haystack.indexOf(needle);
    at !== -1;
    at = haystack.indexOf(needle, at + needle.length)
  )
    count += 1;
  return count ? `${(index % count) + 1} of ${count}` : 'No matches';
}

export const TOKEN_SEARCH_HELP_SURFACE_ID = 'catalog-search-field-help-surface';

/** Filters the syntax help offers, grouped as the help popup shows them. */
export const SEARCH_HELP_FILTERS: readonly {
  label: string;
  filters: readonly string[];
}[] = [
  { label: 'Tags', filters: ['tag:client', 'tag:release', 'tag:urgent'] },
  { label: 'Status', filters: ['is:open', 'is:closed', 'is:active'] },
];

/**
 * Syntax help the Structured Ticket Search help toggle opens: a title, one
 * line, and groups of filter chips that insert themselves into the field.
 */
export function SearchFieldHelp() {
  return (
    <List gap="s" contentWidth="compact">
      <List gap="2xs">
        <Text variant="h2" size="medium" flush>
          Search Syntax
        </Text>
        <Text size="compact" tone="quiet" flush>
          Type words, then add any filters you need.
        </Text>
      </List>
      {SEARCH_HELP_FILTERS.map((group) => (
        <List
          gap="2xs"
          rootAttributes={{ role: 'group', 'aria-label': group.label }}
        >
          <Text size="compact" tone="quiet" flush>
            {group.label}
          </Text>
          <Row wrap>
            {group.filters.map((filter) => (
              <Chip
                action="insert-search-help-filter"
                actionLabel={`Insert filter ${filter}`}
                itemId={filter}
              >
                {filter}
              </Chip>
            ))}
          </Row>
        </List>
      ))}
      <Text size="compact" tone="quiet" flush>
        Combine filters with AND, OR, NOT, and "quoted phrases".
      </Text>
    </List>
  );
}

export function SearchFieldDemo() {
  return (
    <CatalogExampleStack
      label="SearchField States"
      rootAttributes={{ 'data-demo': 'search-field' }}
    >
      <CatalogExample
        label="Saved-View Form Fields"
        note="The query field shares label, hint, required, and control edges with Web Awesome input without a Toolbar."
        align="inline-control"
        viewport={{ layout: 'grid', width: 'compact' }}
      >
        <List gap="m" rootAttributes={{ 'data-demo-token-form': '' }}>
          <TextField
            label="View Name"
            hint="Name this saved view."
            required
            value="Open procurement"
          />
          <SearchField
            id="saved-view-query"
            label="Search Query"
            presentation="form-field"
            hint="Add filters to narrow the view."
            required
            query="status:open"
            tokens={[{ value: 'tag:client', label: 'tag:client', offset: 0 }]}
          />
        </List>
      </CatalogExample>
      <CatalogExample
        label="Structured Ticket Search"
        note="Text and filter chips share one editor. The help button lists filters to insert."
        align="inline-control"
      >
        <List gap="xs">
          <SearchField
            id="catalog-search"
            label="Search Tickets"
            query={searchFieldQuery.value}
            tokens={searchFieldTokens.value}
            autofocus
            trailingAction={{
              icon: (
                <LucideIcon
                  icon={CircleQuestionMark}
                  name="circle-question-mark"
                />
              ),
              label: 'Search Help',
              action: 'toggle-search-field-help',
              id: 'catalog-search-field-help',
              expanded: searchFieldHelpOpen.value,
              haspopup: 'dialog',
              controls: searchFieldHelpOpen.value
                ? TOKEN_SEARCH_HELP_SURFACE_ID
                : undefined,
            }}
            editorAttributes={{ 'data-demo-search-field': 'true' }}
          />
          <Text
            variant="span"
            tone="quiet"
            size="compact"
            live="polite"
            rootAttributes={{ 'data-demo-search-field-readout': '' }}
          >
            {searchFieldTokens.value.length} filters ·{' '}
            {searchFieldQuery.value || 'No free text'}
          </Text>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Grammar Assisted Search"
        note="Type tag: or is: for suggestions. A space commits a filter."
        align="inline-control"
      >
        <List gap="xs">
          <SearchField
            id="grammar-search"
            label="Search with Filters"
            model={grammarSearchModel}
          />
          <Button
            size="compact"
            emphasis="secondary"
            action="commit-grammar-release"
          >
            Add Release Tag
          </Button>
          <Button
            size="compact"
            emphasis="secondary"
            action="replace-grammar-search"
          >
            Load Saved Search
          </Button>
          <Text
            variant="span"
            tone="quiet"
            size="compact"
            rootAttributes={{ 'data-demo-grammar-result': '' }}
          >
            {grammarSearchModel.result.value ?? ''}
          </Text>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Collapsible"
        note={
          <>
            Empty and unfocused, it collapses to one iconic action; activating
            it reveals the editor and focuses it, and it re-collapses when focus
            leaves while empty. <code>wireSearchFields</code> manages the
            expand/collapse/focus.
          </>
        }
        align="inline-control"
      >
        <SearchField
          id="collapsible-search"
          label="Find Records"
          collapsible
          expanded={collapsibleSearchOpen.value}
          placeholder="Find records"
          expandLabel="Open find"
        />
      </CatalogExample>
      <CatalogExample
        label="Find Readout"
        note={
          <>
            <code>resultText</code> shows a find-in-content count inside the
            field, before Clear, in standalone and toolbar-group fields. Type to
            count matches in the passage below and press Enter for the next one.
            The readout describes the editor and is announced politely once it
            settles; at a narrow width it ellipsizes, then hides, before the
            editor gives up its room.
          </>
        }
        align="inline-control"
        rootAttributes={{ 'data-demo-find-readout': '' }}
      >
        <List gap="xs">
          <SearchField
            id="find-readout-search"
            label="Find in Notes"
            query={findReadoutQuery.value}
            placeholder="Find in notes"
            clearAction="clear-find-readout"
            resultText={findReadout(
              findReadoutQuery.value,
              findReadoutIndex.value,
            )}
            editorAttributes={{ 'data-demo-find-readout': 'standalone' }}
          />
          <Toolbar
            label="Notes Controls"
            leading={
              <ToolbarControlGroup
                content="search"
                expanded={
                  findReadoutGroupOpen.value ||
                  findReadoutGroupQuery.value.length > 0
                }
                single={
                  !findReadoutGroupOpen.value &&
                  findReadoutGroupQuery.value.length === 0
                }
              >
                <SearchField
                  id="find-readout-group-search"
                  label="Find in Notes"
                  query={findReadoutGroupQuery.value}
                  collapsible
                  expanded={findReadoutGroupOpen.value}
                  presentation="toolbar-group"
                  placeholder="Find in notes"
                  expandLabel="Open find"
                  clearAction="clear-find-readout"
                  resultText={findReadout(
                    findReadoutGroupQuery.value,
                    findReadoutGroupIndex.value,
                  )}
                  editorAttributes={{ 'data-demo-find-readout': 'group' }}
                />
              </ToolbarControlGroup>
            }
          />
          <Text variant="p" tone="quiet">
            {FIND_READOUT_PASSAGE}
          </Text>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Disabled"
        note={
          <>
            Controlled read-only state preserves the complete expression. A{' '}
            <code>clearIcon</code> replaces the clear glyph.
          </>
        }
        align="inline-control"
      >
        <SearchField
          id="disabled-search"
          label="Saved Search"
          query="release"
          tokens={[
            {
              value: 'tag:design-system',
              label: 'tag:design-system',
              offset: 7,
            },
          ]}
          clearIcon={<LucideIcon icon={CircleX} name="circle-x" />}
          disabled
        />
      </CatalogExample>
      <CatalogExample
        label="Adoption Knobs"
        note={
          <>
            The <code>wireSearchFields</code> hooks a real app reaches for:
            opt-in chip keyboard (Backspace/Delete remove the adjacent chip,
            ArrowRight moves the caret past it), a{' '}
            <code>data-search-field-keep-open</code> suggestions surface that
            does not collapse the empty field, and an <code>onEdit</code>{' '}
            readout.
          </>
        }
        align="inline-control"
      >
        <List gap="xs">
          <SearchField
            id="adoption-search"
            clearAction="clear-adoption-search"
            label="Filter Records"
            collapsible
            expanded={adoptionOpen.value}
            query={adoptionQuery.value}
            tokens={adoptionTokens.value}
            placeholder="Filter records"
            tokenPlaceholder="Add a filter…"
            expandLabel="Open filter"
            editorAttributes={{ 'data-demo-adoption-search': 'true' }}
          />
          <Row
            wrap
            ariaLabel="Filter Suggestions"
            rootAttributes={{ 'data-search-field-keep-open': '' }}
          >
            {ADOPTION_SUGGESTIONS.map((suggestion) => (
              <Button
                size="compact"
                emphasis="secondary"
                action="add-adoption-token"
                rootAttributes={{ 'data-token-value': suggestion.value }}
              >
                {suggestion.label}
              </Button>
            ))}
          </Row>
          <Text
            variant="span"
            tone="quiet"
            size="compact"
            live="polite"
            rootAttributes={{ 'data-demo-adoption-readout': '' }}
          >
            {adoptionReadout.value}
          </Text>
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
