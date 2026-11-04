import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'
import { optimizeDeps, resolveConfig } from 'vite'

it('pre-bundles Unovis striptags for browser imports', async () => {
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'academic-vite-deps-'))
  try {
    const config = await resolveConfig(
      { cacheDir, optimizeDeps: { entries: [], noDiscovery: true } },
      'serve',
    )
    const metadata = await optimizeDeps(config, true)
    expect(
      Object.values(metadata.optimized).some((dep) =>
        dep.src?.endsWith('/striptags/src/striptags.js'),
      ),
    ).toBe(true)
  } finally {
    await rm(cacheDir, { recursive: true, force: true })
  }
}, 30_000)
