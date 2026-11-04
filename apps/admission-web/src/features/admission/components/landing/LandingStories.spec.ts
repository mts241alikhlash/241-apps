// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { landingDefaults } from '../../data/landingDefaults'
import LandingStories from './LandingStories.vue'

describe('LandingStories', () => {
  it("shows today's heading and three example stories", () => {
    const wrapper = mount(LandingStories)
    expect(wrapper.get('.stories-label').text()).toBe(
      'Cerita keluarga MTs Persis 241 Al-Ikhlash',
    )
    expect(wrapper.get('h2').text()).toBe(
      'Dengar langsung dari mereka yang menjalaninya.',
    )
    expect(wrapper.get('.stories-note').text()).toContain(
      'Kisah alumni dan orang tua',
    )
    const slides = wrapper.findAll('figure.story-slide')
    expect(slides.length).toBeGreaterThanOrEqual(3)
    expect(slides[0].text()).toContain('Contoh')
  })

  it('renders an admin story with a photo and without the example badge', () => {
    const content = {
      ...landingDefaults.stories,
      items: [
        {
          kind: 'Cerita alumni',
          quote: 'Bagus sekali.',
          name: 'Ani Wulandari',
          position: null,
          tags: [],
          photo: { imageId: 'abc' },
        },
      ],
    }
    const wrapper = mount(LandingStories, { props: { content } })
    const slide = wrapper.get('figure.story-slide')
    expect(slide.text()).not.toContain('Contoh')
    expect(slide.get('blockquote').text()).toBe('Bagus sekali.')
    expect(slide.get('img').attributes('src')).toBe(
      '/admissions/landing/images/abc',
    )
    expect(wrapper.find('.stories-controls').exists()).toBe(false)
  })

  it('shows initials when a story has no photo', () => {
    const content = {
      ...landingDefaults.stories,
      items: [
        {
          kind: 'Cerita orang tua',
          quote: 'Terima kasih.',
          name: 'Budi Santoso',
          position: 'Guru',
          tags: ['Orang tua'],
          photo: null,
        },
      ],
    }
    const wrapper = mount(LandingStories, { props: { content } })
    expect(wrapper.get('.story-initials').text()).toBe('BS')
  })

  it('renders nothing when there is no story', () => {
    const wrapper = mount(LandingStories, {
      props: { content: { ...landingDefaults.stories, items: [] } },
    })
    expect(wrapper.find('section').exists()).toBe(false)
  })
})
