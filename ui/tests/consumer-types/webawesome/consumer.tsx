import type {} from '@kerfjs/ui/webawesome';

export const WebAwesomeRecipe = () => (
  <wa-dialog label="Create project" without-header>
    <wa-input
      name="project-name"
      label="Project name"
      hint="Use a short, recognizable name."
      required
    />
    <wa-select name="owner" label="Owner" value="mara">
      <wa-option value="mara">Mara Chen</wa-option>
      <wa-option value="sam">Sam Rivera</wa-option>
    </wa-select>
    <wa-button slot="footer" appearance="outlined">Cancel</wa-button>
    <wa-button slot="footer" variant="brand" appearance="accent">Create</wa-button>
  </wa-dialog>
);
