# `ui-preferences`

Reports cataloged components listed in an application UI profile preference's `avoid` set and points to the package-qualified `preferred` component. The stable diagnostic is `KUI-L301`.

`recommended-ui` treats the rule as a warning; `strict-ui` treats it as an error. Use a narrowly targeted `KUI-L301` profile exception when a documented application boundary cannot follow the preference. Component substitutions are not autofixed because their props and interaction contracts can differ.
