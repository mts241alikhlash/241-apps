// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LandingPpdbShowcase from './LandingPpdbShowcase.vue'

describe('LandingPpdbShowcase', () => {
  it('renders section title and all six PPDB poster cards', () => {
    const wrapper = mount(LandingPpdbShowcase)

    expect(wrapper.get('h2').text()).toBe('Panduan & Poster Pendaftaran')
    expect(wrapper.text()).toContain('Informasi Khusus PPDB')

    const cards = wrapper.findAll('.showcase-card')
    expect(cards).toHaveLength(6)

    const images = wrapper.findAll('.showcase-card img')
    expect(images[0].attributes('src')).toBe('/slide/cover.webp')
    expect(images[1].attributes('src')).toBe('/slide/1.webp')
    expect(images[5].attributes('src')).toBe('/slide/5.webp')
  })

  it('provides button triggers to view full-size poster', () => {
    const wrapper = mount(LandingPpdbShowcase)

    const buttons = wrapper.findAll('.showcase-card button')
    expect(buttons).toHaveLength(6)
    expect(buttons[0].attributes('aria-label')).toContain(
      'Perbesar: Informasi Penerimaan Santri Baru',
    )
  })
})
