// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import type { ActiveWave } from '../../types'
import { landingDefaults } from '../../data/landingDefaults'
import LandingHero from './LandingHero.vue'

describe('LandingHero', () => {
  it('keeps the route to registration information keyboard accessible without nesting controls', () => {
    const wrapper = mount(LandingHero, {
      props: { wave: null, loading: false, error: false },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.find('a[href="#alur"]').exists()).toBe(true)
    expect(wrapper.find('a button').exists()).toBe(false)
  })

  it('leaves full quota and fee details to the wave section', () => {
    const wave = {
      academicYear: '2026/2027',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      registrationFee: 123000,
      remainingQuota: 8,
    } as ActiveWave
    const wrapper = mount(LandingHero, {
      props: { wave, loading: false, error: false },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.text()).not.toContain('Sisa kuota')
    expect(wrapper.text()).not.toContain('Biaya pendaftaran')
    expect(wrapper.find('a[href="#gelombang"]').exists()).toBe(true)
  })

  it("shows today's hero when no content is given", () => {
    const wrapper = mount(LandingHero, {
      props: { wave: null, loading: false, error: false },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(wrapper.get('h1').html()).toContain(
      'Di sini, cerita<br>barumu dimulai.',
    )
    expect(wrapper.text()).toContain('Mulai pendaftaran')
    expect(wrapper.text()).toContain('Lihat cara mendaftar')
    expect(wrapper.findAll('img').map((img) => img.attributes('src'))).toEqual([
      '/hero/baiat.webp',
      '/hero/tahfidz.webp',
    ])
  })

  it('renders the content it is given', () => {
    const content = {
      ...landingDefaults.hero,
      titleLines: ['Judul satu', 'judul dua'],
      registerLabel: 'Daftar sekarang',
      schoolPhoto: {
        image: { imageId: 'abc' },
        alt: 'Foto sekolah',
        caption: 'Keterangan baru',
      },
    }
    const wrapper = mount(LandingHero, {
      props: { wave: null, loading: false, error: false, content },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.get('h1').html()).toContain('Judul satu<br>judul dua')
    expect(wrapper.getComponent(RouterLinkStub).text()).toBe('Daftar sekarang')
    const photo = wrapper.get('.hero-school-photo img')
    expect(photo.attributes('src')).toBe('/admissions/landing/images/abc')
    expect(photo.attributes('alt')).toBe('Foto sekolah')
    expect(wrapper.get('.hero-school-photo figcaption').text()).toBe(
      'Keterangan baru',
    )
  })
})
