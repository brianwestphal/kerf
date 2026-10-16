import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { SearchField } from '@kerfjs/ui/search-field';
import { Text } from '@kerfjs/ui/text';
import { TextField } from '@kerfjs/ui/text-field';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { CircleHelp, CircleX } from 'lucide';

import {
  ADOPTION_SUGGESTIONS,
  adoptionOpen,
  adoptionQuery,
  adoptionReadout,
  adoptionTokens,
  collapsibleSearchOpen,
  grammarSearchModel,
  searchFieldHelpOpen,
  searchFieldQuery,
  searchFieldTokens,
} from './state.js';

export const TOKEN_SEARCH_HELP_SURFACE_ID = 'catalog-search-field-help-surface';

/** Syntax help the Structured Ticket Search help toggle opens. */
export function SearchFieldHelp() {
  return (
    <ValueTable label="Search Syntax" density="compact">
      <ValueTableRow label="tag:name" value="Tickets with that tag" />
      <ValueTableRow label="is:open" value="Open tickets only" />
      <ValueTableRow label="is:closed" value="Closed tickets only" />
      <ValueTableRow label="NOT term" value="Exclude a word or filter" />
      <ValueTableRow label="a AND b" value="Both terms must match" />
      <ValueTableRow label="a OR b" value="Either term may match" />
      <ValueTableRow label='"a b"' value="The exact phrase" />
    </ValueTable>
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
        align="none"
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
        note="Text and atomic filters remain in one keyboard-focusable editor. The trailing help toggle reports its open state and opens syntax help beside the field."
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
              icon: <LucideIcon icon={CircleHelp} name="circle-help" />,
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
            aria-live="polite"
            data-demo-search-field-readout
          >
            {searchFieldTokens.value.length} filters ·{' '}
            {searchFieldQuery.value || 'No free text'}
          </Text>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Grammar Assisted Search"
        note="Type tag: or is: for suggestions below the field. Longer lists scroll inside a rounded popup. Committed tags leave the list; whitespace commits filters. Add release tag works directly or with an unfinished tag:rel prefix. Load saved search replaces the current draft."
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
            data-demo-grammar-result
          >
            <span>{grammarSearchModel.result}</span>
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
          <div
            data-search-field-keep-open
            role="group"
            aria-label="Filter Suggestions"
          >
            <Row wrap>
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
          </div>
          <Text
            variant="span"
            tone="quiet"
            size="compact"
            aria-live="polite"
            data-demo-adoption-readout
          >
            {adoptionReadout.value}
          </Text>
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
