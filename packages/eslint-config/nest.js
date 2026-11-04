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
                    'domain/ must not import the Prisma client (CONSTITUTION, Principle I).',
                },
              ],
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
