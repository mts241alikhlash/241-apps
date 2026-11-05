import globals from 'globals'
import {
  BOUNDARY_PATTERNS,
  COMMON_RULES,
  TEST_FILES,
  TEST_RULES,
  TYPECHECK_RULES,
  frame,
  typescript,
} from './shared.js'

export function nest({
  tsconfigRootDir,
  typecheck = false,
  ignores = [],
  overrides = [],
}) {
  return frame({
    typecheck,
    ignores,
    overrides,
    body: [
      ...typescript(typecheck),
      {
        languageOptions: {
          globals: { ...globals.node },
          parserOptions: {
            tsconfigRootDir,
            ...(typecheck && { projectService: true }),
          },
        },
        rules: {
          ...COMMON_RULES,
          ...(typecheck && TYPECHECK_RULES),
        },
      },
      {
        files: ['src/**/domain/**/*.ts'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                ...BOUNDARY_PATTERNS,
                {
                  group: ['@prisma/client', '**/generated/prisma/**'],
                  message:
                    'domain/ must not import the Prisma client (docs/standards/backend.md, Layering).',
                },
              ],
            },
          ],
        },
      },
      {
        files: ['src/**/*.ts'],
        ignores: ['src/**/*.spec.ts'],
        rules: {
          'no-restricted-syntax': [
            'error',
            {
              selector:
                "CallExpression[callee.property.name=/^getUTC(FullYear|Month|Date|Day)$/][callee.object.type='NewExpression']",
              message:
                'Derive the calendar day of an instant with @mts241alikhlash/nest-core/time and SCHOOL_TIME_ZONE (docs/standards/backend.md, Time).',
            },
            {
              selector:
                'CallExpression[callee.property.name=/^getUTC(FullYear|Month|Date|Day)$/][callee.object.name=/^(now|today|current)$/]',
              message:
                'Derive the calendar day of an instant with @mts241alikhlash/nest-core/time and SCHOOL_TIME_ZONE (docs/standards/backend.md, Time).',
            },
            {
              selector:
                "CallExpression[callee.property.name='slice'][callee.object.callee.property.name='toISOString'][callee.object.callee.object.type='NewExpression']",
              message:
                'Derive the calendar day of an instant with @mts241alikhlash/nest-core/time and SCHOOL_TIME_ZONE (docs/standards/backend.md, Time).',
            },
          ],
        },
      },
      {
        files: TEST_FILES,
        rules: TEST_RULES,
      },
    ],
  })
}
