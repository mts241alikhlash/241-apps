// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { i18n, initialLocale, setLocale } from './index'

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

it('keeps the shell Indonesian despite an English browser or old preference', async () => {
  localStorage.setItem('app.locale', 'en')
  vi.stubGlobal('navigator', { languages: ['en-US'] })
  expect(initialLocale()).toBe('id')
  await setLocale(initialLocale(), false)
  expect(i18n.global.locale.value).toBe('id')
})
