// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ItemGradeCard from './ItemGradeCard.vue'
import type { GradingItem } from '../types'

const { grade } = vi.hoisted(() => ({ grade: vi.fn() }))
vi.mock('../services/examGradingService', () => ({
  examGradingService: { grade },
}))

const item = (overrides: Partial<GradingItem> = {}): GradingItem => ({
  questionId: 'q1',
  number: 2,
  type: 'ESSAY',
  bodyHtml: '<p>Jelaskan</p>',
  points: 10,
  guideHtml: '<p>Pedoman</p>',
  acceptedAnswers: null,
  answer: { text: 'jawaban siswa' },
  score: null,
  note: null,
  gradedAt: null,
  needsGrading: true,
  ...overrides,
})

const mountCard = (value: GradingItem, canGrade = true) =>
  mount(ItemGradeCard, {
    props: { sessionId: 'x1', item: value, canGrade },
    global: {
      stubs: {
        QuestionHtml: {
          props: ['html'],
          template: '<div class="q">{{ html }}</div>',
        },
      },
    },
  })

const saveButton = (wrapper: ReturnType<typeof mountCard>) =>
  wrapper.findAll('button').find((button) => button.text().includes('Simpan'))!

describe('ItemGradeCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the question, its guide and the answer of the student', () => {
    const wrapper = mountCard(item())

    expect(wrapper.text()).toContain('Soal 2')
    expect(wrapper.text()).toContain('Uraian')
    expect(wrapper.text()).toContain('10 poin')
    expect(wrapper.text()).toContain('Pedoman')
    expect(wrapper.text()).toContain('jawaban siswa')
  })

  it('keeps Simpan disabled until a score inside 0 to the points is typed', async () => {
    const wrapper = mountCard(item())
    const score = wrapper.find('input[type="number"]')

    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    await score.setValue('11')
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    await score.setValue('7.5')
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('saves the score and a trimmed note, then reports the graded item', async () => {
    const graded = item({ score: 7.5, needsGrading: false })
    grade.mockResolvedValue(graded)
    const wrapper = mountCard(item())

    await wrapper.find('input[type="number"]').setValue('7.5')
    await wrapper.find('input[maxlength="500"]').setValue('  cukup  ')
    await saveButton(wrapper).trigger('click')
    await flushPromises()

    expect(grade).toHaveBeenCalledWith('x1', 'q1', {
      score: 7.5,
      note: 'cukup',
    })
    expect(wrapper.emitted('graded')?.[0]).toEqual([graded])
  })

  it('does not ask for a grade when the student left the answer blank', () => {
    const wrapper = mountCard(
      item({ answer: { text: '  ' }, needsGrading: false }),
    )

    expect(wrapper.text()).toContain('Tidak dijawab')
    expect(wrapper.find('input[type="number"]').exists()).toBe(false)
  })

  it('shows the accepted answers of a short answer question', () => {
    const wrapper = mountCard(
      item({
        type: 'SHORT_ANSWER',
        guideHtml: null,
        acceptedAnswers: ['Jakarta', 'DKI'],
      }),
    )

    expect(wrapper.text()).toContain('Jakarta, DKI')
  })

  it('hides the form when the caller cannot grade', () => {
    const wrapper = mountCard(item(), false)

    expect(wrapper.text()).toContain('jawaban siswa')
    expect(wrapper.find('input[type="number"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Simpan')
  })

  it('keeps what the teacher typed when the parent reloads the same grade', async () => {
    const wrapper = mountCard(item())
    await wrapper.find('input[type="number"]').setValue('6')

    await wrapper.setProps({ item: { ...item() } })

    expect(
      (wrapper.find('input[type="number"]').element as HTMLInputElement).value,
    ).toBe('6')
  })

  it('shows the new grade when the server changed it', async () => {
    const wrapper = mountCard(item())

    await wrapper.setProps({ item: item({ score: 9, needsGrading: false }) })

    expect(
      (wrapper.find('input[type="number"]').element as HTMLInputElement).value,
    ).toBe('9')
  })

  it('does not offer a save for a note that only gained spaces', async () => {
    const wrapper = mountCard(
      item({ score: 7, note: 'cukup', needsGrading: false }),
    )

    await wrapper.find('input[maxlength="500"]').setValue('cukup   ')

    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('treats an answer of another shape as an answer, not as a blank', () => {
    const wrapper = mountCard(
      item({ answer: { key: 'A' }, needsGrading: true }),
    )

    expect(wrapper.text()).not.toContain('Tidak dijawab')
    expect(wrapper.find('input[type="number"]').exists()).toBe(true)
  })
})
