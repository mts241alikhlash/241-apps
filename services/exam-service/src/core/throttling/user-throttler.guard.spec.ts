import { describe, expect, it } from 'vitest'
import { throttleKey } from './user-throttler.guard.js'

describe('throttleKey', () => {
  it('counts an authenticated caller per user, not per address', () => {
    expect(throttleKey({ user: { id: 'u1' }, ip: '203.0.113.7' })).toBe(
      'user:u1',
    )
  })

  it('keeps two users behind one address apart', () => {
    const first = throttleKey({ user: { id: 'u1' }, ip: '203.0.113.7' })
    const second = throttleKey({ user: { id: 'u2' }, ip: '203.0.113.7' })
    expect(first).not.toBe(second)
  })

  it('falls back to the address for anonymous callers', () => {
    expect(throttleKey({ ip: '203.0.113.7' })).toBe('ip:203.0.113.7')
    expect(throttleKey({})).toBe('ip:unknown')
  })
})
