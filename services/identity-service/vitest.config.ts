import { nest } from '@mts241alikhlash/vitest-config'

const base = nest()

export default {
  ...base,
  test: {
    ...base.test,
    include: ['src/**/*.spec.ts', 'prisma/**/*.spec.ts'],
  },
}
