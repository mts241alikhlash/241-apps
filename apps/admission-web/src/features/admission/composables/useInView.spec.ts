// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useInView } from './useInView'

function mountHost(threshold?: number) {
  let api!: ReturnType<typeof useInView>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useInView(threshold)
        return () => h('section', { ref: api.target })
      },
    }),
  )
  return { wrapper, api }
}

describe('useInView', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reveals at once when the browser has no IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined)

    const { api } = mountHost()

    expect(api.visible.value).toBe(true)
  })

  it('stays hidden until the section scrolls into view, then reveals once and stops observing', () => {
    let notify: (entries: { isIntersecting: boolean }[]) => void = vi.fn()
    const disconnect = vi.fn()
    const observe = vi.fn()
    class FakeObserver {
      constructor(callback: typeof notify, options: { threshold: number }) {
        notify = callback
        expect(options.threshold).toBe(0.5)
      }
      observe = observe
      disconnect = disconnect
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver)

    const { api } = mountHost(0.5)
    expect(observe).toHaveBeenCalledTimes(1)
    expect(api.visible.value).toBe(false)

    notify([{ isIntersecting: false }])
    expect(api.visible.value).toBe(false)
    expect(disconnect).not.toHaveBeenCalled()

    notify([{ isIntersecting: true }])
    expect(api.visible.value).toBe(true)
    expect(disconnect).toHaveBeenCalledTimes(1)
  })

  it('stops observing when the component goes away', () => {
    const disconnect = vi.fn()
    class FakeObserver {
      observe = vi.fn()
      disconnect = disconnect
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver)

    const { wrapper } = mountHost()
    wrapper.unmount()

    expect(disconnect).toHaveBeenCalled()
  })
})
