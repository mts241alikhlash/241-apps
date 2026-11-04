// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { landingDefaults } from '../../data/landingDefaults'
import LandingCta from './LandingCta.vue'

const mountCta = (content?: typeof landingDefaults.closing) =>
  mount(LandingCta, {
    props: content ? { content } : {},
    global: { stubs: { RouterLink: RouterLinkStub } },
  })

describe('LandingCta', () => {
  it("shows today's closing block", () => {
    const wrapper = mountCta()
    expect(wrapper.get('h2').text()).toBe(
      'Sampai bertemu di MTs Persis 241 Al-Ikhlash.',
    )
    expect(wrapper.get('img').attributes('src')).toBe(
      '/hero/rapat-orangtua.webp',
    )
    expect(wrapper.get('a.closing-requirements').text()).toBe(
      'Periksa persyaratan terlebih dahulu',
    )
    expect(wrapper.get('a.closing-requirements').attributes('href')).toBe(
      '#persyaratan',
    )
  })

  it('renders the content it is given', () => {
    const wrapper = mountCta({
      ...landingDefaults.closing,
      title: 'Sampai jumpa.',
      registerLabel: 'Daftar',
      photo: { image: { imageId: 'abc' }, alt: 'Foto baru' },
    })
    expect(wrapper.get('h2').text()).toBe('Sampai jumpa.')
    expect(wrapper.getComponent(RouterLinkStub).text()).toBe('Daftar')
    expect(wrapper.get('img').attributes('src')).toBe(
      '/admissions/landing/images/abc',
    )
    expect(wrapper.get('img').attributes('alt')).toBe('Foto baru')
  })
})
