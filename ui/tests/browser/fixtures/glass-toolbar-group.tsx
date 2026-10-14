import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ChevronLeft, ChevronRight, Grid2x2, List, Share2 } from 'lucide';

// Glass ToolbarControlGroups (`material="glass"`) laid over three backdrops:
// a light scene, a dark scene, and a busy multicolor image. Each scene holds
// a multi-control group with a pressed choice, a lone-control group, a text
// group with an outline selection, and a dark-toned glass group. The
// backdrops are test scaffolding only (inline gradients stand in for photos).
const scenes = {
  light: 'background:#f4f1ea',
  dark: 'background:#121214',
  busy: [
    'background:',
    'radial-gradient(circle at 12% 45%,#ff3b30 0 14%,transparent 15%),',
    'radial-gradient(circle at 58% 55%,#fff 0 9%,transparent 10%),',
    'repeating-linear-gradient(45deg,rgb(0 0 0/.85) 0 6px,transparent 6px 12px),',
    'linear-gradient(90deg,#0a84ff,#30d158 40%,#ffd60a 70%,#bf5af2)',
  ].join(''),
} as const;

const scene = (name: keyof typeof scenes) => (
  <section
    data-scene={name}
    style={`${scenes[name]};display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:32px;width:640px;box-sizing:border-box`}
  >
    <ToolbarControlGroup label="View" material="glass">
      <button type="button" aria-label="List" aria-pressed="true" data-list>
        <LucideIcon icon={List} name="list" />
      </button>
      <button type="button" aria-label="Grid" aria-pressed="false" data-grid>
        <LucideIcon icon={Grid2x2} name="grid-2x2" />
      </button>
    </ToolbarControlGroup>
    <ToolbarControlGroup label="Share" material="glass" single>
      <button type="button" aria-label="Share" data-share>
        <LucideIcon icon={Share2} name="share-2" />
      </button>
    </ToolbarControlGroup>
    <ToolbarControlGroup
      label="Filter"
      material="glass"
      content="text"
      selectedChrome="outline"
    >
      <button type="button" aria-pressed="true" data-all>
        All
      </button>
      <button type="button" aria-pressed="false" data-unread>
        Unread
      </button>
    </ToolbarControlGroup>
    <ToolbarControlGroup label="Pager" material="glass" tone="dark">
      <button type="button" aria-label="Previous" data-previous>
        <LucideIcon icon={ChevronLeft} name="chevron-left" />
      </button>
      <button type="button" aria-label="Next" data-next>
        <LucideIcon icon={ChevronRight} name="chevron-right" />
      </button>
    </ToolbarControlGroup>
    <ToolbarControlGroup label="Solid">
      <button type="button" aria-label="Solid List">
        <LucideIcon icon={List} name="list" />
      </button>
    </ToolbarControlGroup>
  </section>
);

document.querySelector('[data-app]')!.innerHTML = String(
  <>
    {scene('light')}
    {scene('dark')}
    {scene('busy')}
  </>,
);
