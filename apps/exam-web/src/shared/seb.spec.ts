// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SebOutdatedError, isInSeb, readSebProof, sebVersion } from './seb'

interface SebGlobal {
  version?: string
  security: {
    configKey: string
    updateKeys?: (callback: () => void) => void
  }
}

declare global {
  interface Window {
    SafeExamBrowser?: SebGlobal
  }
}

function stubSeb(value: SebGlobal | undefined) {
  Object.defineProperty(window, 'SafeExamBrowser', {
    value,
    configurable: true,
    writable: true,
  })
}

describe('seb', () => {
  beforeEach(() => {
    vi.useRealTimers()
    window.history.replaceState(null, '', '/my-exams/token?x=1#frag')
  })

  afterEach(() => {
    stubSeb(undefined)
    delete window.SafeExamBrowser
    vi.useRealTimers()
  })

  it('reports outside SEB', async () => {
    expect(isInSeb()).toBe(false)
    expect(sebVersion()).toBeNull()
    await expect(readSebProof()).resolves.toBeNull()
  })

  it('reports the SEB version when present', () => {
    stubSeb({ version: '3.4.0', security: { configKey: 'abc' } })
    expect(isInSeb()).toBe(true)
    expect(sebVersion()).toBe('3.4.0')
  })

  it('calls updateKeys and resolves with the config key after the callback', async () => {
    stubSeb({
      security: {
        configKey: 'key-after-update',
        updateKeys: (callback) => {
          callback()
        },
      },
    })
    await expect(readSebProof()).resolves.toEqual({
      configKeyHash: 'key-after-update',
      pageUrl: 'http://localhost:3000/my-exams/token?x=1',
    })
  })

  it('reads configKey directly when updateKeys is absent', async () => {
    stubSeb({ security: { configKey: 'direct-key' } })
    await expect(readSebProof()).resolves.toEqual({
      configKeyHash: 'direct-key',
      pageUrl: 'http://localhost:3000/my-exams/token?x=1',
    })
  })

  it('rejects with SebOutdatedError when configKey is empty', async () => {
    stubSeb({ security: { configKey: '' } })
    await expect(readSebProof()).rejects.toBeInstanceOf(SebOutdatedError)
  })

  it('falls through after 2 seconds when updateKeys never calls back', async () => {
    vi.useFakeTimers()
    stubSeb({
      security: {
        configKey: 'timeout-key',
        updateKeys: () => undefined,
      },
    })
    const pending = readSebProof()
    await vi.advanceTimersByTimeAsync(2000)
    await expect(pending).resolves.toEqual({
      configKeyHash: 'timeout-key',
      pageUrl: 'http://localhost:3000/my-exams/token?x=1',
    })
  })

  it('is an Error subclass', () => {
    expect(new SebOutdatedError()).toBeInstanceOf(Error)
  })
})
