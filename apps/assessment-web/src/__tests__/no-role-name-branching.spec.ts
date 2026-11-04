import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { glob } from 'node:fs/promises'
import { describe, it, expect, beforeAll } from 'vitest'

const FEATURES = join(process.cwd(), 'src', 'features')

const ROLE_LITERAL_CHECK = /\broles(?:\.value)?\??\.includes\(\s*'([A-Z_]+)'/g

function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

const SANCTIONED = [
  'config/menuConfig.ts',

  'profile/setup.ts',
  'profile/components/SchoolIdentityTab.vue',
  'educational-history/components/EducationalHistoryTab.vue',
]

describe('no screen decides what to show from a role name', () => {
  let files: { path: string; text: string }[]

  beforeAll(async () => {
    const found: { path: string; text: string }[] = []
    for await (const entry of glob('**/*.{ts,vue}', { cwd: FEATURES })) {
      if (entry.includes('__tests__') || entry.endsWith('.spec.ts')) continue
      found.push({
        path: entry.replace(/\\/g, '/'),
        text: code(await readFile(join(FEATURES, entry), 'utf8')),
      })
    }
    files = found
  }, 60_000)

  it('finds the academic features', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('never compares a role to a literal', () => {
    const offenders = files
      .filter((f) => !SANCTIONED.some((s) => f.path.endsWith(s)))
      .filter((f) => new RegExp(ROLE_LITERAL_CHECK.source, 'g').test(f.text))
      .map((f) => f.path)
      .sort()

    expect(offenders).toEqual([])
  })

  it('recognizes the shape it is looking for', () => {
    const branching = `const isEmployee = computed(() => roles.value.includes('EMPLOYEE'))`
    const permission = `const isAdmin = computed(() => can('schedules.update'))`

    expect(new RegExp(ROLE_LITERAL_CHECK.source).test(branching)).toBe(true)
    expect(new RegExp(ROLE_LITERAL_CHECK.source).test(permission)).toBe(false)
  })
})
