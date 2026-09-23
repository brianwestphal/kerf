/** Run one native Select CSS animation; a reversal owns cancellation and cleanup. */
export function animateSelectPopup(
  popup: HTMLElement,
  phase: 'show' | 'hide',
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let frame = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.cancelAnimationFrame(frame);
      signal.removeEventListener('abort', finish);
      popup.classList.remove(phase);
      resolve();
    };
    signal.addEventListener('abort', finish, { once: true });
    popup.classList.add(phase);
    // Activation renders asynchronously. Check for reduced/absent motion only
    // after the native popup has had its normal render opportunity.
    frame = window.requestAnimationFrame(() => {
      // Observe these exact animations. An old CSS animationcancel event can
      // arrive after the next phase starts and must not finish that new phase.
      void Promise.all(
        popup
          .getAnimations()
          .map((animation) => animation.finished.catch(() => undefined)),
      ).then(finish);
    });
    if (signal.aborted) finish();
  });
}
