import { nest } from '@mts241alikhlash/vitest-config'
import { defineConfig, mergeConfig } from 'vitest/config'

const testDatabaseUrl =
  process.env.ASSESSMENT_DB_TESTS === '1'
    ? process.env.ASSESSMENT_TEST_DATABASE_URL
    : undefined

export default mergeConfig(
  nest(),
  defineConfig({
    test: {
      env: testDatabaseUrl ? { DATABASE_URL: testDatabaseUrl } : undefined,
    },
  }),
)
