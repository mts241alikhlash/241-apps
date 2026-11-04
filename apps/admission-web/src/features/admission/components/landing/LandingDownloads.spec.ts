// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LandingDownloads from './LandingDownloads.vue'

const downloads = [
  {
    id: 'd1',
    title: 'Brosur PPDB',
    description: 'Biaya dan jadwal.',
    fileName: 'brosur.pdf',
    sizeBytes: 1572864,
  },
  {
    id: 'd2',
    title: 'Formulir Pendaftaran',
    description: null,
    fileName: 'formulir.pdf',
    sizeBytes: 204800,
  },
]

describe('LandingDownloads', () => {
  it('renders nothing when there is no active file', () => {
    const wrapper = mount(LandingDownloads, { props: { downloads: [] } })
    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('Unduhan')
  })

  it('shows one card per file with size, description and a download link', () => {
    const wrapper = mount(LandingDownloads, { props: { downloads } })

    expect(wrapper.get('section').attributes('id')).toBe('unduhan')
    const cards = wrapper.findAll('li')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('Brosur PPDB')
    expect(cards[0].text()).toContain('Biaya dan jadwal.')
    expect(cards[0].text()).toContain('PDF · 1,5 MB')
    expect(cards[1].text()).toContain('PDF · 200 KB')
    expect(cards[1].text()).not.toContain('Biaya')

    const link = cards[0].get('a')
    expect(link.attributes('href')).toBe('/admissions/downloads/d1/file')
    expect(link.attributes('download')).toBeDefined()
    expect(link.attributes('rel')).toBe('noopener')
    expect(link.text()).toBe('Unduh Brosur PPDB')
  })

  it('keeps the order it was given', () => {
    const wrapper = mount(LandingDownloads, {
      props: { downloads: [...downloads].reverse() },
    })
    expect(wrapper.findAll('h3').map((h) => h.text())).toEqual([
      'Formulir Pendaftaran',
      'Brosur PPDB',
    ])
  })
})
