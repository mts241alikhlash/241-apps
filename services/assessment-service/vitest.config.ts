import { nest } from '@mts241alikhlash/vitest-config'
import { defineConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(
  nest(),
  defineConfig({
    test: {
      env: process.env.DATABASE_URL
        ? { DATABASE_URL: process.env.DATABASE_URL }
        : undefined,
    },
  }),
)
