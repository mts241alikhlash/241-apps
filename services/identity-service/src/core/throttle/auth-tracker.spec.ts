import { describe, expect, it } from 'vitest'
import { authTracker } from './auth-tracker.js'

const request = (body: unknown, ip = '10.0.0.1') => ({ ip, body })

describe('authTracker', () => {
  it('gives two students behind one address their own login budget', async () => {
    const first = await authTracker(request({ identifier: '252607001' }))
    const second = await authTracker(request({ identifier: '252607002' }))

    expect(first).not.toBe(second)
  })

  it('counts one account the same however its identifier is typed', async () => {
    expect(await authTracker(request({ identifier: ' Admin ' }))).toBe(
      await authTracker(request({ identifier: 'admin' })),
    )
  })

  it('keys a token refresh by the token without exposing it', async () => {
    const key = await authTracker(request({ refreshToken: 'secret-token' }))

    expect(key).not.toContain('secret-token')
    expect(key).not.toBe(
      await authTracker(request({ refreshToken: 'other-token' })),
    )
  })

  it('falls back to the address when the body names nobody', async () => {
    expect(await authTracker(request({}))).toBe('10.0.0.1')
    expect(await authTracker(request(undefined))).toBe('10.0.0.1')
  })
})
