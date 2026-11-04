// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { landingDefaults } from '../../data/landingDefaults'
import LandingHowItWorks from './LandingHowItWorks.vue'

describe('LandingHowItWorks', () => {
  it("shows today's five steps with their numbers", () => {
    const wrapper = mount(LandingHowItWorks)
    expect(wrapper.get('h2').text()).toBe('Tahapan pendaftaran')
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(5)
    expect(items[0].text()).toContain('01')
    expect(items[0].get('h3').text()).toBe('Buat akun')
    expect(items[4].get('h3').text()).toBe('Kirim dan pantau')
  })

  it('renders the steps it is given and sizes the grid to their number', () => {
    const content = {
      ...landingDefaults.steps,
      title: 'Alur baru',
      items: landingDefaults.steps.items.slice(0, 3),
    }
    const wrapper = mount(LandingHowItWorks, { props: { content } })
    expect(wrapper.get('h2').text()).toBe('Alur baru')
    expect(wrapper.findAll('li')).toHaveLength(3)
    expect(wrapper.get('ol').classes()).toContain('lg:grid-cols-3')
  })
})
