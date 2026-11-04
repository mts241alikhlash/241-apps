import { describe, it, expect } from 'vitest'
import { menuSections } from './menuConfig'
import en from '@/i18n/locales/en'
import id from '@/i18n/locales/id'

const labels = () =>
  menuSections.flatMap((section) => [
    section.label,
    ...section.items.flatMap((item) => [
      item.title,
      ...(item.items ?? []).map((sub) => sub.title),
    ]),
  ])

describe('menu', () => {
  it('uses translation keys, never literal text', () => {
    for (const label of labels()) {
      expect(label, `${label} is not a key`).toMatch(/^[a-z]+(\.[a-zA-Z]+)+$/)
    }
  })

  it('has both locales covering every key the menu uses, en being the source', () => {
    const read = (obj: unknown, key: string) =>
      key.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object' && part in acc) {
          return (acc as Record<string, unknown>)[part]
        }
        return undefined
      }, obj)

    for (const key of labels()) {
      expect(read(en, key), `en is missing ${key}`).toBeTypeOf('string')
      expect(read(id, key), `id is missing ${key}`).toBeTypeOf('string')
    }
  })
})
