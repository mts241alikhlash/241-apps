import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { rolesRoutes } from '@/features/platform/role'
import { userRoleRoutes } from '@/features/platform/user-role'
import { schoolUnitRoutes } from '@/features/platform/school-unit'
import { menuSections } from '@/config/menuConfig'
import id from '@/i18n/locales/id'
import en from '@/i18n/locales/en'

const Stub = { render: () => null }
const Layout = { render: () => null }

const HOME = '/setting/user'

function buildRouter() {
  const layoutRoute: RouteRecordRaw = {
    path: '/',
    component: Layout,
    children: [...userRoleRoutes, ...rolesRoutes, ...schoolUnitRoutes],
  }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: HOME },
      layoutRoute,
      { path: '/:pathMatch(.*)*', name: 'not-found', component: Stub },
    ],
  })
}

describe('admin route tree', () => {
  it('redirects / to user management even though the layout also owns /', () => {
    const resolved = buildRouter().resolve('/')
    expect(resolved.matched).toHaveLength(1)
    expect(resolved.matched[0]?.redirect).toBe(HOME)
    expect(resolved.matched[0]?.components?.default).not.toBe(Layout)
  })

  it('renders shell routes through the layout without changing their URL', () => {
    const resolved = buildRouter().resolve('/setting/role')
    expect(resolved.matched).toHaveLength(2)
    expect(resolved.matched[0]?.components?.default).toBe(Layout)
  })

  it('keeps params working for nested absolute paths', () => {
    const resolved = buildRouter().resolve('/setting/role/42/edit')
    expect(resolved.params.id).toBe('42')
    expect(resolved.matched).toHaveLength(2)
  })
})

describe('menu', () => {
  const router = buildRouter()

  it('links only to paths this app actually routes', () => {
    const urls = menuSections
      .flatMap((s) => s.items)
      .flatMap((i) => [i.url, ...(i.items ?? []).map((s) => s.url)])
      .filter((u) => u !== '#')

    const full = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: Layout,
          children: router.getRoutes().map((r) => ({
            path: r.path,
            component: Stub,
          })),
        },
        { path: '/:pathMatch(.*)*', name: 'not-found', component: Stub },
      ],
    })

    for (const url of urls) {
      expect(full.resolve(url).name, `${url} resolves to not-found`).not.toBe(
        'not-found',
      )
    }
  })

  it('uses translation keys, never literal text', () => {
    const labels = menuSections.flatMap((s) => [
      s.label,
      ...s.items.flatMap((i) => [
        i.title,
        ...(i.items ?? []).map((x) => x.title),
      ]),
    ])
    for (const label of labels) {
      expect(label, `${label} is not a key`).toMatch(/^[a-z]+(\.[a-zA-Z]+)+$/)
    }
  })

  it('has both locales covering every key the menu uses, en being the source', () => {
    const keys = menuSections.flatMap((s) => [
      s.label,
      ...s.items.flatMap((i) => [
        i.title,
        ...(i.items ?? []).map((x) => x.title),
      ]),
    ])
    const read = (obj: unknown, key: string) =>
      key.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object' && part in acc) {
          return (acc as Record<string, unknown>)[part]
        }
        return undefined
      }, obj)

    for (const key of keys) {
      expect(read(id, key), `id is missing ${key}`).toBeTypeOf('string')
      expect(read(en, key), `en is missing ${key}`).toBeTypeOf('string')
    }
  })
})
