// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import type { AnswerPayload, PaperQuestion } from '../types'

const hoisted = vi.hoisted(() => ({
  listExams: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  answer: vi.fn(),
  submit: vi.fn(),
  questions: { value: [] as PaperQuestion[] },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { sessionId: 's1', scheduleId: 'sch1' },
    query: {},
  }),
  useRouter: () => ({ push: hoisted.push, replace: hoisted.replace }),
}))

vi.mock('../services/studentExamService', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  studentExamService: {
    listExams: hoisted.listExams,
    startSession: vi.fn(),
    activeSebConfigs: vi.fn(() => Promise.resolve([])),
    resume: vi.fn(),
  },
}))

vi.mock('../composables/useExamSession', () => ({
  useExamSession: () => {
    const answers = ref(new Map<string, AnswerPayload>())
    return {
      questions: ref(hoisted.questions.value),
      answers,
      loading: ref(false),
      error: ref(null),
      remainingLabel: computed(() => '42:00'),
      answeredCount: computed(() => 0),
      sync: computed(() => ({
        totalAnswered: 0,
        confirmedCount: 0,
        pendingCount: 0,
      })),
      syncSummaryLabel: computed(() => 'Tersimpan: 0 soal'),
      submitGateSeconds: ref(0),
      submitGateMinutes: computed(() => 0),
      canSubmit: computed(() => true),
      answersLocked: computed(() => false),
      startClock: vi.fn(),
      stopClock: vi.fn(),
      load: vi.fn(() => Promise.resolve()),
      answer: hoisted.answer,
      submit: hoisted.submit,
      startHeartbeat: vi.fn(),
      onConnectivityChanged: vi.fn(),
    }
  },
}))

import ExamListView from './ExamListView.vue'
import ExamSheetView from './ExamSheetView.vue'
import ExamTokenView from './ExamTokenView.vue'

function setWidth(px: number) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === '(min-width: 768px)' ? px >= 768 : false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
    }),
  })
}

function question(id: string, number: number): PaperQuestion {
  return {
    id,
    number,
    type: 'MULTIPLE_CHOICE',
    bodyHtml: `<p>Soal ${number}</p>`,
    points: 1,
    choices: [
      { key: 'A', html: 'Pilihan A' },
      { key: 'B', html: 'Pilihan B' },
    ],
  }
}

function accessibleName(node: {
  attributes: (name: string) => string | undefined
  text: () => string
}) {
  return (node.attributes('aria-label') ?? node.text()).trim()
}

beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  hoisted.questions.value = [
    question('q1', 1),
    question('q2', 2),
    question('q3', 3),
  ]
  setWidth(390)
})

describe('ExamListView', () => {
  it('groups exams by category and shows a card with a status label for each', async () => {
    hoisted.listExams.mockResolvedValue([
      {
        id: 'a',
        title: 'UTS Matematika',
        type: 'MIDTERM',
        category: 'EXAM',
        status: 'OPEN',
        durationMinutes: 60,
        startsAt: '2026-11-13T01:00:00Z',
        endsAt: '2026-11-13T03:00:00Z',
      },
      {
        id: 'b',
        title: 'Tugas Bahasa',
        type: 'ASSIGNMENT',
        category: 'NON_EXAM',
        status: 'UPCOMING',
        durationMinutes: 30,
        startsAt: '2026-11-14T01:00:00Z',
        endsAt: '2026-11-14T02:00:00Z',
      },
      {
        id: 'c',
        title: 'UAS IPA',
        type: 'FINAL',
        category: 'EXAM',
        status: 'IN_PROGRESS',
        durationMinutes: 90,
        startsAt: '2026-11-13T01:00:00Z',
        endsAt: '2026-11-13T04:00:00Z',
      },
    ])
    const wrapper = mount(ExamListView)
    await flushPromises()

    const headings = wrapper.findAll('h2').map((node) => node.text())
    expect(headings).toEqual(['Ujian', 'Tugas & Ulangan'])

    const cards = wrapper.findAll('article')
    expect(cards).toHaveLength(3)
    expect(cards[0].text()).toContain('Sedang dibuka')
    expect(cards[1].text()).toContain('Sedang berlangsung')
    expect(cards[2].text()).toContain('Belum dibuka')
  })

  it('gives every control an accessible name', async () => {
    hoisted.listExams.mockResolvedValue([
      {
        id: 'a',
        title: 'UTS Matematika',
        type: 'MIDTERM',
        category: 'EXAM',
        status: 'OPEN',
        durationMinutes: 60,
        startsAt: '2026-11-13T01:00:00Z',
        endsAt: '2026-11-13T03:00:00Z',
      },
    ])
    const wrapper = mount(ExamListView)
    await flushPromises()

    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)
    buttons.forEach((node) => expect(accessibleName(node)).not.toBe(''))
  })
})

