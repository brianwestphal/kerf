'use strict';

// The one rule for which component export renders a cataloged public class —
// the KUI-L103 "render X instead" answer. `eslint-plugin-kerfjs`'s
// `ui-public-boundaries` rule loads this file from the installed
// `@kerfjs/ui/ai/` directory (beside `application-ui-profile-sync.cjs`), and
// `@kerfjs/ui`'s generated `ai/components/*.md` pages import it, so the lint
// message and the component reference cannot name different components. It
// applies to any composition catalog, `@kerfjs/ui`'s or a declared component
// package's (`acme-meter`), so it assumes no class prefix. CommonJS so the
// ESLint rule can load it synchronously.

// The component render exports among an entry's public exports: PascalCase
// names (JSX treats a lowercase tag as an intrinsic element) other than prop
// types, deduplicated in catalog order. Helpers such as `uiColor` or `px` are
// never a class's renderer.
function componentExportNames(exports) {
  return [
    ...new Set(
      (exports ?? []).filter(
        (name) =>
          typeof name === 'string' &&
          /^[A-Z]/.test(name) &&
          !name.endsWith('Props'),
      ),
    ),
  ];
}

// The export that renders `className`: the export named after the class's
// block, tried from the whole block down to its last word
// (`kui-toolbar-action-link` is ToolbarActionLink, `kui-pane__content` is
// Pane, `acme-meter__bar` is Meter), else the entry's own export, else every
// component export the entry lists.
function classRenderers(className, entryName, exports) {
  const components = componentExportNames(exports);
  const words = className.replace(/(?:__|--).*$/, '').split('-');
  for (let start = 0; start < words.length; start += 1) {
    const candidate = words
      .slice(start)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    if (components.includes(candidate)) return [candidate];
  }
  if (components.includes(entryName)) return [entryName];
  return components;
}

// The public classes of one catalog entry that are its component's rendered
// anatomy, each with the exports that render it. A class the entry lists in
// `placeableClasses` is the application's to place and is absent — unless the
// entry names the `rootElement` its component renders around those classes:
// then the class is listed with that `element`, because a plain
// `<div class="kui-content-item">` is exactly what ContentItem renders while
// a `<ul>` carrying the geometry stays the application's. An entry with no
// component export owns no classes.
function componentClassOwnership({
  name,
  exports,
  publicClasses,
  placeableClasses,
  rootElement,
}) {
  const components = componentExportNames(exports);
  if (components.length === 0) return [];
  const placeable = new Set(placeableClasses ?? []);
  const owned = [];
  for (const className of publicClasses ?? []) {
    if (placeable.has(className) && !rootElement) continue;
    owned.push({
      className,
      render: classRenderers(className, name, components),
      ...(placeable.has(className) ? { element: rootElement } : {}),
    });
  }
  return owned;
}

module.exports = {
  classRenderers,
  componentClassOwnership,
  componentExportNames,
};
