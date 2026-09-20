import { CatalogExample } from '@kerfjs/ui/catalog';
import { TokenSearchField } from '@kerfjs/ui/token-search-field';

import { ADOPTION_SUGGESTIONS, adoptionOpen, adoptionQuery, adoptionReadout, adoptionTokens, collapsibleSearchOpen, tokenSearchQuery, tokenSearchTokens } from './state.js';

export function TokenSearchFieldDemo() {
  return <section class="token-search-demo kui-catalog-example-stack" data-demo="token-search-field" aria-label="TokenSearchField states">
    <CatalogExample label="Structured ticket search" note={<>Text and atomic filters remain in one keyboard-focusable editor.</>} align="inline-control">
      <TokenSearchField id="catalog-search" label="Search tickets" query={tokenSearchQuery.value} tokens={tokenSearchTokens.value} autofocus editorAttributes={{ 'data-demo-token-search': 'true' }} />
      <output aria-live="polite" class="kui-catalog-example__note">{tokenSearchTokens.value.length} filters · {tokenSearchQuery.value || 'No free text'}</output>
    </CatalogExample>
    <CatalogExample label="Collapsible" note={<>Empty and unfocused, it collapses to one iconic action; activating it reveals the editor and focuses it, and it re-collapses when focus leaves while empty. <code>wireTokenSearchFields</code> manages the expand/collapse/focus.</>} align="inline-control">
      <div class="token-search-demo__collapsible"><TokenSearchField id="collapsible-search" label="Find records" collapsible expanded={collapsibleSearchOpen.value} placeholder="Find records" expandLabel="Open find" /></div>
    </CatalogExample>
    <CatalogExample label="Disabled" note={<>Controlled read-only state preserves the complete expression.</>} align="inline-control">
      <TokenSearchField id="disabled-search" label="Saved search" query="release" tokens={[{ value: 'tag:design-system', label: 'tag:design-system', offset: 7 }]} disabled />
    </CatalogExample>
    <CatalogExample label="Adoption knobs" note={<>The <code>wireTokenSearchFields</code> hooks a real app reaches for: opt-in chip keyboard (Backspace/Delete remove the adjacent chip, ArrowRight moves the caret past it), a <code>data-token-search-keep-open</code> suggestions surface that does not collapse the empty field, and an <code>onEdit</code> readout.</>} align="inline-control">
      <div class="token-search-adoption">
        <TokenSearchField id="adoption-search" label="Filter records" collapsible expanded={adoptionOpen.value} query={adoptionQuery.value} tokens={adoptionTokens.value} placeholder="Filter records" tokenPlaceholder="Add a filter…" expandLabel="Open filter" editorAttributes={{ 'data-demo-adoption-search': 'true' }} />
        <ul class="token-search-adoption__suggestions" data-token-search-keep-open aria-label="Filter suggestions">
          {ADOPTION_SUGGESTIONS.map((suggestion) => <li><button type="button" class="token-search-adoption__suggestion" data-action="add-adoption-token" data-token-value={suggestion.value}>{suggestion.label}</button></li>)}
        </ul>
        <output aria-live="polite" class="kui-catalog-example__note" data-demo-adoption-readout>{adoptionReadout.value}</output>
      </div>
    </CatalogExample>
  </section>;
}
