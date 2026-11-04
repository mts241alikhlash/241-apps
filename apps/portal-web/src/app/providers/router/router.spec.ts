import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { portalHomeRoutes } from '@/features/homepage'
import { portalPublicPageRoutes } from '@/features/page'
import { portalPublicPostRoutes } from '@/features/post'

const Stub = { render: () => null }
const AdminLayout = { render: () => null }
const PublicLayout = { render: () => null }

const publicChildren = [
  ...portalHomeRoutes,
  ...portalPublicPostRoutes,
  ...portalPublicPageRoutes,
]

function buildRouter(adminChildren: RouteRecordRaw[] = []) {
  const publicRoute: RouteRecordRaw = {
    path: '/',
    component: PublicLayout,
    children: publicChildren,
  }
  const layoutRoute: RouteRecordRaw = {
    path: '/',
    component: AdminLayout,
    children: adminChildren,
  }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      publicRoute,
      layoutRoute,
      { path: '/:pathMatch(.*)*', name: 'not-found', component: Stub },
    ],
  })
}

describe('portal route tree', () => {
  it('resolves the homepage outside the admin shell even though both own /', () => {
    const resolved = buildRouter().resolve('/')

    expect(resolved.name).toBe('portal-home')
    expect(
      resolved.matched.some(
        (record) => record.components?.default === AdminLayout,
      ),
    ).toBe(false)
  })

  it('renders the homepage through the public layout', () => {
    const resolved = buildRouter().resolve('/')

    expect(resolved.matched).toHaveLength(2)
    expect(resolved.matched[0]?.components?.default).toBe(PublicLayout)
  })

  it('routes the public listings and detail pages through the public layout', () => {
    const router = buildRouter()

    for (const path of ['/news', '/news/juara-1', '/articles']) {
      const resolved = router.resolve(path)
      expect(resolved.matched[0]?.components?.default, path).toBe(PublicLayout)
      expect(resolved.name, path).not.toBe('not-found')
    }
  })

  it('still routes admin paths through the shell', () => {
    const resolved = buildRouter([
      { path: '/admin/news', name: 'admin-posts', component: Stub },
    ]).resolve('/admin/news')

    expect(resolved.name).toBe('admin-posts')
    expect(resolved.matched[0]?.components?.default).toBe(AdminLayout)
  })

  it('matches an unpublished slug the same way it matches a published one', () => {
    const router = buildRouter()

    expect(router.resolve('/news/belum-terbit').name).toBe(
      router.resolve('/news/sudah-terbit').name,
    )
  })

  it('falls through to not-found for an address no route claims', () => {
    expect(buildRouter().resolve('/tidak-ada-sama-sekali/apa-pun').name).toBe(
      'not-found',
    )
  })

  it('does not let the page catch-all swallow a named listing', () => {
    const router = buildRouter()

    expect(router.resolve('/news').name).toBe('public-news')
    expect(router.resolve('/articles').name).toBe('public-articles')
  })

  it('routes an unclaimed single-segment address to the page view', () => {
    expect(buildRouter().resolve('/profil').name).toBe('public-page')
  })

  it('leaves every public route open to anonymous visitors', () => {
    const requiresAuth = (route: RouteRecordRaw): boolean =>
      Boolean(route.meta?.requiresAuth) ||
      (route.children ?? []).some(requiresAuth)

    for (const route of publicChildren) {
      expect(requiresAuth(route), `${route.path} is gated`).toBe(false)
    }
  })
})
