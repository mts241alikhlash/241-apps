import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'
import { optimizeDeps, resolveConfig } from 'vite'

it('converts Unovis striptags into a browser-compatible default export', async () => {
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'admission-vite-deps-'))
  try {
    const config = await resolveConfig(
      { cacheDir, optimizeDeps: { entries: [], noDiscovery: true } },
      'serve',
    )
    const metadata = await optimizeDeps(config, true)
    const dependency = Object.values(metadata.optimized).find((dep) =>
      dep.src?.endsWith('/striptags/src/striptags.js'),
    )
    expect(
      dependency,
      'striptags must be pre-bundled before browser imports',
    ).toBeDefined()
    const bundled = await import(
      /* @vite-ignore */ pathToFileURL(dependency!.file).href
    )
    expect(bundled.default('<b>hello</b><script>bad</script>')).toBe('hellobad')
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
}, 30_000)
