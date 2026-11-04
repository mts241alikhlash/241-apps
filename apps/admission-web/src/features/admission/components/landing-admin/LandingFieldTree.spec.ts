// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { landingDefaults } from '../../data/landingDefaults'
import { LANDING_SECTIONS } from '../../data/landingFormConfig'
import LandingFieldTree from './LandingFieldTree.vue'

vi.mock('../../services/landingService', () => ({
  landingService: { uploadImage: vi.fn() },
}))
vi.mock('../../api/admissionApi', () => ({
  admissionApi: {
    landingImageUrl: (id: string) => `/admissions/landing/images/${id}`,
  },
}))

const config = (key: string) =>
  LANDING_SECTIONS.find((section) => section.key === key)!

const mountTree = (
  key: 'faq' | 'hero' | 'stories' | 'life',
  model: unknown,
  extra: Record<string, unknown> = {},
) =>
  mount(LandingFieldTree, {
    props: {
      fields: config(key).fields,
      model: model as Record<string, unknown>,
      errors: {},
      ...extra,
    },
  })

describe('LandingFieldTree', () => {
  it('renders a labeled input per text field with its limit', () => {
    const wrapper = mountTree('faq', landingDefaults.faq)
    const title = wrapper.get('input[name="title"]')
    expect((title.element as HTMLInputElement).value).toBe(
      landingDefaults.faq.title,
    )
    expect(title.attributes('maxlength')).toBe('80')
    expect(wrapper.text()).toContain('Judul')
  })

  it('emits the full path of an edited field, including list items', async () => {
    const wrapper = mountTree('faq', landingDefaults.faq)
    await wrapper.get('input[name="title"]').setValue('Baru')
    expect(wrapper.emitted('change')?.[0]).toEqual(['title', 'Baru'])

    await wrapper.get('input[name="items.1.question"]').setValue('Tanya baru?')
    expect(wrapper.emitted('change')?.[1]).toEqual([
      'items.1.question',
      'Tanya baru?',
    ])
  })

  it('shows an error under the field it belongs to', () => {
    const wrapper = mountTree('faq', landingDefaults.faq, {
      errors: { title: 'Wajib diisi.', 'items.0.answer': 'Wajib diisi.' },
    })
    expect(wrapper.text().match(/Wajib diisi\./g)).toHaveLength(2)
  })

  it('renders list items with move, remove and add controls within the limits', async () => {
    const wrapper = mountTree('faq', landingDefaults.faq)
    const items = wrapper.findAll('[data-test="list-item"]')
    expect(items).toHaveLength(8)
    expect(
      items[0].find('button[aria-label^="Naikkan"]').attributes('disabled'),
    ).toBeDefined()
    expect(
      items[7].find('button[aria-label^="Turunkan"]').attributes('disabled'),
    ).toBeDefined()

    await items[2].get('button[aria-label^="Turunkan"]').trigger('click')
    expect(wrapper.emitted('move')?.[0]).toEqual(['items', 2, 1])

    await items[3].get('button[aria-label^="Hapus"]').trigger('click')
    expect(wrapper.emitted('remove')?.[0]).toEqual(['items', 3])

    await wrapper.get('button[data-test="add-item"]').trigger('click')
    expect(wrapper.emitted('add')?.[0]).toEqual([
      'items',
      { question: '', answer: '' },
    ])
  })

  it('disables add at the maximum and remove at the minimum', () => {
    const full = {
      ...landingDefaults.faq,
      items: Array.from({ length: 15 }, (_, n) => ({
        question: `q${n}`,
        answer: 'a',
      })),
    }
    expect(
      mountTree('faq', full)
        .get('button[data-test="add-item"]')
        .attributes('disabled'),
    ).toBeDefined()

    const one = {
      ...landingDefaults.faq,
      items: [{ question: 'q', answer: 'a' }],
    }
    expect(
      mountTree('faq', one)
        .get('button[aria-label^="Hapus"]')
        .attributes('disabled'),
    ).toBeDefined()
  })

  it('edits title lines one per row and adds or removes a line', async () => {
    const wrapper = mountTree('hero', landingDefaults.hero)
    const rows = wrapper.findAll('input[name^="titleLines."]')
    expect(rows).toHaveLength(2)
    await rows[1].setValue('barumu dimulai!')
    expect(wrapper.emitted('change')?.[0]).toEqual([
      'titleLines',
      ['Di sini, cerita', 'barumu dimulai!'],
    ])
    await wrapper
      .get('button[data-test="add-line-titleLines"]')
      .trigger('click')
    expect(wrapper.emitted('change')?.[1]).toEqual([
      'titleLines',
      ['Di sini, cerita', 'barumu dimulai.', ''],
    ])
    await wrapper
      .findAll('button[aria-label^="Hapus baris"]')[0]
      .trigger('click')
    expect(wrapper.emitted('change')?.[2]).toEqual([
      'titleLines',
      ['barumu dimulai.'],
    ])
  })

  it('renders group fields under their group label', () => {
    const wrapper = mountTree('hero', landingDefaults.hero)
    expect(wrapper.text()).toContain('Foto besar')
    expect(wrapper.find('input[name="schoolPhoto.alt"]').exists()).toBe(true)
    expect(wrapper.find('input[name="studyPhoto.tag"]').exists()).toBe(true)
  })

  it('edits tags as separate rows with a limit of three', async () => {
    const wrapper = mountTree('stories', landingDefaults.stories)
    const tags = wrapper.findAll(
      'input[name="items.2.tags.0"], input[name="items.2.tags.1"]',
    )
    expect(tags).toHaveLength(2)
    expect(wrapper.findAll('input[name^="items.2.tags."]')).toHaveLength(2)
    await wrapper
      .get('button[data-test="add-line-items.2.tags"]')
      .trigger('click')
    expect(wrapper.emitted('change')?.[0]).toEqual([
      'items.2.tags',
      ['Alumni · Lulus 20XX', 'Orang tua santri aktif', ''],
    ])
  })

  it('disables every control when disabled', () => {
    const wrapper = mountTree('faq', landingDefaults.faq, { disabled: true })
    expect(
      wrapper
        .findAll('input, textarea, button')
        .every((el) => el.attributes('disabled') !== undefined),
    ).toBe(true)
  })

  it('marks a field with an error as invalid and ties the message to it', () => {
    const wrapper = mountTree('faq', landingDefaults.faq, {
      errors: { title: 'Wajib diisi.' },
    })
    const input = wrapper.get('input[name="title"]')
    expect(input.attributes('aria-invalid')).toBe('true')
    const message = wrapper.get(`#${input.attributes('aria-describedby')}`)
    expect(message.text()).toBe('Wajib diisi.')
    expect(
      wrapper.get('input[name="items.0.question"]').attributes('aria-invalid'),
    ).toBeUndefined()
  })
})
