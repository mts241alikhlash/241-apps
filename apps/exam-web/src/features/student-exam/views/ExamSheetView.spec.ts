// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
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
  startHeartbeat: vi.fn(),
  submit: vi.fn(),
  options: null as null | Record<string, () => unknown>,
}))

const router = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { sessionId: 's1' } }),
  useRouter: () => router,
}))

vi.mock('../composables/useExamSession', () => ({
  useExamSession: (options: Record<string, () => unknown>) => {
    state.options = options
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
      submit: state.submit,
      startHeartbeat: state.startHeartbeat,
      syncNow: vi.fn(),
      onConnectivityChanged: vi.fn(),
      isAnswered: () => false,
    }
  },
}))

import ExamSheetView from './ExamSheetView.vue'

function storeSession(extra: Record<string, unknown> = {}) {
  window.sessionStorage.setItem(
    'cbt:deadline:s1',
    JSON.stringify({
      deadline: 2_000_000_000_000,
      serverTime: 1_999_999_000_000,
      scheduleId: 'sch1',
      heartbeatIntervalMs: 30_000,
      ...extra,
    }),
  )
}

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

describe('ExamSheetView keeps the session alive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    vi.unstubAllEnvs()
  })

  it('starts the heartbeat at the policy interval', async () => {
    storeSession()
    mountView()
    await flushPromises()

    expect(state.startHeartbeat).toHaveBeenCalledWith('s1', 30_000)
  })

  it('sends the student to the token resume mode on token re-entry', () => {
    storeSession()
    mountView()

    state.options!.onTokenReentry()

    expect(router.replace).toHaveBeenCalledWith({
      name: 'student-exam-token',
      params: { scheduleId: 'sch1' },
      query: { resume: 's1' },
    })
  })

  it('navigates to the quit URL after submit when it is set', async () => {
    vi.stubEnv('VITE_SEB_QUIT_URL', 'https://quit.example/done')
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    storeSession()
    state.submit.mockResolvedValue({ answersStored: true })
    mountView()

    state.options!.onExpired()
    await flushPromises()

    expect(assign).toHaveBeenCalledWith('https://quit.example/done')
    vi.unstubAllGlobals()
  })

  it('shows the finished state after submit when the quit URL is empty', async () => {
    vi.stubEnv('VITE_SEB_QUIT_URL', '')
    storeSession()
    state.submit.mockResolvedValue({ answersStored: true })
    const wrapper = mountView()

    state.options!.onExpired()
    await flushPromises()

    expect(wrapper.text()).toContain('Ujian sudah dikumpulkan')
  })
})
