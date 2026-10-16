/**
 * Keep every Slider under `root` in step with a drag before the app
 * re-renders: one delegated `input` listener updates the track fill, the
 * `<output>` readout, and the spoken value text from the live value. Returns
 * a disposer. The app still owns the value (read it on `input` or `change`
 * through the Slider's `action`) and re-renders with it.
 */
export function wireSliders(root: Element | Document = document): () => void {
  const onInput = (event: Event) => {
    const input = event.target;
    if (
      !(input instanceof HTMLInputElement) ||
      !input.classList.contains('kui-slider__input')
    )
      return;
    syncSlider(input);
  };
  root.addEventListener('input', onInput);
  return () => root.removeEventListener('input', onInput);
}

/** Recompute one Slider's fill, readout, and value text from its input. */
export function syncSlider(input: HTMLInputElement): void {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value);
  const fraction = max === min ? 0 : (value - min) / (max - min);
  input.style.setProperty(
    '--_kui-slider-fill',
    `${Number((fraction * 100).toFixed(4))}%`,
  );
  const slider = input.closest<HTMLElement>('.kui-slider');
  const unit = slider?.dataset.unit ?? '';
  const text = `${input.value}${unit}`;
  if (unit) input.setAttribute('aria-valuetext', text);
  const output = slider?.querySelector('.kui-slider__value');
  if (output) output.textContent = text;
}
