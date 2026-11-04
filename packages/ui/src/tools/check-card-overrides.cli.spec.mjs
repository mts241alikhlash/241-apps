import { execFileSync } from 'node:child_process'
import { mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

it('reports hits and exits 1 when run through a symlink', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cco-'))
  writeFileSync(join(dir, 'A.vue'), '<Card class="gap-0">')
  const link = join(dir, 'link.mjs')
  symlinkSync(
    fileURLToPath(new URL('./check-card-overrides.mjs', import.meta.url)),
    link,
  )
  let status = 0
  let out = ''
  try {
    execFileSync('node', [link, dir], { encoding: 'utf8' })
  } catch (e) {
    status = e.status
    out = e.stdout
  }
  expect(status).toBe(1)
  expect(out).toContain('A.vue')
})
