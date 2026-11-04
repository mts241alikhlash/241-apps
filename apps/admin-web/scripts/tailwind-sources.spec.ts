import path from 'node:path'
import { expect, it } from 'vitest'
import { build } from 'vite'

it('generates shared sidebar width utilities for expanded and collapsed states', async () => {
  const result = await build({
    logLevel: 'silent',
    build: {
      write: false,
      cssMinify: false,
      rolldownOptions: {
        input: path.resolve(import.meta.dirname, '../src/style.css'),
      },
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  const css = outputs
    .flatMap((output) => ('output' in output ? output.output : []))
    .filter(
      (asset) => asset.type === 'asset' && asset.fileName.endsWith('.css'),
    )
    .map((asset) => (asset.type === 'asset' ? String(asset.source) : ''))
    .join('\n')

  expect(css).toContain('width: var(--sidebar-width)')
  expect(css).toContain('width: var(--sidebar-width-icon)')
}, 30_000)
