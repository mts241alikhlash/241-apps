import { nest } from '@mts241alikhlash/vitest-config'
import { defineConfig } from 'vitest/config'

const base = nest()
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
  },
})
