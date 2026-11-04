// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { landingDefaults } from '../../data/landingDefaults'
import LandingLife from './LandingLife.vue'

describe('LandingLife', () => {
  it("shows today's texts and seven photos when no content is given", () => {
    const wrapper = mount(LandingLife)

    expect(wrapper.get('.life-label').text()).toBe(
      'Mengenal MTs Persis 241 Al-Ikhlash',
    )
    expect(wrapper.get('h2').html()).toContain(
      'Ada cerita<br>di setiap sudutnya.',
    )
    expect(wrapper.get('.life-footnote p').text()).toBe(
      'Setiap perjalanan dimulai dengan mengenal.',
    )
    expect(wrapper.get('.life-footnote a').text()).toBe(
      'Lihat jadwal pendaftaran',
    )
    expect(wrapper.get('.life-footnote a').attributes('href')).toBe(
      '#gelombang',
    )
    expect(wrapper.get('.life-photo-title').text()).toBe("Bai'at Santri")
    const first = wrapper.findAll('figure.life-card').slice(0, 7)
    expect(first.map((card) => card.get('img').attributes('src'))).toEqual(
      landingDefaults.life.photos.map(
        (photo) => (photo.image as { src: string }).src,
      ),
    )
  })

  it('renders the content it is given, including an uploaded image', () => {
    const content = {
      ...landingDefaults.life,
      label: 'Label baru',
      titleLines: ['Satu', 'dua'],
      photos: [
        {
          image: { imageId: 'abc' },
          alt: 'Alt satu',
          title: 'Judul satu',
          caption: 'Keterangan satu',
        },
        {
          image: { src: '/hero/tahfidz.webp' },
          alt: 'Alt dua',
          title: 'Judul dua',
          caption: 'Keterangan dua',
        },
      ],
    }
    const wrapper = mount(LandingLife, { props: { content } })

    expect(wrapper.get('.life-label').text()).toBe('Label baru')
    expect(wrapper.get('h2').html()).toContain('Satu<br>dua')
    expect(wrapper.get('.life-photo-title').text()).toBe('Judul satu')
    expect(wrapper.get('.life-photo-caption').text()).toBe('Keterangan satu')
    const images = wrapper.findAll('figure.life-card img')
    expect(images[0].attributes('src')).toBe('/admissions/landing/images/abc')
    expect(images[2].attributes('alt')).toBe('Alt satu')
  })

  it('works with a single photo', () => {
    const content = {
      ...landingDefaults.life,
      photos: [landingDefaults.life.photos[0]],
    }
    const wrapper = mount(LandingLife, { props: { content } })
    expect(wrapper.findAll('figure.life-card')).toHaveLength(1)
  })
})
