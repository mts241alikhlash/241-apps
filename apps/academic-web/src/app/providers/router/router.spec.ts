import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { classroomRoutes } from '@/features/academic/classroom'
import { scheduleRoutes } from '@/features/academic/schedule'
import { academicYearRoutes } from '@/features/academic/academic-year'

const Stub = { render: () => null }
const Layout = { render: () => null }

const PUBLISHED_AT_RUNTIME = new Set([
  'classroom-manage',
  'schedule-view',
  'curriculum-subject',
  'classroom-schedule-editor',
])

function buildRouter(children: RouteRecordRaw[]) {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/academic/info' },
      { path: '/academic/info', name: 'academic-info', component: Stub },
      { path: '/', component: Layout, children },
      { path: '/:pathMatch(.*)*', name: 'not-found', component: Stub },
    ],
  })
}

describe('academic route tree', () => {
  it('still redirects / to academic-info even though the layout also owns /', () => {
    const resolved = buildRouter([...academicYearRoutes]).resolve('/')
    expect(resolved.matched).toHaveLength(1)
    expect(resolved.matched[0]?.redirect).toBe('/academic/info')
    expect(resolved.matched[0]?.components?.default).not.toBe(Layout)
  })

  it('renders shell routes through the layout without changing their URL', () => {
    const first = academicYearRoutes[0]
    expect(first).toBeDefined()
    const resolved = buildRouter([...academicYearRoutes]).resolve(first.path)
    expect(resolved.matched).toHaveLength(2)
    expect(resolved.matched[0]?.components?.default).toBe(Layout)
  })

  it('keeps params working for nested absolute paths', () => {
    const resolved = buildRouter([...classroomRoutes]).resolve(
      '/academic/classroom/abc/manage',
    )
    expect(resolved.params.id).toBe('abc')
    expect(resolved.matched).toHaveLength(2)
  })

  it('states a trail on every route that does not publish one at runtime', () => {
    const all = [...academicYearRoutes, ...classroomRoutes, ...scheduleRoutes]
    for (const route of all) {
      const name = String(route.name)
      if (PUBLISHED_AT_RUNTIME.has(name)) {
        expect(
          route.meta?.breadcrumbs,
          `${name} should not state a trail`,
        ).toBeUndefined()
      } else {
        expect(route.meta?.breadcrumbs, `${name} has no trail`).toBeDefined()
      }
    }
  })
})
