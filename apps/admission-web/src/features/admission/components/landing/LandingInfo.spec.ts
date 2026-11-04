// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { LandingInfoContent } from '../../types/landing'
import LandingInfo from './LandingInfo.vue'

const passthrough = { template: '<div><slot /></div>' }
const stubs = {
  Dialog: passthrough,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
}

const content: LandingInfoContent = {
  title: 'Informasi PPDB',
  description: 'Poster dan informasi terbaru.',
  posters: [
    {
      image: { imageId: 'p1' },
      alt: 'Poster jadwal',
      caption: 'Jadwal pendaftaran',
    },
    { image: { imageId: 'p2' }, alt: 'Poster biaya', caption: null },
    {
      image: { src: '/hero/baiat.webp' },
      alt: 'Poster syarat',
      caption: 'Syarat',
    },
  ],
}

const mountInfo = (props = { content }) =>
  mount(LandingInfo, { props, global: { stubs } })

describe('LandingInfo', () => {
  it('renders nothing when there is no poster', () => {
    const wrapper = mountInfo({ content: { ...content, posters: [] } })
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('shows the heading and every poster in order, uncropped', () => {
    const wrapper = mountInfo()
    expect(wrapper.get('section').attributes('id')).toBe('informasi')
    expect(wrapper.get('h2').text()).toBe('Informasi PPDB')
    const cards = wrapper.findAll('[data-test="poster-card"]')
    expect(cards).toHaveLength(3)
    const images = cards.map((card) => card.get('img'))
    expect(images.map((img) => img.attributes('src'))).toEqual([
      '/admissions/landing/images/p1',
      '/admissions/landing/images/p2',
      '/hero/baiat.webp',
    ])
    expect(images[0].attributes('alt')).toBe('Poster jadwal')
    expect(images[0].classes()).toContain('object-contain')
    expect(cards[0].text()).toContain('Jadwal pendaftaran')
    expect(cards[1].text()).not.toContain('null')
  })

  it('opens the viewer on the tapped poster and moves with the arrows', async () => {
    const wrapper = mountInfo()
    expect(wrapper.find('[data-test="poster-viewer"]').exists()).toBe(false)

    await wrapper
      .findAll('[data-test="poster-card"] button')[1]
      .trigger('click')
    const viewer = wrapper.get('[data-test="poster-viewer"]')
    expect(viewer.get('img').attributes('src')).toBe(
      '/admissions/landing/images/p2',
    )
    expect(viewer.text()).toContain('2 / 3')

    await viewer.get('[aria-label="Poster berikutnya"]').trigger('click')
    expect(
      wrapper.get('[data-test="poster-viewer"] img').attributes('src'),
    ).toBe('/hero/baiat.webp')
    expect(wrapper.get('[data-test="poster-viewer"]').text()).toContain(
      'Syarat',
    )

    await wrapper.get('[aria-label="Poster berikutnya"]').trigger('click')
    expect(
      wrapper.get('[data-test="poster-viewer"] img').attributes('src'),
    ).toBe('/admissions/landing/images/p1')

    await wrapper.get('[aria-label="Poster sebelumnya"]').trigger('click')
    expect(
      wrapper.get('[data-test="poster-viewer"] img').attributes('src'),
    ).toBe('/hero/baiat.webp')
  })

  it('moves with the arrow keys and closes with Escape', async () => {
    const wrapper = mountInfo()
    await wrapper
      .findAll('[data-test="poster-card"] button')[0]
      .trigger('click')
    const viewer = wrapper.get('[data-test="poster-viewer"]')

    await viewer.trigger('keydown', { key: 'ArrowRight' })
    expect(
      wrapper.get('[data-test="poster-viewer"] img').attributes('src'),
    ).toBe('/admissions/landing/images/p2')
    await viewer.trigger('keydown', { key: 'ArrowLeft' })
    expect(
      wrapper.get('[data-test="poster-viewer"] img').attributes('src'),
    ).toBe('/admissions/landing/images/p1')

    await viewer.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-test="poster-viewer"]').exists()).toBe(false)
  })

  it('gives every poster card an accessible name', () => {
    const wrapper = mountInfo()
    expect(
      wrapper
        .findAll('[data-test="poster-card"] button')
        .map((b) => b.attributes('aria-label')),
    ).toEqual([
      'Perbesar poster: Poster jadwal',
      'Perbesar poster: Poster biaya',
      'Perbesar poster: Poster syarat',
    ])
  })

  it('hides the arrows with a single poster', async () => {
    const wrapper = mountInfo({
      content: { ...content, posters: [content.posters[0]] },
    })
    expect(wrapper.find('[aria-label="Gulir poster ke kanan"]').exists()).toBe(
      false,
    )
    await wrapper.get('[data-test="poster-card"] button').trigger('click')
    expect(wrapper.find('[aria-label="Poster berikutnya"]').exists()).toBe(
      false,
    )
  })
})
