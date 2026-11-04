// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type {
  MultipleChoiceContent,
  MultipleResponseContent,
  ShortAnswerContent,
  TrueFalseContent,
} from '../../types'
import { emptyContent } from '../../utils/questionDraft'
import ChoiceAnswer from './ChoiceAnswer.vue'
import ShortAnswer from './ShortAnswer.vue'
import TrueFalseAnswer from './TrueFalseAnswer.vue'

vi.mock('../RichQuestionText.vue', () => ({
  default: defineComponent({
    props: { modelValue: String, label: String },
    emits: ['update:modelValue'],
    template:
      '<input :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  }),
}))

function mountModel<T>(component: unknown, initial: T) {
  const wrapper = mount(component as never, {
    props: {
      modelValue: initial,
      'onUpdate:modelValue': (value: T) =>
        wrapper.setProps({ modelValue: value } as never),
    } as never,
  })
  return wrapper
}

const five = (): MultipleChoiceContent => ({
  choices: (['A', 'B', 'C', 'D', 'E'] as const).map((key) => ({
    key,
    html: `<p>${key}</p>`,
  })),
  answer: { key: 'A' },
})

describe('ChoiceAnswer', () => {
  it('refuses a sixth choice', async () => {
    const wrapper = mountModel(ChoiceAnswer, five())
    const add = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Tambah pilihan')!

    expect(wrapper.findAll('[data-testid="choice-row"]')).toHaveLength(5)
    expect(add.attributes('disabled')).toBeDefined()
    await add.trigger('click')
    expect(wrapper.findAll('[data-testid="choice-row"]')).toHaveLength(5)
  })

  it('adds a lettered choice below five', async () => {
    const wrapper = mountModel(ChoiceAnswer, emptyContent('MULTIPLE_CHOICE'))

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Tambah pilihan')!
      .trigger('click')

    expect(wrapper.findAll('[data-testid="choice-row"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('C')
  })

  it('marks the chosen key for multiple choice', async () => {
    const wrapper = mountModel(ChoiceAnswer, emptyContent('MULTIPLE_CHOICE'))

    await wrapper.get('[aria-label="Kunci jawaban pilihan B"]').trigger('click')
    await flushPromises()

    expect(
      (wrapper.props('modelValue') as MultipleChoiceContent).answer,
    ).toEqual({ key: 'B' })
    expect(
      wrapper
        .get('[aria-label="Kunci jawaban pilihan B"]')
        .attributes('data-state'),
    ).toBe('checked')
  })

  it('toggles several keys for multiple response', async () => {
    const wrapper = mountModel(
      ChoiceAnswer,
      emptyContent('MULTIPLE_RESPONSE') as MultipleResponseContent,
    )

    await wrapper.get('[aria-label="Kunci jawaban pilihan A"]').trigger('click')
    await wrapper.get('[aria-label="Kunci jawaban pilihan B"]').trigger('click')
    await flushPromises()

    expect(
      (wrapper.props('modelValue') as MultipleResponseContent).answer,
    ).toEqual({ keys: ['A', 'B'] })
  })
})

describe('TrueFalseAnswer', () => {
  it('switches the key to Salah', async () => {
    const wrapper = mountModel<TrueFalseContent>(TrueFalseAnswer, {
      answer: { value: true },
    })

    await wrapper.get('[aria-label="Kunci jawaban Salah"]').trigger('click')
    await flushPromises()

    expect(wrapper.props('modelValue')).toEqual({ answer: { value: false } })
  })
})

describe('ShortAnswer', () => {
  it('sends the accepted answers and the harakat switch as content.answer', async () => {
    const wrapper = mountModel<ShortAnswerContent>(
      ShortAnswer,
      emptyContent('SHORT_ANSWER') as ShortAnswerContent,
    )

    await wrapper.get('[aria-label="Jawaban benar 1"]').setValue('كِتَابٌ')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Tambah jawaban benar')!
      .trigger('click')
    await wrapper.get('[aria-label="Jawaban benar 2"]').setValue('buku')
    await wrapper.get('[aria-label="Abaikan harakat"]').trigger('click')
    await flushPromises()

    expect(wrapper.props('modelValue')).toEqual({
      answer: {
        accepted: ['كِتَابٌ', 'buku'],
        ignoreCase: true,
        ignoreHarakat: true,
      },
    })
  })

  it('keeps at least one answer', () => {
    const wrapper = mountModel<ShortAnswerContent>(
      ShortAnswer,
      emptyContent('SHORT_ANSWER') as ShortAnswerContent,
    )

    expect(
      wrapper
        .get('[aria-label="Hapus jawaban benar 1"]')
        .attributes('disabled'),
    ).toBeDefined()
  })
})
