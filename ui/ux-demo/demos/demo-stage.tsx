import './demo-stage.css';

import type { SafeHtml } from 'kerfjs';

interface DemoStageProps {
  children: SafeHtml;
  'data-demo-mode': 'component' | 'composition';
  recipeNotesVisible: boolean;
}

export function DemoStage({
  children,
  'data-demo-mode': mode,
  recipeNotesVisible,
}: DemoStageProps) {
  return (
    <div
      class="demo-stage-inner"
      data-demo-mode={mode}
      data-recipe-notes-visible={String(recipeNotesVisible)}
    >
      {children}
    </div>
  );
}
