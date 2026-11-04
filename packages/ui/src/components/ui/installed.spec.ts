// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'

const names = [
  'accordion',
  'aspect-ratio',
  'attachment',
  'bubble',
  'button-group',
  'carousel',
  'code-block',
  'combobox',
  'context-menu',
  'drawer',
  'empty',
  'hover-card',
  'input-group',
  'input-otp',
  'item',
  'kbd',
  'marker',
  'menubar',
  'message',
  'message-scroller',
  'navigation-menu',
  'number-field',
  'pin-input',
  'questionnaire',
  'radio-group',
  'resizable',
  'slider',
  'spinner',
  'tags-input',
  'toggle',
  'toggle-group',
  'trace',
]

describe('installed shadcn-vue components', () => {
  it.each(names)('%s exports at least one component', async (name) => {
    const mod = (await import(`./${name}/index.ts`)) as Record<string, unknown>
    expect(Object.keys(mod).length).toBeGreaterThan(0)
  })

  it('kbd, spinner, toggle, slider and radio group mount', async () => {
    const { Kbd } = await import('./kbd')
    const { Spinner } = await import('./spinner')
    const { Toggle } = await import('./toggle')
    const { Slider } = await import('./slider')
    const { RadioGroup, RadioGroupItem } = await import('./radio-group')
    expect(mount(Kbd, { slots: { default: 'K' } }).text()).toBe('K')
    expect(mount(Spinner).exists()).toBe(true)
    expect(mount(Toggle, { slots: { default: 'T' } }).text()).toBe('T')
    expect(mount(Slider, { props: { modelValue: [10] } }).exists()).toBe(true)
    const group = mount(RadioGroup, {
      slots: { default: () => h(RadioGroupItem, { value: 'a' }) },
    })
    expect(group.find('[role=radio]').exists()).toBe(true)
  })

  it('carousel content receives the embla viewport ref', async () => {
    const { Carousel, CarouselContent, CarouselItem } = await import('./carousel')
    const w = mount(Carousel, {
      slots: {
        default: () =>
          h(CarouselContent, null, () => h(CarouselItem, null, () => 'one')),
      },
      attachTo: document.body,
    })
    expect(w.find('[data-slot=carousel-content]').exists()).toBe(true)
    expect(w.text()).toContain('one')
    w.unmount()
  })

  it('new button controls read the control tokens', async () => {
    const { toggleVariants } = await import('./toggle')
    expect(toggleVariants()).toContain('h-[var(--control-h-md,1.75rem)]')
  })
})
