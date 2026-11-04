import path from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const referenceDataRoot = path.resolve(import.meta.dirname, './packages/reference-data/src')
const platformRoot = path.resolve(
  import.meta.dirname,
  './packages/platform/src/features',
)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: /^@\/reference-data\/(.+)$/,
        replacement: path.resolve(referenceDataRoot, '$1'),
      },
      { find: /^@\/reference-data$/, replacement: referenceDataRoot },
      {
        find: /^@\/features\/platform\/(.+)$/,
        replacement: path.resolve(platformRoot, '$1'),
      },
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'smoke/**'],
  },
})
