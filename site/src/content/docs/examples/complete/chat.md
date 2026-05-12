---
title: Chat UI
description: Streaming chat — token-by-token bot reply, delegation everywhere, composer caret never disturbed.
---

**[▶ Run live](/kerf/run/chat/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/chat)

A small streaming chat. Type a question, hit Enter, watch the bot reply type itself out token-by-token while your textarea caret stays exactly where you left it. ~110 lines of kerf, no other runtime dependencies.

<div class="video-placeholder">
  🎬 <strong>Demo clip — Coming Soon</strong>
  <p>30-second screen-record showing the streaming bubble + caret survival.</p>
</div>

**What to look at:**

- **One `each()` over the message list.** The keyed list reconciler owns the messages. When a chunk streams in, only the streaming bubble's row re-renders — every other row is cached by its memo key.
- **Streaming = one signal write per chunk.** `streamReply()` is a plain `setTimeout` loop that mutates the last message's `text`. There's no observable, no async iterator, no special framework hook. kerf's keyed-list memo (`` `${m.id}-${m.text.length}-${m.streaming ? 's' : 'f'}` ``) is what tells the reconciler "the streaming row's content changed, the rest is identical."
- **`data-morph-skip` on the textarea.** The composer textarea is marked skip so the morph never recurses into it. The user's draft, caret, and selection survive every re-render no matter how often the messages list updates. The Send button sits *outside* the skip boundary so its `disabled` state still tracks `busy.value`.
- **Delegation, everywhere.** One `delegate(root, 'keydown', '[data-input]', …)` for Enter-to-send. One `delegate(root, 'submit', '[data-composer]', …)` for the button + Enter-when-button-focused path. One `delegate(root, 'click', '.chip', …)` for the quick-prompt chips. One `delegate(root, 'click', '[data-action="copy"]', …)` for the per-bubble copy button. All Tier 1 (bubbling). No per-message listeners.
- **`effect()` for auto-scroll.** A standalone `effect()` subscribes to `messages.value` and scrolls the messages container to the bottom in a microtask. Decoupled from `mount()` — it's just a reactive side-effect.

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/chat)

```tsx
// site/src/examples/complete/chat/main.tsx (excerpt — full source on GitHub)
import { signal, mount, each, delegate, effect } from 'kerfjs';

interface Message { id: string; role: 'user' | 'bot'; text: string; streaming?: boolean }

const messages = signal<Message[]>([/* …seed welcome message… */]);
const busy = signal(false);

mount(root, () => (
  <>
    <header>{/* …brand + status pill… */}</header>
    <div class="messages" data-messages>
      {each(
        messages.value,
        (m) => (
          <div data-key={m.id} class={`msg ${m.role}`}>
            <div class="bubble">
              {m.text}
              {m.streaming ? <span class="caret"></span> : null}
            </div>
          </div>
        ),
        // Memo per chunk → only the streaming row re-renders.
        (m) => `${m.id}-${m.text.length}-${m.streaming ? 's' : 'f'}`,
      )}
    </div>
    <form class="composer" data-composer>
      {/* data-morph-skip → caret + selection survive every re-render */}
      <textarea data-input data-morph-skip rows={1} placeholder="Ask anything…"></textarea>
      <button type="submit" disabled={busy.value}>Send</button>
    </form>
  </>
));

// Auto-scroll on every message change.
effect(() => {
  messages.value;
  queueMicrotask(() => {
    const el = root.querySelector('[data-messages]') as HTMLElement;
    el.scrollTop = el.scrollHeight;
  });
});

// Tier 1 delegations — clicks, keydown, submit all bubble.
delegate(root, 'keydown', '[data-input]', (e, el) => {
  const ev = e as KeyboardEvent;
  if (ev.key !== 'Enter' || ev.shiftKey) return;
  ev.preventDefault();
  send((el as HTMLTextAreaElement).value);
});
delegate(root, 'submit', '[data-composer]', (e) => {
  e.preventDefault();
  send((root.querySelector('[data-input]') as HTMLTextAreaElement).value);
});

function send(text: string) {
  const t = text.trim();
  if (!t || busy.value) return;
  const botId = `b-${Date.now()}`;
  messages.value = [
    ...messages.value,
    { id: `u-${Date.now()}`, role: 'user', text: t },
    { id: botId, role: 'bot', text: '', streaming: true },
  ];
  (root.querySelector('[data-input]') as HTMLTextAreaElement).value = '';
  busy.value = true;
  streamReply(botId, replyFor(t));
}

// Token-by-token: one signal mutation per chunk. The list reconciler diffs only
// the streaming row — every other bubble (and the textarea) is left alone.
function streamReply(botId: string, full: string) {
  const tokens = full.match(/\S+\s*/g) ?? [full];
  let i = 0;
  const tick = () => {
    i += 1;
    const partial = tokens.slice(0, i).join('');
    const done = i >= tokens.length;
    messages.value = messages.value.map((m) =>
      m.id === botId ? { ...m, text: partial, streaming: !done } : m,
    );
    if (done) { busy.value = false; return; }
    setTimeout(tick, 35 + Math.random() * 45);
  };
  setTimeout(tick, 250);
}
```
