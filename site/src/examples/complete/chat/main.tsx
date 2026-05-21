import { signal, mount, each, delegate, effect, attr, type AttrSpec } from 'kerfjs';

const ACTIONS = { copy: attr('data-action', 'copy') } as const satisfies Record<string, AttrSpec<'data-action'>>;
const ITEM = { id: attr('data-id') } as const;

interface Message { id: string; role: 'user' | 'bot'; text: string; streaming?: boolean }

const SCRIPT: Record<string, string> = {
  default: "Sure! Streaming uses one signal mutation per chunk — kerf's morph keeps your scroll position and the caret in the textarea untouched while the bubble fills in.",
  signals: "Signals are the reactive primitive. A `signal()` is a value plus a subscription set; reading it inside an `effect()` or `mount()` registers a dependency, and writing to it re-runs only the dependents.",
  streaming: "Each chunk just pushes a new string onto the last message's text. kerf's keyed-list reconciler diffs only that one bubble — the rest of the chat (and your composer caret) is never touched.",
  delegation: "Three tiers. Tier 1 — `delegate()` for bubbling events: clicks, input, keydown. Tier 2 — `delegateCapture()` for non-bubblers like blur and focus. Tier 3 — `data-morph-skip` for subtrees the framework should leave alone.",
  morph: "kerf doesn't ship a virtual DOM. JSX renders to a real HTML string; the morph algorithm walks the live tree and patches what changed, preserving focus, selection, and any owned subtrees.",
};

function reply(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('signal')) return SCRIPT.signals;
  if (p.includes('stream')) return SCRIPT.streaming;
  if (p.includes('delegate') || p.includes('event')) return SCRIPT.delegation;
  if (p.includes('morph') || p.includes('diff')) return SCRIPT.morph;
  return SCRIPT.default;
}

const messages = signal<Message[]>([
  { id: 'welcome', role: 'bot', text: "Hi! I'm a tiny demo chat built with kerf. Try a quick prompt below, or ask me anything." },
]);
const busy = signal(false);

const root = document.getElementById('app')!;

mount(root, () => (
  <>
    <header>
      <div class="brand">
        <div class="logo">k</div>
        <div>kerf chat</div>
      </div>
      <div class="status">
        <span class={`dot ${busy.value ? 'busy' : ''}`}></span>
        {busy.value ? 'Thinking…' : 'Connected'}
      </div>
    </header>

    <div class="messages" data-messages>
      {each(
        messages.value,
        (m) => (
          <div data-key={m.id} class={`msg ${m.role}`}>
            <div>
              <div class="bubble">
                {m.text}
                {m.streaming ? <span class="caret"></span> : null}
              </div>
              {m.role === 'bot' && !m.streaming ? (
                <div class="meta"><button class="copy" {...ACTIONS.copy.attrs} {...ITEM.id(m.id)}>Copy</button></div>
              ) : null}
            </div>
          </div>
        ),
        // Memo key changes per chunk while streaming, then settles. The reconciler
        // re-renders only the streaming bubble — every other row stays cached.
        (m) => `${m.id}-${m.text.length}-${m.streaming ? 's' : 'f'}`,
      )}
    </div>

    <div>
      <div class="chips">
        <button type="button" class="chip" data-prompt="What are signals?">What are signals?</button>
        <button type="button" class="chip" data-prompt="How does streaming work?">How does streaming work?</button>
        <button type="button" class="chip" data-prompt="Explain delegation">Explain delegation</button>
        <button type="button" class="chip" data-prompt="What is the morph?">What is the morph?</button>
      </div>
      <form class="composer" data-composer>
        {/*
          data-morph-skip on the textarea node: kerf's morph never recurses into it,
          so the user's draft + caret + selection survive every re-render no matter
          how often the messages list updates. The submit button has no skip so its
          disabled state still reflects busy.value.
        */}
        <textarea
          data-input
          data-morph-skip
          placeholder="Ask anything…  (Enter to send, Shift+Enter for newline)"
          rows={1}
        ></textarea>
        <button type="submit" disabled={busy.value}>Send</button>
      </form>
    </div>
  </>
));

// Auto-scroll on every message change. effect() re-runs whenever messages mutate.
effect(() => {
  messages.value;
  queueMicrotask(() => {
    const el = root.querySelector('[data-messages]') as HTMLElement | null;
    if (el) el.scrollTop = el.scrollHeight;
  });
});

// Tier 1: Enter sends, Shift+Enter inserts a newline. keydown bubbles.
delegate(root, 'keydown', '[data-input]', (e, el) => {
  const ev = e as KeyboardEvent;
  if (ev.key !== 'Enter' || ev.shiftKey) return;
  ev.preventDefault();
  send((el as HTMLTextAreaElement).value);
});

// Tier 1: form submit covers the Send button + Enter-when-button-focused.
delegate(root, 'submit', '[data-composer]', (e) => {
  e.preventDefault();
  const ta = root.querySelector('[data-input]') as HTMLTextAreaElement | null;
  send(ta?.value ?? '');
});

// Tier 1: prompt chips prefill + send.
delegate(root, 'click', '.chip', (_e, el) => {
  send((el as HTMLElement).dataset.prompt ?? '');
});

// Tier 1: copy any finished bot message.
delegate(root, 'click', ACTIONS.copy.selector, (_e, el) => {
  const id = (el as HTMLElement).dataset.id!;
  const m = messages.value.find((x) => x.id === id);
  if (m) void navigator.clipboard?.writeText(m.text);
});

function send(text: string) {
  const trimmed = text.trim();
  if (!trimmed || busy.value) return;
  const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
  const botMsg: Message = { id: `b-${Date.now()}`, role: 'bot', text: '', streaming: true };
  messages.value = [...messages.value, userMsg, botMsg];
  const ta = root.querySelector('[data-input]') as HTMLTextAreaElement | null;
  if (ta) ta.value = '';
  busy.value = true;
  streamReply(botMsg.id, reply(trimmed));
}

// Token-by-token streaming. One signal write per chunk; kerf re-renders only the row
// whose memo key changed.
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
    if (done) {
      busy.value = false;
      return;
    }
    setTimeout(tick, 35 + Math.random() * 45);
  };
  setTimeout(tick, 250);
}
