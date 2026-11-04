// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { i18n, initialLocale } from './index'

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

it('keeps admission shell Indonesian despite an English browser or old preference', () => {
  localStorage.setItem('app.locale', 'en')
  vi.stubGlobal('navigator', { languages: ['en-US'] })
  expect(initialLocale()).toBe('id')
  localStorage.removeItem('app.locale')
  expect(initialLocale()).toBe('id')
  expect(i18n.global.t('menu.section.admission')).toBe('Admin PSB')
})
