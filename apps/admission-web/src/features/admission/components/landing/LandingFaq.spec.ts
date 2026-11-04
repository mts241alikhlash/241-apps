// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { landingDefaults } from '../../data/landingDefaults'
import LandingFaq from './LandingFaq.vue'
import LandingHero from './LandingHero.vue'

describe('LandingFaq', () => {
  it('names the actual registration action shown in the hero', () => {
    const hero = mount(LandingHero, {
      props: { wave: null, loading: false, error: false },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    const faq = mount(LandingFaq)
    const registrationButton = hero.getComponent(RouterLinkStub).text()

    expect(faq.text()).toContain(registrationButton)
  })

  it("shows today's eight questions split in two columns", () => {
    const wrapper = mount(LandingFaq)
    expect(wrapper.get('h2').text()).toBe('Pertanyaan seputar pendaftaran')
    expect(wrapper.findAll('details')).toHaveLength(8)
    expect(wrapper.findAll('details')[0].get('summary').text()).toBe(
      'Bagaimana cara memulai pendaftaran?',
    )
  })

  it('renders the questions it is given', () => {
    const content = {
      ...landingDefaults.faq,
      title: 'Tanya jawab',
      items: [
        { question: 'Satu?', answer: 'Jawab satu.' },
        { question: 'Dua?', answer: 'Jawab dua.' },
        { question: 'Tiga?', answer: 'Jawab tiga.' },
      ],
    }
    const wrapper = mount(LandingFaq, { props: { content } })
    expect(wrapper.get('h2').text()).toBe('Tanya jawab')
    expect(wrapper.findAll('details')).toHaveLength(3)
    expect(wrapper.findAll('details')[2].get('p').text()).toBe('Jawab tiga.')
  })
})
