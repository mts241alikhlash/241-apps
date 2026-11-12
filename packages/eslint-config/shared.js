import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import tseslint from 'typescript-eslint'

export const GENERATED = [
  '**/dist/',
  '**/node_modules/',
  '**/coverage/',
  '**/src/generated/',
  'eslint.config.mjs',
]

export const TEST_FILES = [
  '**/*.spec.ts',
  '**/*.e2e-spec.ts',
  'test/**/*.ts',
  'smoke/**/*.ts',
]

export const BOUNDARY_PATTERNS = [
  {
    group: ['**/services/*/src/**', '**/*-service/src/**'],
    message: 'Never import another service; call it over HTTP.',
  },
  {
    group: ['@mts241alikhlash/*/src/**', '@mts241alikhlash/*/dist/**'],
    message: 'Import a workspace package through its exports, not its files.',
  },
]

export const UNUSED_VARS = [
  'error',
  {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  },
]

export const TYPESCRIPT = [
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
]

export const TYPECHECK_RULES = {
  '@typescript-eslint/prefer-nullish-coalescing': [
    'error',
    { ignorePrimitives: { string: true } },
  ],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-unsafe-argument': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/unbound-method': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/no-redundant-type-constituents': 'error',
}

export const COMMON_RULES = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': UNUSED_VARS,
  '@typescript-eslint/no-empty-object-type': 'error',
  '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
  'no-restricted-imports': ['error', { patterns: BOUNDARY_PATTERNS }],
  '@eslint-community/eslint-comments/require-description': 'error',
  '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
}

export function frame({ ignores = [], body, overrides = [] }) {
  return [
    { ignores: [...GENERATED, ...ignores] },
    {
      linterOptions: {
        reportUnusedDisableDirectives: 'error',
        reportUnusedInlineConfigs: 'error',
      },
    },
    js.configs.recommended,
    comments.recommended,
    ...body,
    ...overrides,
    prettier,
  ]
}

export const TEST_RULES = {
  '@typescript-eslint/unbound-method': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
}
