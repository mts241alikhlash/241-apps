import { glob, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SRC = join(__dirname, '..')
const GUARD = 'access-control/permission.guard.ts'

describe('the role-name bypass lives only in the permission guard (ADR-0011)', () => {
  let sources: { path: string; text: string }[]

  beforeAll(async () => {
    sources = []
    for await (const entry of glob('**/*.ts', { cwd: SRC })) {
      const path = entry.replace(/\\/g, '/')
      if (path.endsWith('.spec.ts')) continue
      sources.push({ path, text: await readFile(join(SRC, path), 'utf8') })
    }
  })

  it('names SUPER_ADMIN nowhere else in the package', () => {
    const offenders = sources
      .filter((source) => source.path !== GUARD)
      .filter((source) => source.text.includes('SUPER_ADMIN'))
      .map((source) => source.path)

    expect(offenders).toEqual([])
  })

  it('keeps the bypass in the guard', () => {
    const guard = sources.find((source) => source.path === GUARD)

    expect(guard?.text).toContain("const SUPER_ADMIN_ROLE = 'SUPER_ADMIN'")
    expect(guard?.text).toContain('user.roles.includes(SUPER_ADMIN_ROLE)')
  })
})
