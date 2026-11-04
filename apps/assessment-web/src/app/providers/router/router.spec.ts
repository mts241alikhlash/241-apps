import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/app/providers/router/routes'
import { menuSections } from '@/config/menuConfig'
import en from '@/i18n/locales/en'
import id from '@/i18n/locales/id'

const Layout = routes.find((route) => Array.isArray(route.children))?.component

function buildRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

const layoutChildren = () =>
  routes.find((route) => Array.isArray(route.children))?.children ?? []

describe('assessment route tree', () => {
  it('redirects / to the dashboard even though the layout also owns /', () => {
    const resolved = buildRouter().resolve('/')
    expect(resolved.matched).toHaveLength(1)
    expect(resolved.matched[0]?.redirect).toBe('/dashboard')
    expect(resolved.matched[0]?.components?.default).not.toBe(Layout)
  })

  it('renders every route through the layout without changing its URL', () => {
    for (const route of layoutChildren()) {
      if (route.redirect) continue
      const resolved = buildRouter().resolve(route.path)
      expect(
        resolved.matched,
        `${String(route.name)} missed the layout`,
      ).toHaveLength(2)
      expect(resolved.matched[0]?.components?.default).toBe(Layout)
    }
  })

  it('leaves no route under the old /academic prefix', () => {
    const stale = layoutChildren().filter((route) =>
      route.path.startsWith('/academic'),
    )
    expect(stale.map((route) => route.path)).toEqual([])
  })

  it('states a trail on every route inside the layout', () => {
    for (const route of layoutChildren()) {
      if (route.redirect) continue
      expect(
        route.meta?.breadcrumbs,
        `${String(route.name)} has no trail`,
      ).toBeDefined()
    }
  })
})

describe('menu', () => {
  const labels = () =>
    menuSections.flatMap((section) => [
      section.label,
      ...section.items.flatMap((item) => [
        item.title,
        ...(item.items ?? []).map((sub) => sub.title),
      ]),
    ])

  it('links only to paths this app actually routes', () => {
    const urls = menuSections
      .flatMap((section) => section.items)
      .flatMap((item) => [item.url, ...(item.items ?? []).map((s) => s.url)])
      .filter((url) => url !== '#')

    const router = buildRouter()
    for (const url of urls) {
      expect(router.resolve(url).name, `${url} resolves to not-found`).not.toBe(
        'not-found',
      )
    }
  })

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

describe('exam routes', () => {
  it.each([
    '/paket-soal',
    '/paket-soal/p1',
    '/persetujuan-paket',
    '/jadwal-ujian',
    '/penilaian-ujian',
    '/ujian',
    '/ujian-siswa',
  ])('%s is no longer served by this app', (path) => {
    expect(buildRouter().resolve(path).name).toBe('not-found')
  })

  it('keeps /nilai-ujian on exam-scores.read', () => {
    const resolved = buildRouter().resolve('/nilai-ujian')
    const meta = resolved.matched.at(-1)?.meta

    expect(resolved.name).not.toBe('not-found')
    expect(meta?.requiresAuth).toBe(true)
    expect(meta?.requiredPermission).toBe('exam-scores.read')
  })

  it('has no question bank left: no bank section and no /bank-soal route', () => {
    expect(menuSections.map((section) => section.key)).not.toContain(
      'exam-bank',
    )
    expect(buildRouter().resolve('/bank-soal').name).toBe('not-found')
  })

  it('shows the exam menu section only through exam-scores', () => {
    const section = menuSections.find((candidate) => candidate.key === 'exam')

    expect(
      section?.items.map((item) => [item.url, item.requiredPermission]),
    ).toEqual([['/nilai-ujian', 'exam-scores.read']])
  })
})
