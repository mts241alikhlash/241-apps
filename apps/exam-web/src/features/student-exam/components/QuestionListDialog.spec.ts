// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import QuestionListDialog from './QuestionListDialog.vue'
import type { AnswerPayload, PaperQuestion } from '../types'

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { disabled: Boolean },
  emits: ['click'],
  template:
    '<button data-test="submit" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})
const stubs = {
  Dialog: passthrough,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  Button: button,
}

function question(
  id: string,
  type: PaperQuestion['type'],
  number: number,
): PaperQuestion {
  return { id, type, number, bodyHtml: '', choices: null, points: 1 }
}

const questions = [
  question('q1', 'MULTIPLE_CHOICE', 1),
  question('q2', 'ESSAY', 2),
  question('q3', 'MULTIPLE_CHOICE', 3),
]

function mountDialog(
  answers = new Map<string, AnswerPayload>(),
  extra: Record<string, unknown> = {},
) {
  return mount(QuestionListDialog, {
    props: {
      open: true,
      questions,
      answers,
      doubtful: new Set(['q2']),
      currentIndex: 0,
      ...extra,
    },
    global: { stubs },
  })
}

describe('QuestionListDialog', () => {
  it('groups questions by type in paper order and counts the answered ones', () => {
    const wrapper = mountDialog(new Map([['q3', { key: 'A' }]]))
    const sections = wrapper.findAll('section')
    expect(sections).toHaveLength(2)
    expect(sections[0].text()).toContain('Pilihan Ganda')
    expect(sections[0].text()).toContain('1 dari 2')
    expect(sections[0].findAll('button').map((b) => b.text())).toEqual([
      '1',
      '3',
    ])
    expect(sections[1].text()).toContain('Uraian')
    expect(sections[1].text()).toContain('0 dari 1')
    expect(wrapper.text()).toContain('Terjawab 1')
    expect(wrapper.text()).toContain('Ragu-ragu 1')
  })

  it('opens the picked question by its paper position and closes', async () => {
    const wrapper = mountDialog()
    await wrapper.findAll('section')[0].findAll('button')[1].trigger('click')
    expect(wrapper.emitted('go')).toEqual([[2]])
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('emits submit with the given label, and not when disabled', async () => {
    const wrapper = mountDialog(new Map(), { submitLabel: 'Kumpulkan (3 mnt)' })
    const submit = wrapper.get('[data-test="submit"]')
    expect(submit.text()).toBe('Kumpulkan (3 mnt)')
    await submit.trigger('click')
    expect(wrapper.emitted('submit')).toHaveLength(1)

    const locked = mountDialog(new Map(), { submitDisabled: true })
    expect(
      locked.get('[data-test="submit"]').attributes('disabled'),
    ).toBeDefined()
  })
})
