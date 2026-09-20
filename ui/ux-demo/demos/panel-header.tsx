import { CatalogExample } from '@kerfjs/ui/catalog';
import { PanelHeader } from '@kerfjs/ui/panel-header';
import { Wrench } from 'lucide';

import { button, icon } from './state.js';

export function PanelHeaderDemo() {
  return <div class="kui-catalog-example-stack" data-demo="panel-header">
    <CatalogExample label="Page title (h1 heading)" note={<>Pass <code>headingLevel</code> for a page/view title so it is a real heading landmark (<code>role="heading"</code> + <code>aria-level</code>).</>} align="none"><PanelHeader title="UI foundations" titleId="panel-page-title" headingLevel={1} actions={button('New pattern', 'log-add')} /></CatalogExample>
    <CatalogExample label="Panel heading with icon and subtitle" note={<>A dialog/panel title omits <code>headingLevel</code> and is instead referenced by <code>aria-labelledby</code> pointing at its <code>titleId</code>.</>} align="none"><PanelHeader title="Package details" titleId="panel-standalone-title" summary="Production-backed primitives with explicit contracts." summaryId="panel-standalone-summary" icon={icon(Wrench, 'wrench')} actions={button('Done', 'log-done')} /></CatalogExample>
    <CatalogExample label="Placeholder" note={<>While a record loads, the header keeps its chrome and skeletons the title and subtitle.</>} align="none"><PanelHeader title="Package details" titleId="panel-placeholder-title" summary="Production-backed primitives with explicit contracts." summaryId="panel-placeholder-summary" icon={icon(Wrench, 'wrench')} placeholder /></CatalogExample>
  </div>;
}
