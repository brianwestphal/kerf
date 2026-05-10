import { mountArraySignalSection } from './sections/arraySignalSection.js';
import { mountCart } from './sections/cartSection.js';
import { mountCounter } from './sections/counterSection.js';
import { mountFocusSurvival } from './sections/focusSurvivalSection.js';
import { mountKeyedList } from './sections/keyedListSection.js';
import { mountMorphSkip } from './sections/morphSkipSection.js';
import { mountSvgRender } from './sections/svgSection.js';
import { mountTier2Capture } from './sections/tier2CaptureSection.js';

document.addEventListener('DOMContentLoaded', () => {
  mountCounter(document.getElementById('section-counter')!);
  mountCart(document.getElementById('section-cart')!);
  mountFocusSurvival(document.getElementById('section-focus')!);
  mountKeyedList(document.getElementById('section-list')!);
  mountMorphSkip(document.getElementById('section-skip')!);
  mountSvgRender(document.getElementById('section-svg')!);
  mountTier2Capture(document.getElementById('section-tier2')!);
  mountArraySignalSection(document.getElementById('section-arraysignal')!);
});
