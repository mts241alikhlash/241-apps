import { randomReadablePassword } from './hash.helper.js'

describe('randomReadablePassword', () => {
  it('returns 10 characters', () => {
    expect(randomReadablePassword()).toHaveLength(10)
  })

  it('uses only the readable alphabet, without look-alikes', () => {
    for (let i = 0; i < 200; i++) {
      expect(randomReadablePassword()).toMatch(/^[A-HJ-NP-Za-km-z2-9]{10}$/)
    }
  })

  it('differs between calls', () => {
    const values = new Set(
      Array.from({ length: 1000 }, () => randomReadablePassword()),
    )
    expect(values.size).toBeGreaterThan(990)
  })
})
