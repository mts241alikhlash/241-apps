import { readFile } from 'node:fs/promises'
import { glob } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { describe, it, expect, beforeAll } from 'vitest'

const ROOT = process.cwd()
const SCAN_GLOBS = ['src/**/*.{ts,vue}', 'packages/*/src/**/*.{ts,vue}']

const ENVELOPES = [
  'ApiSingleResponse',
  'ApiPaginatedResponse',
  'ApiEnvelope',
  'ApiListResponse',
]

const UNWRAPPED = ['void', 'ArrayBuffer', 'Blob']

function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

export function apiCallGenerics(source: string): string[] {
  const found: string[] = []
  const opener = /\bapi\.(get|post|patch|put|delete)\s*</g

  let match: RegExpExecArray | null
  while ((match = opener.exec(source)) !== null) {
    let depth = 1
    let i = match.index + match[0].length
    const start = i

    while (i < source.length && depth > 0) {
      if (source[i] === '<') depth++
      else if (source[i] === '>') depth--
      i++
    }

    if (depth === 0) found.push(source.slice(start, i - 1).trim())
  }

  return found
}

export function isEnveloped(generic: string): boolean {
  const t = generic.trim()
  if (UNWRAPPED.includes(t)) return true
  if (ENVELOPES.some((name) => t.startsWith(`${name}<`))) return true
  return /^\{\s*data\s*[:?]/.test(t)
}

describe('every API call reads the envelope it is sent', () => {
  let files: { path: string; text: string }[]

  beforeAll(async () => {
    const found: { path: string; text: string }[] = []
    for (const pattern of SCAN_GLOBS) {
      for await (const entry of glob(pattern, { cwd: ROOT })) {
        const path = entry.split(sep).join('/')
        if (path.includes('__tests__') || path.endsWith('.spec.ts')) continue
        found.push({
          path,
          text: code(await readFile(join(ROOT, entry), 'utf8')),
        })
      }
    }
    files = found
  }, 60_000)

  it('finds the call sites', () => {
    const total = files.reduce((n, f) => n + apiCallGenerics(f.text).length, 0)
    expect(total).toBeGreaterThan(80)
  })

  it('never types a response body as the payload itself', () => {
    const offenders: string[] = []

    for (const file of files) {
      for (const generic of apiCallGenerics(file.text)) {
        if (!isEnveloped(generic)) {
          offenders.push(`${file.path}: api.<verb><${generic}>`)
        }
      }
    }

    expect(offenders.sort()).toEqual([])
  })

  describe('the matcher itself', () => {
    it('flags the two that shipped', () => {
      expect(isEnveloped('PromotionRecommendationResponse')).toBe(false)
      expect(isEnveloped('RaporDetailData')).toBe(false)
    })

    it('accepts the wrappers, a discarded body, and a download', () => {
      expect(isEnveloped('ApiSingleResponse<Semester>')).toBe(true)
      expect(isEnveloped('ApiPaginatedResponse<Student>')).toBe(true)
      expect(isEnveloped('void')).toBe(true)
      expect(isEnveloped('ArrayBuffer')).toBe(true)
    })

    it('accepts the envelope written out instead of named', () => {
      expect(isEnveloped('{ data: EmploymentTypeOption[] }')).toBe(true)
    })

    it('reads a generic that spans several lines', () => {
      const wrapped = `api.get<
        ApiSingleResponse<{ id: string }>
      >('/roles')`

      expect(apiCallGenerics(wrapped)).toEqual([
        'ApiSingleResponse<{ id: string }>',
      ])
    })

    it('is not fooled by the nested angle brackets inside one', () => {
      const nested = `api.get<ApiPaginatedResponse<Map<string, number>>>('/x')`
      expect(apiCallGenerics(nested)).toEqual([
        'ApiPaginatedResponse<Map<string, number>>',
      ])
    })
  })
})
