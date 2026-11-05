import { nest } from '@mts241alikhlash/vitest-config'
import { defineConfig } from 'vitest/config'

const base = nest()
export default defineConfig({
  ...base,
  resolve: {
    alias: [
      ...(base.resolve?.alias as { find: RegExp; replacement: string }[]),
      {
        find: /^file-type$/,
        replacement: new URL('./test/stubs/file-type.stub.ts', import.meta.url)
          .pathname,
      },
      {
        find: /^puppeteer$/,
        replacement: new URL('./test/stubs/puppeteer.stub.ts', import.meta.url)
          .pathname,
      },
    ],
  },
  test: {
    ...base.test,
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
  },
})
