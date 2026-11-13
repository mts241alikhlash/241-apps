import type { IncomingHttpHeaders } from 'node:http'
import { describe, expect, it } from 'vitest'
import { platformFromHeaders } from './client-platform.decorator.js'

describe('platformFromHeaders', () => {
  it('is native when no headers are present', () => {
    expect(platformFromHeaders({})).toBe('native')
  })

  it('is web when X-Client-Platform is web', () => {
    expect(platformFromHeaders({ 'x-client-platform': 'web' })).toBe('web')
  })

  it('is web when an Origin header is present', () => {
    expect(platformFromHeaders({ origin: 'https://exam.example' })).toBe('web')
  })

  it('is web when a Sec-Fetch-Site header is present', () => {
    expect(platformFromHeaders({ 'sec-fetch-site': 'same-origin' })).toBe('web')
  })

  it('is native for Istiqra-like headers', () => {
    const headers: IncomingHttpHeaders = {
      accept: 'application/json',
      'user-agent': 'Istiqra/1.0',
    }
    expect(platformFromHeaders(headers)).toBe('native')
  })

  it('is native when X-Client-Platform has another value', () => {
    expect(platformFromHeaders({ 'x-client-platform': 'native' })).toBe(
      'native',
    )
  })
})
