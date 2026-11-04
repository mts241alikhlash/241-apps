// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import type { AnswerPayload, PaperQuestion } from '../types'

const question: PaperQuestion = {
  id: 'q1',
  number: 1,
  type: 'MULTIPLE_CHOICE',
  bodyHtml: '<p>x</p>',
  points: 1,
  choices: [
    { key: 'A', html: 'A' },
    { key: 'B', html: 'B' },
  ],
}

const state = vi.hoisted(() => ({
  answersLocked: { value: false },
  answer: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { sessionId: 's1' } }),
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock('../composables/useExamSession', () => ({
  useExamSession: () => {
    const answers = ref(new Map<string, AnswerPayload>())
    const submitting = ref(false)
    return {
      questions: ref([question]),
      answers,
      loading: ref(false),
      error: ref(null),
      submitted: ref(false),
      remaining: ref(600_000),
      remainingLabel: computed(() => '10:00'),
      answeredCount: computed(() => 0),
      expired: computed(() => false),
      sync: computed(() => ({
        totalAnswered: 0,
        confirmedCount: 0,
        pendingCount: 0,
      })),
      syncSummaryLabel: computed(() => 'Tersimpan: 0 soal'),
      submitGateSeconds: ref(0),
      submitGateMinutes: computed(() => 0),
      canSubmit: computed(() => true),
      answersLocked: computed(() => state.answersLocked.value),
      submitting,
      startClock: vi.fn(),
      stopClock: vi.fn(),
      load: vi.fn(() => Promise.resolve()),
      answer: state.answer,
      submit: vi.fn(),
      syncNow: vi.fn(),
      onConnectivityChanged: vi.fn(),
      isAnswered: () => false,
    }
  },
}))

import ExamSheetView from './ExamSheetView.vue'

function mountView() {
  return mount(ExamSheetView, {
    global: {
      stubs: {
        QuestionListDialog: true,
        SessionQuestionHtml: true,
      },
    },
  })
}

function optionButtons(wrapper: ReturnType<typeof mountView>) {
  return wrapper
    .findAll('button')
    .filter((node) => ['A', 'B'].includes(node.text().slice(0, 1)))
}

describe('ExamSheetView answer controls', () => {
  it('leaves the options tappable while no submit is running', () => {
    state.answersLocked.value = false
    const wrapper = mountView()

    const buttons = optionButtons(wrapper)
    expect(buttons.length).toBeGreaterThan(0)
    expect(
      buttons.every((node) => node.attributes('disabled') === undefined),
    ).toBe(true)

    void buttons[0]?.trigger('click')
    expect(state.answer).toHaveBeenCalledWith(question, { key: 'A' })
  })

  it('disables the options while a submit is in flight', () => {
    state.answersLocked.value = true
    const wrapper = mountView()

    const buttons = optionButtons(wrapper)
    expect(buttons.length).toBeGreaterThan(0)
    expect(
      buttons.every((node) => node.attributes('disabled') !== undefined),
    ).toBe(true)

    state.answersLocked.value = false
  })
})
