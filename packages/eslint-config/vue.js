import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import {
  COMMON_RULES,
  TEST_FILES,
  TEST_RULES,
  TYPECHECK_RULES,
  frame,
  typescript,
} from './shared.js'

export const SINGLE_WORD_COMPONENTS = [
  'App',
  'Alert',
  'Avatar',
  'Badge',
  'Breadcrumb',
  'Button',
  'Calendar',
  'Card',
  'Checkbox',
  'Collapsible',
  'Command',
  'Dialog',
  'Field',
  'Input',
  'Label',
  'Pagination',
  'Popover',
  'Progress',
  'Select',
  'Separator',
  'Sheet',
  'Sidebar',
  'Skeleton',
  'Sonner',
  'Stepper',
  'Switch',
  'Table',
  'Tabs',
  'Textarea',
  'Tooltip',
]

export function vue({
  tsconfigRootDir,
  typecheck = false,
  ignores = [],
  overrides = [],
}) {
  return frame({
    typecheck,
    ignores: ['**/public/', ...ignores],
    overrides,
    body: [
      ...typescript(typecheck),
      ...pluginVue.configs['flat/recommended'],
      {
        files: ['**/*.{ts,vue}'],
        languageOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          globals: { ...globals.browser, ...globals.es2021 },
          parserOptions: {
            parser: tseslint.parser,
            tsconfigRootDir,
            ...(typecheck && {
              projectService: true,
              extraFileExtensions: ['.vue'],
            }),
          },
        },
        rules: {
          'vue/block-lang': ['error', { script: { lang: 'ts' } }],
          'vue/component-api-style': ['error', ['script-setup']],
          'vue/define-emits-declaration': ['error', 'type-based'],
          'vue/define-props-declaration': ['error', 'type-based'],
          'vue/multi-word-component-names': [
            'error',
            { ignores: SINGLE_WORD_COMPONENTS },
          ],
          'vue/require-default-prop': 'off',
          'vue/no-v-html': 'error',
          ...COMMON_RULES,
          '@typescript-eslint/consistent-type-imports': [
            'error',
            { prefer: 'type-imports' },
          ],
          'no-console': ['error', { allow: ['warn', 'error'] }],
          ...(typecheck && TYPECHECK_RULES),
        },
      },
      {
        files: TEST_FILES,
        rules: {
          ...TEST_RULES,
          'vue/one-component-per-file': 'off',
        },
      },
    ],
  })
}
