import { beforeEach, describe, expect, it, vi } from 'vitest'
import { landingDefaults } from '../data/landingDefaults'
import { LANDING_SECTIONS } from '../data/landingFormConfig'
import { useLandingSectionForm } from './useLandingSectionForm'

const service = vi.hoisted(() => ({ saveSection: vi.fn() }))
vi.mock('../services/landingService', () => ({ landingService: service }))

const faq = LANDING_SECTIONS.find((section) => section.key === 'faq')!
const overview = {
  sections: {},
  hasUnpublishedChanges: true,
  publishedAt: null,
}

beforeEach(() => vi.clearAllMocks())

describe('useLandingSectionForm', () => {
  it('starts clean with a copy of the initial content', () => {
    const form = useLandingSectionForm(faq, landingDefaults.faq)
    expect(form.dirty.value).toBe(false)
    form.setField('title', 'Tanya jawab')
    expect(landingDefaults.faq.title).not.toBe('Tanya jawab')
  })

  it('becomes dirty on an edit and clean again when the edit is undone', () => {
    const form = useLandingSectionForm(faq, landingDefaults.faq)
    form.setField('title', 'Lain')
    expect(form.dirty.value).toBe(true)
    form.setField('title', landingDefaults.faq.title)
    expect(form.dirty.value).toBe(false)
  })

  it('adds, removes and moves list items', () => {
    const form = useLandingSectionForm(faq, landingDefaults.faq)
    const count = landingDefaults.faq.items.length
    form.add('items', { question: '', answer: '' })
    expect(form.values.value.items).toHaveLength(count + 1)
    form.remove('items', 0)
    expect(form.values.value.items).toHaveLength(count)
    const first = form.values.value.items[0].question
    form.move('items', 0, 1)
    expect(form.values.value.items[1].question).toBe(first)
  })

  it('does not save and shows the errors when the content is invalid', async () => {
    const form = useLandingSectionForm(faq, landingDefaults.faq)
    form.setField('items.0.answer', '')

    expect(await form.save()).toBeNull()

    expect(service.saveSection).not.toHaveBeenCalled()
    expect(form.errors.value['items.0.answer']).toBe('Wajib diisi.')
  })

  it('saves the converted content, clears the dirty flag and returns the overview', async () => {
    service.saveSection.mockResolvedValue({ overview })
    const form = useLandingSectionForm(faq, landingDefaults.faq)
    form.setField('title', '  Tanya jawab  ')

    expect(await form.save()).toEqual(overview)

    expect(service.saveSection).toHaveBeenCalledWith(
      'faq',
      expect.objectContaining({ title: 'Tanya jawab' }),
    )
    expect(form.dirty.value).toBe(false)
    expect(form.errors.value).toEqual({})
  })

  it('stays dirty when the server refuses the save', async () => {
    service.saveSection.mockResolvedValue({ error: 'Isi tidak valid' })
    const form = useLandingSectionForm(faq, landingDefaults.faq)
    form.setField('title', 'Lain')

    expect(await form.save()).toBeNull()

    expect(form.dirty.value).toBe(true)
    expect(form.saving.value).toBe(false)
  })

  it('fills the form with the built-in content and counts it as a change', () => {
    const form = useLandingSectionForm(faq, {
      ...landingDefaults.faq,
      title: 'Diubah',
    })
    expect(form.dirty.value).toBe(false)
    form.fillBuiltIn()
    expect(form.values.value.title).toBe(landingDefaults.faq.title)
    expect(form.dirty.value).toBe(true)
  })

  it('shows a null optional text as empty and stays clean', () => {
    const stories = LANDING_SECTIONS.find(
      (section) => section.key === 'stories',
    )!
    const form = useLandingSectionForm(stories, landingDefaults.stories)
    expect(form.values.value.items[0].position).toBe(
      'Posisi atau profesi saat ini',
    )
    const withNull = {
      ...landingDefaults.stories,
      items: [{ ...landingDefaults.stories.items[0], position: null }],
    }
    const nullForm = useLandingSectionForm(stories, withNull)
    expect(nullForm.values.value.items[0].position).toBe('')
    expect(nullForm.dirty.value).toBe(false)
  })

  it('takes new content after a refresh and becomes clean', () => {
    const form = useLandingSectionForm(faq, landingDefaults.faq)
    form.setField('title', 'Lain')
    form.reset({ ...landingDefaults.faq, title: 'Dari server' })
    expect(form.values.value.title).toBe('Dari server')
    expect(form.dirty.value).toBe(false)
  })
})
