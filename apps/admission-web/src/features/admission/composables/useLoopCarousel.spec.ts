// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useLoopCarousel } from './useLoopCarousel'

const STEP = 100

function mountCarousel(count: number) {
  let api!: ReturnType<typeof useLoopCarousel>
  let track!: HTMLElement
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useLoopCarousel(count)
        return () =>
          h(
            'div',
            {
              ref: (node: unknown) => {
                api.bindTrack(node)
                track = node as HTMLElement
              },
            },
            Array.from({ length: count * api.copies }, (_, index) =>
              h('div', { 'data-left': String(index * STEP) }),
            ),
          )
      },
    }),
  )
  return { wrapper, api, track: () => track }
}

describe('useLoopCarousel', () => {
  let reducedMotion = false

  beforeEach(() => {
    vi.useFakeTimers()
    reducedMotion = false
    Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
      configurable: true,
      get(this: HTMLElement) {
        return Number(this.dataset.left ?? 0)
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => STEP,
    })
    vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('repeats the items three times, tagged by copy, so the track can wrap', () => {
    const { api } = mountCarousel(2)

    expect(api.copies).toBe(3)
    expect(api.middleCopy).toBe(1)
    expect(api.loop([{ id: 'a' }, { id: 'b' }])).toEqual([
      { id: 'a', copy: 0 },
      { id: 'b', copy: 0 },
      { id: 'a', copy: 1 },
      { id: 'b', copy: 1 },
      { id: 'a', copy: 2 },
      { id: 'b', copy: 2 },
    ])
  })

  it('does not repeat a single item', () => {
    const { api } = mountCarousel(1)

    expect(api.copies).toBe(1)
    expect(api.middleCopy).toBe(0)
    expect(api.loop([{ id: 'a' }])).toEqual([{ id: 'a', copy: 0 }])
  })

  it('starts on the middle copy', () => {
    const { track } = mountCarousel(3)

    expect(track().scrollLeft).toBe(3 * STEP)
  })

  it('reports the item in view, wrapping around the copies', () => {
    const { api, track } = mountCarousel(3)

    track().scrollLeft = 4 * STEP
    api.onScroll()

    expect(api.current.value).toBe(1)
  })

  it('jumps back to the middle copy once scrolling settles outside it', () => {
    const { api, track } = mountCarousel(3)

    track().scrollLeft = 1 * STEP
    api.onScroll()
    expect(api.current.value).toBe(1)
    vi.advanceTimersByTime(120)

    expect(track().scrollLeft).toBe(4 * STEP)
  })

  it('leaves the position alone while it is already on the middle copy', () => {
    const { api, track } = mountCarousel(3)

    track().scrollLeft = 4 * STEP
    api.onScroll()
    vi.advanceTimersByTime(120)

    expect(track().scrollLeft).toBe(4 * STEP)
  })

  it('moves one item per step and smooth-scrolls unless motion is reduced', () => {
    const { api, track } = mountCarousel(3)
    const scrollTo = vi.fn()
    track().scrollTo = scrollTo

    api.go(1)
    expect(scrollTo).toHaveBeenLastCalledWith({
      left: 4 * STEP,
      behavior: 'smooth',
    })

    reducedMotion = true
    api.go(-1)
    expect(scrollTo).toHaveBeenLastCalledWith({
      left: 2 * STEP,
      behavior: 'auto',
    })
  })

  it('goes to a given item relative to the one in view', () => {
    const { api, track } = mountCarousel(3)
    const scrollTo = vi.fn()
    track().scrollTo = scrollTo

    api.goTo(2)

    expect(scrollTo).toHaveBeenLastCalledWith({
      left: 5 * STEP,
      behavior: 'smooth',
    })
  })
})
