import aiAssistantConfigs from './lib/rules/ai-assistant-configs.js';
import noInlineJsxEventHandlers from './lib/rules/no-inline-jsx-event-handlers.js';
import noNestedMount from './lib/rules/no-nested-mount.js';
import preferModuleJsxAugmentation from './lib/rules/prefer-module-jsx-augmentation.js';
import requireDataKeyInEach from './lib/rules/require-data-key-in-each.js';

const plugin = {
  meta: { name: 'eslint-plugin-kerfjs', version: '0.9.0' },
  rules: {
    'no-inline-jsx-event-handlers': noInlineJsxEventHandlers,
    'require-data-key-in-each': requireDataKeyInEach,
    'no-nested-mount': noNestedMount,
    'prefer-module-jsx-augmentation': preferModuleJsxAugmentation,
    'ai-assistant-configs': aiAssistantConfigs,
  },
  configs: {},
};

// Most rules ship as `error` in recommended (AST-shaped antipatterns are
// bugs). `ai-assistant-configs` is `warn` — it's a project-hygiene nudge,
// not a code defect, and a missing skill file shouldn't fail CI.
const recommendedRules = {
  'kerfjs/no-inline-jsx-event-handlers': 'error',
  'kerfjs/require-data-key-in-each': 'error',
  'kerfjs/no-nested-mount': 'error',
  'kerfjs/prefer-module-jsx-augmentation': 'error',
  'kerfjs/ai-assistant-configs': 'warn',
};

// Flat config (ESLint v9+) — consumers add this object to their config array.
plugin.configs.recommended = {
  plugins: { kerfjs: plugin },
  rules: recommendedRules,
};
plugin.configs.all = plugin.configs.recommended;

// Legacy `.eslintrc` config — consumers extend `'plugin:kerfjs/legacy-recommended'`.
plugin.configs['legacy-recommended'] = {
  plugins: ['kerfjs'],
  rules: recommendedRules,
};

export default plugin;
