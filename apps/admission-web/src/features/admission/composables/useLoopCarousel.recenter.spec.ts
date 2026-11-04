// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useLoopCarousel } from './useLoopCarousel'

type Resize = () => void

const observers: { callback: Resize; target: Element | null }[] = []

class FakeResizeObserver {
  private entry: { callback: Resize; target: Element | null }

  constructor(callback: Resize) {
    this.entry = { callback, target: null }
    observers.push(this.entry)
  }

  observe(target: Element) {
    this.entry.target = target
  }

  unobserve() {
    this.entry.target = null
  }

  disconnect() {
    this.entry.target = null
  }
}

function layout(track: HTMLElement, count: number, step: number) {
  Array.from(track.children).forEach((child, index) => {
    Object.defineProperty(child, 'offsetLeft', {
      value: index * step,
      configurable: true,
    })
    Object.defineProperty(child, 'offsetWidth', {
      value: step - 16,
      configurable: true,
    })
  })
  void count
}

function mountCarousel(count: number, firstStep: number) {
  let api!: ReturnType<typeof useLoopCarousel>
  const Harness = defineComponent({
    setup() {
      api = useLoopCarousel(count)
      return () =>
        h(
          'div',
          { ref: api.bindTrack, class: 'track' },
          Array.from({ length: count * 3 }, (_, index) =>
            h('div', { key: index }),
          ),
        )
    },
  })
  const wrapper = mount(Harness, { attachTo: document.body })
  const track = wrapper.get('.track').element as HTMLElement
  layout(track, count, firstStep)
  return { wrapper, track, api }
}

beforeEach(() => {
  observers.length = 0
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('useLoopCarousel start position', () => {
  it('starts on the first slide of the middle copy', () => {
    const { track } = mountCarousel(7, 608)
    layout(track, 7, 608)
    observers[0].callback()
    expect(track.scrollLeft).toBe(7 * 608)
  })

  it('re-centers when the track is resized before the visitor touches it', () => {
    const { track } = mountCarousel(7, 695)
    track.scrollLeft = 7 * 695

    layout(track, 7, 608)
    observers[0].callback()

    expect(track.scrollLeft).toBe(7 * 608)
  })

  it('stops re-centring once the visitor has interacted with the track', () => {
    const { track } = mountCarousel(7, 608)
    observers[0].callback()
    track.dispatchEvent(new Event('pointerdown'))
    track.scrollLeft = 7 * 608 + 300

    layout(track, 7, 700)
    observers[0].callback()

    expect(track.scrollLeft).toBe(7 * 608 + 300)
  })

  it('stops re-centring once the arrows or dots moved the track', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const { track, api } = mountCarousel(7, 608)
    track.scrollTo = vi.fn()
    observers[0].callback()

    api.go(1)
    track.scrollLeft = 7 * 608 + 608
    layout(track, 7, 700)
    observers[0].callback()

    expect(track.scrollLeft).toBe(7 * 608 + 608)
  })

  it('does not observe a single slide', () => {
    mountCarousel(1, 608)
    expect(observers.every((entry) => entry.target === null)).toBe(true)
  })
})
