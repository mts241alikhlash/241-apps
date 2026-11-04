import { describe, expect, it } from 'vitest'
import { challengeFor, randomToken } from './pkce'

describe('pkce', () => {
  it('derives the RFC 7636 Appendix B challenge', async () => {
    await expect(
      challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    ).resolves.toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('makes unguessable tokens from the base64url alphabet', () => {
    const first = randomToken(64)
    expect(first).toMatch(/^[A-Za-z0-9_-]{64}$/)
    expect(randomToken(64)).not.toBe(first)
  })
})
