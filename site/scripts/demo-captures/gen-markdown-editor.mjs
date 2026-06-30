import { writeFileSync } from 'node:fs';

// Short markdown doc typed in live. Kept short on purpose: each typed step is a
// full DOM re-capture (one frame), so the frame count = text length / STEP.
const TEXT = '# Live\n\nMarkdown **renders** as you type.';
const STEP = 2; // characters added per frame — fast, readable "typing" cadence

// Build the cumulative text after each keystroke-group, ending exactly on TEXT.
const stops = [];
for (let k = STEP; k < TEXT.length; k += STEP) stops.push(TEXT.slice(0, k));
stops.push(TEXT); // ensure the final, complete doc is the last typed stop

// An `evaluate` action that sets the editor's text to `s` and fires a real
// `input` event so the kerf signal → computed → raw() → morph preview updates
// for real (not a cosmetic overlay). JSON-encode `s` so newlines/quotes survive.
const typeAction = (s) =>
  `(()=>{const ed=document.querySelector('.editor-input');ed.focus();ed.innerText=${JSON.stringify(
    s,
  )};ed.dispatchEvent(new InputEvent('input',{bubbles:true}));})()`;

const frames = [];

// Frame 0: clear the editor BEFORE the first capture, so the demo opens on a
// clean empty editor (no mid-demo "scene change" — the clear is never seen).
frames.push({
  transition: { type: 'cut', duration: 0 },
  input: '${base}/markdown-editor/',
  waitFor: '.editor-input',
  wait: 350,
  actions: [{ type: 'evaluate', script: typeAction('') }, { type: 'wait', ms: 120 }],
  duration: 650,
});

// Typing frames: add STEP chars each, capture the growing source + live preview.
stops.forEach((s, idx) => {
  const isLast = idx === stops.length - 1;
  frames.push({
    continue: true,
    transition: { type: 'cut', duration: 0 },
    actions: [{ type: 'evaluate', script: typeAction(s) }, { type: 'wait', ms: 45 }],
    // ~110 ms on-screen per group reads as brisk typing; hold the final doc long
    // enough to read the rendered preview (KF-280).
    duration: isLast ? 3000 : 110,
  });
});

const config = {
  width: 1000,
  // Short typed doc (H1 + one line) — keep the canvas tight so the panes aren't
  // mostly empty space below the content.
  height: 300,
  output: 'site/public/demos/markdown-editor.svg',
  optimize: true,
  colorScheme: 'dark',
  vars: { base: 'http://localhost:4188' },
  frames,
};

writeFileSync(
  'site/scripts/demo-captures/markdown-editor.json',
  JSON.stringify(config, null, 2) + '\n',
);
console.log(`markdown-editor.json: ${frames.length} frames (1 empty + ${stops.length} typing)`);
