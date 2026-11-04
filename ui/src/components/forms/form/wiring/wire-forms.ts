type Root = HTMLElement | Document;

/**
 * Keep every Kerf UI `Form` below root from navigating the page when it is
 * submitted, whether by a submit `Button` or by Enter in a field (implicit
 * submission). The `submit` event still reaches the application, which
 * handles it with `delegateActions(root, 'submit', table)` keyed on the
 * Form's `action`; native constraint validation still runs first unless the
 * Form sets `noValidate`. It listens in the capture phase, so a handler that
 * stops propagation cannot let a submission through. A native `<form>` that
 * is not a Kerf UI Form is left alone. Dispose with the owning application.
 */
export function wireForms(root: Root): () => void {
  const onSubmit = (event: Event) => {
    const form = event.target;
    if (form instanceof HTMLFormElement && form.matches('.kui-form'))
      event.preventDefault();
  };
  root.addEventListener('submit', onSubmit, true);
  return () => {
    root.removeEventListener('submit', onSubmit, true);
  };
}
