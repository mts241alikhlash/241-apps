import { nest } from '@mts241alikhlash/vitest-config'
import { defineConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(
  nest(),
  defineConfig({
    test: { setupFiles: ['src/test.setup.ts'], testTimeout: 15_000 },
  }),
)
