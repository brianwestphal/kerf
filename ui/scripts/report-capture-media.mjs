// Report the OS-driven media features the design-template capture browser
// sees. The templates are captured in the default presentation; on a machine
// that reports reduced transparency, more contrast, or a slow-updating
// display, the glass and chrome materials resolve opaque and the templates
// drift from the committed set. CI runs this right before the drift check, so
// a failure there shows which preference the runner reported.

import { chromium } from '@playwright/test';

const queries = [
  '(prefers-reduced-transparency: reduce)',
  '(prefers-contrast: more)',
  '(update: slow)',
  '(prefers-reduced-motion: reduce)',
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const matches = await page.evaluate(
    (list) =>
      list.map((query) => [query, globalThis.matchMedia(query).matches]),
    queries,
  );
  for (const [query, matched] of matches)
    console.log(`[capture-media] ${query}: ${matched ? 'MATCHES' : 'no'}`);
} finally {
  await browser.close();
}
