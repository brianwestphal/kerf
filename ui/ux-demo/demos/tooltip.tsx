import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Row } from '@kerfjs/ui/row';
import { tooltip, type TooltipOptions } from 'kerfjs/overlay';

/** The exit every demo tooltip takes, as `@kerfjs/ui/overlay-tooltip.css` names it. */
const EXIT: TooltipOptions = {
  exitClass: 'kui-tooltip-exit',
  exitDuration: 100,
};

const TEXT_TIPS: Record<string, string> = {
  deploy:
    'Builds the current branch and deploys it to staging. Production needs a separate approval.',
  retry: 'Runs the failed checks again.',
};

function anchor(id: string, label: string) {
  return <Button rootAttributes={{ 'data-tooltip-demo': id }}>{label}</Button>;
}

/**
 * Attach the demo's tooltips under `root` with the public `tooltip()`;
 * returns a disposer that removes them all.
 */
export function wireTooltipDemo(root: Element): () => void {
  const stops = [
    ...root.querySelectorAll<HTMLElement>('[data-tooltip-demo]'),
  ].map((element) => {
    const id = element.dataset.tooltipDemo ?? '';
    if (id === 'build')
      return tooltip(
        element,
        () => (
          <span class="kerf-tooltip__text">
            <strong>Build 1482 passed</strong>
            <br />
            412 tests in 3 minutes 18 seconds.
          </span>
        ),
        { ...EXIT, placement: 'bottom' },
      );
    const text = TEXT_TIPS[id];
    return text === undefined ? () => {} : tooltip(element, text, EXIT);
  });
  return () => stops.forEach((stop) => stop());
}

export function TooltipDemo() {
  return (
    <CatalogExampleStack
      label="Tooltip Variants"
      rootAttributes={{ 'data-demo': 'tooltip' }}
    >
      <CatalogExample
        label="Text Tooltips"
        note="kerfjs/overlay's tooltip() with @kerfjs/ui/overlay-tooltip.css imported: hover or focus a control and, after a short delay, a help-tag-style tooltip appears above it, wrapping longer text at 40 characters. It fades out through exitClass 'kui-tooltip-exit'."
        align="inline-control"
      >
        <Row gap="xs" wrap>
          {anchor('deploy', 'Deploy')}
          {anchor('retry', 'Retry')}
        </Row>
      </CatalogExample>
      <CatalogExample
        label="Rich Tooltip"
        note="A render function supplies structured content, which inherits the tooltip's colors; placement: 'bottom' shows it below the control."
        align="inline-control"
      >
        {anchor('build', 'Build Status')}
      </CatalogExample>
    </CatalogExampleStack>
  );
}