describe('ExamTokenView', () => {
  beforeEach(() => {
    hoisted.listExams.mockResolvedValue([
      {
        id: 'sch1',
        title: 'Matematika',
        type: 'DAILY',
        category: 'NON_EXAM',
        status: 'OPEN',
        durationMinutes: 60,
      },
    ])
  })

  it('shows the Token Ujian card with one input and the Mulai Ujian button', async () => {
    const wrapper = mount(ExamTokenView)
    await flushPromises()

    expect(wrapper.text()).toContain('Token Ujian')
    expect(wrapper.findAll('input')).toHaveLength(1)
    const start = wrapper
      .findAll('button')
      .find((node) => node.text() === 'Mulai Ujian')
    expect(start).toBeDefined()
    wrapper
      .findAll('button')
      .forEach((node) => expect(accessibleName(node)).not.toBe(''))
  })
})

describe('ExamSheetView layout', () => {
  it('at 390 px shows one question, the controls, and opens the number list as a dialog', async () => {
    setWidth(390)
    const wrapper = mount(ExamSheetView, {
      attachTo: document.body,
      global: { stubs: { SessionQuestionHtml: true } },
    })
    await flushPromises()

    expect(wrapper.findAll('[data-testid="question-nav-panel"]')).toHaveLength(
      0,
    )
    expect(wrapper.text()).toContain('Soal 1')
    const labels = wrapper.findAll('button').map((node) => node.text())
    expect(labels).toContain('Sebelumnya')
    expect(labels).toContain('Selanjutnya')
    expect(labels).toContain('Ragu-ragu')

    const list = wrapper
      .findAll('button')
      .find((node) => node.text() === 'Daftar Soal')
    expect(list).toBeDefined()
    await list!.trigger('click')
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('at 1280 px renders the number panel inline beside the question', async () => {
    setWidth(1280)
    const wrapper = mount(ExamSheetView, {
      global: { stubs: { SessionQuestionHtml: true } },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="question-nav-panel"]').exists()).toBe(
      true,
    )
    expect(
      wrapper.findAll('button').find((node) => node.text() === 'Daftar Soal'),
    ).toBeUndefined()
  })

  it('changes the question with ArrowRight and ArrowLeft', async () => {
    setWidth(1280)
    const wrapper = mount(ExamSheetView, {
      global: { stubs: { SessionQuestionHtml: true } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Soal 1')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await flushPromises()
    expect(wrapper.text()).toContain('Soal 2')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await flushPromises()
    expect(wrapper.text()).toContain('Soal 1')
    wrapper.unmount()
  })

  it('gives every control an accessible name at 1280 px', async () => {
    setWidth(1280)
    const wrapper = mount(ExamSheetView, {
      global: { stubs: { SessionQuestionHtml: true } },
    })
    await flushPromises()

    wrapper
      .findAll('button')
      .forEach((node) => expect(accessibleName(node)).not.toBe(''))
    wrapper.unmount()
  })
})
