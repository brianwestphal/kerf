import { SunkenPanel } from '../../../src/sunken-panel.js';
import { ValuePreview } from '../../../src/value-preview.js';

const longValue = [
  'A title with a deliberate line break',
  'Second line keeps its indentation and a long token:',
  `    ${'recorded-source-'.repeat(18)}`,
  'A final line remains available by scrolling.',
].join('\n');

const app = document.querySelector('[data-app]')!;
app.innerHTML = String(
  SunkenPanel({
    children: ValuePreview({
      label: 'Their Latest Version',
      value: longValue,
    }),
  }),
);
