import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { indonesianErrorMap } from './zodErrorMap'

const message = (schema: z.ZodTypeAny, value: unknown) => {
  const result = schema.safeParse(value, { errorMap: indonesianErrorMap })
  return result.success ? null : result.error.issues[0].message
}

describe('indonesianErrorMap', () => {
  it('asks for a missing value in Indonesian', () => {
    expect(message(z.string(), undefined)).toBe('Wajib diisi')
    expect(message(z.string(), null)).toBe('Wajib diisi')
    expect(message(z.string().min(1), '')).toBe('Wajib diisi')
  })

  it('names the limits', () => {
    expect(message(z.string().min(8), 'abc')).toBe('Minimal 8 karakter')
    expect(message(z.string().max(3), 'abcd')).toBe('Maksimal 3 karakter')
    expect(message(z.number().min(2), 1)).toBe('Minimal 2')
    expect(message(z.number().max(5), 6)).toBe('Maksimal 5')
  })

  it('rejects a wrong type and a bad email', () => {
    expect(message(z.number(), 'x')).toBe('Isian tidak valid')
    expect(message(z.string().email(), 'x')).toBe('Format email tidak valid')
  })

  it('keeps a message the schema sets itself', () => {
    expect(message(z.string().min(1, 'Nama wajib diisi'), '')).toBe(
      'Nama wajib diisi',
    )
  })
})
