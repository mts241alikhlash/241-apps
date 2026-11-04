import { describe, it, expect } from 'vitest'
import { menuSections } from '@/config/menuConfig'
import en from '@/i18n/locales/en'
import id from '@/i18n/locales/id'
import { REFERENCE_LISTS } from './lists'
import { referenceListRoutes } from './routes'

describe('reference lists in academic-web', () => {
  it('manages the seventeen lists academic-service owns', () => {
    expect(REFERENCE_LISTS).toHaveLength(17)
    expect(new Set(REFERENCE_LISTS.map((l) => l.path)).size).toBe(17)
  })

  it('routes every list behind its read permission', () => {
    for (const list of REFERENCE_LISTS) {
      const route = referenceListRoutes.find(
        (r) => r.meta?.referenceList === list.path,
      )
      expect(route?.path, list.path).toBe(`/setting/${list.path}`)
      expect(route?.meta?.requiredPermission).toBe(`${list.path}.read`)
    }
  })

  it('lists every one in the settings menu with a label in both languages', () => {
    const group = menuSections
      .flatMap((section) => section.items)
      .find((item) => item.key === 'settings-reference-lists')
    const urls = (group?.items ?? []).map((item) => item.url)
    for (const list of REFERENCE_LISTS) {
      expect(urls).toContain(`/setting/${list.path}`)
      expect(
        (en.menu.referenceList as Record<string, string>)[list.key],
      ).toBeTypeOf('string')
      expect(
        (id.menu.referenceList as Record<string, string>)[list.key],
      ).toBeTypeOf('string')
    }
  })
})
