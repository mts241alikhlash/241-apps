// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { useRouteCategory } from './useRouteCategory'

const { routeState } = vi.hoisted(() => ({
  routeState: { meta: {} },
}))
vi.mock('vue-router', () => ({ useRoute: () => routeState }))

describe('useRouteCategory', () => {
  it('reads the category and the section prefix from route.meta', () => {
    routeState.meta = { category: 'NON_EXAM' }
    const { category, sectionPrefix } = useRouteCategory()

    expect(category.value).toBe('NON_EXAM')
    expect(sectionPrefix.value).toBe('/classwork')
  })

  it('falls back to the exam section when the route carries no category', () => {
    routeState.meta = { category: 'nonsense' }
    const { category, sectionPrefix } = useRouteCategory()

    expect(category.value).toBeUndefined()
    expect(sectionPrefix.value).toBe('/exam')
  })
})
