import '@awesome.me/webawesome/dist/components/button/button.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { TokenSearchField } from '@kerfjs/ui/token-search-field';
import { CircleX } from 'lucide';

import {
  ADOPTION_SUGGESTIONS,
  adoptionOpen,
  adoptionQuery,
  adoptionReadout,
  adoptionTokens,
  collapsibleSearchOpen,
  grammarSearchModel,
  tokenSearchQuery,
  tokenSearchTokens,
} from './state.js';

export function TokenSearchFieldDemo() {
  return (
    <CatalogExampleStack
      label="TokenSearchField states"
      rootAttributes={{ 'data-demo': 'token-search-field' }}
    >
      <CatalogExample
        label="Structured ticket search"
        note="Text and atomic filters remain in one keyboard-focusable editor."
        align="inline-control"
      >
        <List gap="xs">
          <TokenSearchField
            id="catalog-search"
            label="Search tickets"
            query={tokenSearchQuery.value}
            tokens={tokenSearchTokens.value}
            autofocus
            editorAttributes={{ 'data-demo-token-search': 'true' }}
          />
          <Text
            variant="span"
            tone="quiet"
            size="compact"
            aria-live="polite"
            data-demo-token-search-readout
          >
            {tokenSearchTokens.value.length} filters ·{' '}
            {tokenSearchQuery.value || 'No free text'}
          </Text>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Grammar assisted search"
        note="Type tag: or is: for suggestions below the field. Longer lists scroll inside a rounded popup. Committed tags leave the list; whitespace commits filters. Add release tag works directly or with an unfinished tag:rel prefix. Load saved search replaces the current draft."
        align="inline-control"
      >
        <List gap="xs">
          <TokenSearchField
            id="grammar-search"
            label="Search with filters"
            model={grammarSearchModel}
          />
          <wa-button
            size="small"
            appearance="outlined"
            data-action="commit-grammar-release"
          >
            Add release tag
          </wa-button>
          <wa-button
            size="small"
            appearance="outlined"
            data-action="replace-grammar-search"
          >
            Load saved search
          </wa-button>
          <Text
            variant="span"
            tone="quiet"
            size="compact"
            data-demo-grammar-result
          >
            {grammarSearchModel.result.value}
          </Text>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Collapsible"
        note={
          <>
            Empty and unfocused, it collapses to one iconic action; activating
            it reveals the editor and focuses it, and it re-collapses when focus
            leaves while empty. <code>wireTokenSearchFields</code> manages the
            expand/collapse/focus.
          </>
        }
        align="inline-control"
      >
        <TokenSearchField
          id="collapsible-search"
          label="Find records"
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
        <TokenSearchField
          id="disabled-search"
          label="Saved search"
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
        label="Adoption knobs"
        note={
          <>
            The <code>wireTokenSearchFields</code> hooks a real app reaches for:
            opt-in chip keyboard (Backspace/Delete remove the adjacent chip,
            ArrowRight moves the caret past it), a{' '}
            <code>data-token-search-keep-open</code> suggestions surface that
            does not collapse the empty field, and an <code>onEdit</code>{' '}
            readout.
          </>
        }
        align="inline-control"
      >
        <List gap="xs">
          <TokenSearchField
            id="adoption-search"
            clearAction="clear-adoption-search"
            label="Filter records"
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
            data-token-search-keep-open
            role="group"
            aria-label="Filter suggestions"
          >
            <Row wrap>
              {ADOPTION_SUGGESTIONS.map((suggestion) => (
                <wa-button
                  size="small"
                  appearance="outlined"
                  data-action="add-adoption-token"
                  data-token-value={suggestion.value}
                >
                  {suggestion.label}
                </wa-button>
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
