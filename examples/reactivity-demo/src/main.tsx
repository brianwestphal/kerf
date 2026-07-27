/// <reference types="vite/client" />
import { mountArraySignalSection } from './sections/arraySignalSection.js';
import { mountCart } from './sections/cartSection.js';
import { mountCounter } from './sections/counterSection.js';
import { mountFineGrainedBinding } from './sections/fineGrainedBindingSection.js';
import { mountFocusSurvival } from './sections/focusSurvivalSection.js';
import { mountKeyedList } from './sections/keyedListSection.js';
import { mountMorphSkip } from './sections/morphSkipSection.js';
import { mountSvgRender } from './sections/svgSection.js';
import { mountTier2Capture } from './sections/tier2CaptureSection.js';

// Dev diagnostics: kerf never infers dev mode, so the app installs them behind
// its own build's dev flag. `vite build` folds `import.meta.env.DEV` to `false`,
// so neither this statement nor the chunk it would load ships to /kerf/demo/.
if (import.meta.env.DEV) await import('kerfjs/dev');

document.addEventListener('DOMContentLoaded', () => {
  mountCounter(document.getElementById('section-counter')!);
  mountCart(document.getElementById('section-cart')!);
  mountFocusSurvival(document.getElementById('section-focus')!);
  mountKeyedList(document.getElementById('section-list')!);
  mountMorphSkip(document.getElementById('section-skip')!);
  mountSvgRender(document.getElementById('section-svg')!);
  mountTier2Capture(document.getElementById('section-tier2')!);
  mountArraySignalSection(document.getElementById('section-arraysignal')!);
  mountFineGrainedBinding(document.getElementById('section-binding')!);
});
