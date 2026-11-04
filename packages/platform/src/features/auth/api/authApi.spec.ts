import { describe, it, expect } from 'vitest'
import { authApi } from './authApi'

describe('authApi.googleStartUrl', () => {
  it('returns the bare start URL with no origin', () => {
    expect(authApi.googleStartUrl()).toBe('/auth/google')
  })

  it('defaults to the signin intent when only an origin is given', () => {
    const url = authApi.googleStartUrl('http://localhost:5173')
    expect(url).toBe('/auth/google?redirect=http%3A%2F%2Flocalhost%3A5173')
    expect(url).not.toContain('intent=')
  })

  it('adds the signup intent alongside the origin', () => {
    expect(authApi.googleStartUrl('http://localhost:5173', 'signup')).toBe(
      '/auth/google?redirect=http%3A%2F%2Flocalhost%3A5173&intent=signup',
    )
  })
})
