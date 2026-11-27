// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  startClock: vi.fn(),
  submit: vi.fn(),
  load: vi.fn(),
  refs: null as null | {
    loading: { value: boolean }
    error: { value: string | null }
    errorCode: { value: string | null }
    questions: { value: unknown[] }
  },
  options: null as null | Record<string, (...args: never[]) => unknown>,
}))

const router = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { sessionId: 's1' } }),
  useRouter: () => router,
}))

vi.mock('../composables/useExamSession', () => ({
  useExamSession: (options: Record<string, (...args: never[]) => unknown>) => {
    state.options = options
    const answers = ref(new Map<string, AnswerPayload>())
    const submitting = ref(false)
    const questions = ref<unknown[]>([question])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const errorCode = ref<string | null>(null)
    state.refs = { loading, error, errorCode, questions }
    return {
      questions,
      answers,
      loading,
      error,
      errorCode,
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
      startClock: state.startClock,
      stopClock: vi.fn(),
      load: state.load,
      answer: state.answer,
      submit: state.submit,
      startHeartbeat: state.startHeartbeat,
      syncNow: vi.fn(),
      onConnectivityChanged: vi.fn(),
      isAnswered: () => false,
    }
  },
}))

import { ExamApiError } from '../services/studentExamService'
import ExamSheetView from './ExamSheetView.vue'

beforeEach(() => {
  state.load.mockReset()
  state.load.mockResolvedValue(undefined)
  state.startClock.mockReset()
})

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

describe('ExamSheetView when time is up', () => {
  let wrapper: ReturnType<typeof mountView> | null = null

  function mountAttached() {
    wrapper = mount(ExamSheetView, {
      attachTo: document.body,
      global: {
        stubs: {
          QuestionListDialog: true,
          SessionQuestionHtml: true,
        },
      },
    })
    return wrapper
  }

  function dialog() {
    return document.body.querySelector('[role="dialog"][data-state="open"]')
  }

  function findButton(label: string, within = 'body') {
    return [...document.body.querySelectorAll(`${within} button`)].find(
      (node) => node.textContent?.trim() === label,
    ) as HTMLButtonElement | undefined
  }

  function retryButton() {
    return [...document.body.querySelectorAll('button')].find(
      (node) => node.textContent?.trim() === 'Kirim ulang',
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    state.submit.mockReset()
    vi.useFakeTimers()
    vi.stubEnv('VITE_SEB_QUIT_URL', '')
    window.sessionStorage.clear()
    storeSession()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('opens a dialog that cannot be dismissed while the answers are sent', async () => {
    state.submit.mockReturnValue(new Promise(() => undefined))
    mountAttached()
    await flushPromises()

    state.options!.onExpired()
    await flushPromises()

    expect(dialog()?.textContent).toContain('Waktu habis')
    expect(dialog()?.textContent).toContain('Jawaban sedang dikirim…')
    expect(state.submit).toHaveBeenCalledWith('s1')
    expect(document.body.querySelector('[data-slot="dialog-close"]')).toBeNull()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()

    expect(dialog()?.textContent).toContain('Waktu habis')
  })

  it('shows the error, offers Kirim ulang and retries on its own until it is sent', async () => {
    state.submit
      .mockRejectedValueOnce(new Error('Server sedang sibuk.'))
      .mockResolvedValueOnce({ answersStored: true })
    const view = mountAttached()
    await flushPromises()

    state.options!.onExpired()
    await flushPromises()

    const alert = document.body.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('Server sedang sibuk.')
    expect(retryButton()).toBeDefined()
    expect(dialog()?.textContent).toContain('Waktu habis')

    await vi.advanceTimersByTimeAsync(10_000)
    await flushPromises()

    expect(state.submit).toHaveBeenCalledTimes(2)
    expect(view.text()).toContain('Ujian sudah dikumpulkan')
    expect(dialog()).toBeNull()
  })

  it('sends again at once on Kirim ulang', async () => {
    state.submit
      .mockRejectedValueOnce(new Error('Server sedang sibuk.'))
      .mockResolvedValueOnce({ answersStored: true })
    const view = mountAttached()
    await flushPromises()
    state.options!.onExpired()
    await flushPromises()

    retryButton()!.click()
    await flushPromises()

    expect(state.submit).toHaveBeenCalledTimes(2)
    expect(view.text()).toContain('Ujian sudah dikumpulkan')
  })

  it('waits for the connection and sends when it is back', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    state.submit
      .mockRejectedValueOnce(new Error('Tidak dapat terhubung.'))
      .mockResolvedValueOnce({ answersStored: true })
    const view = mountAttached()
    await flushPromises()
    state.options!.onExpired()
    await flushPromises()

    expect(dialog()?.textContent).toContain('Menunggu koneksi…')

    onLine.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await flushPromises()

    expect(state.submit).toHaveBeenCalledTimes(2)
    expect(view.text()).toContain('Ujian sudah dikumpulkan')
    onLine.mockRestore()
  })

  it('shows the finished state when the server already closed the session', async () => {
    state.submit.mockResolvedValueOnce({ answersStored: false })
    const view = mountAttached()
    await flushPromises()

    state.options!.onExpired()
    await flushPromises()

    expect(view.text()).toContain('Ujian sudah dikumpulkan')
    expect(view.text()).toContain('Jawaban terakhir belum tersimpan')
    expect(dialog()).toBeNull()
  })

  it('sends after a manual submit that was in flight at time up fails', async () => {
    let failManual: (cause: unknown) => void = () => undefined
    state.submit
      .mockReturnValueOnce(
        new Promise((_, reject) => {
          failManual = reject
        }),
      )
      .mockResolvedValueOnce({ answersStored: true })
    const view = mountAttached()
    await flushPromises()
    findButton('Kumpulkan')!.click()
    await flushPromises()
    findButton('Kumpulkan', '[role="dialog"]')!.click()
    await flushPromises()

    state.options!.onExpired()
    await flushPromises()
    failManual(new Error('Server sedang sibuk.'))
    await flushPromises()
    await vi.advanceTimersByTimeAsync(10_000)
    await flushPromises()

    expect(state.submit).toHaveBeenCalledTimes(2)
    expect(view.text()).toContain('Ujian sudah dikumpulkan')
  })

  it('waits for the paper and the local answers before it sends after a reload', async () => {
    let finishLoad: () => void = () => undefined
    state.load.mockImplementation(() => {
      state.refs!.loading.value = true
      return new Promise<void>((resolve) => {
        finishLoad = () => {
          state.refs!.loading.value = false
          resolve()
        }
      })
    })
    state.startClock.mockImplementation(() => {
      state.refs!.loading.value = true
      state.options!.onExpired()
    })
    state.submit.mockResolvedValue({ answersStored: true })
    const view = mountAttached()
    await flushPromises()

    expect(dialog()?.textContent).toContain('Waktu habis')
    expect(state.submit).not.toHaveBeenCalled()

    finishLoad()
    await flushPromises()

    expect(state.submit).toHaveBeenCalledTimes(1)
    expect(view.text()).toContain('Ujian sudah dikumpulkan')
  })

  it('finishes without an empty hand-in when the paper load answers SESSION_LOST', async () => {
    state.load.mockImplementation(() => {
      state.refs!.questions.value = []
      state.refs!.error.value = 'Waktu ujian sudah berakhir'
      state.refs!.errorCode.value = 'SESSION_LOST'
      return Promise.resolve()
    })
    const view = mountAttached()
    await flushPromises()

    state.options!.onExpired()
    await flushPromises()

    expect(state.submit).not.toHaveBeenCalled()
    expect(view.text()).toContain('Ujian sudah dikumpulkan')
    expect(view.text()).toContain('Jawaban terakhir belum tersimpan')
  })

  it('keeps Kirim ulang but stops retrying on a gate error', async () => {
    state.submit.mockRejectedValue(
      new ExamApiError(
        'Sesi terkunci karena pelanggaran. Hubungi Teknisi Ruangan',
        'SESSION_LOCKED_BY_VIOLATION',
      ),
    )
    mountAttached()
    await flushPromises()

    state.options!.onExpired()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(120_000)

    expect(state.submit).toHaveBeenCalledTimes(1)
    expect(
      document.body.querySelector('[role="alert"]')?.textContent,
    ).toContain('Sesi terkunci karena pelanggaran')
    expect(retryButton()).toBeDefined()
  })

  it('shows the finished text and closes the dialog before it leaves for the quit URL', async () => {
    vi.stubEnv('VITE_SEB_QUIT_URL', 'https://quit.example/done')
    const seen: { open: boolean; text: string }[] = []
    const view = mountAttached()
    const assign = vi.fn(() => {
      seen.push({ open: dialog() !== null, text: view.text() })
    })
    vi.stubGlobal('location', { ...window.location, assign })
    state.submit.mockResolvedValue({ answersStored: true })
    await flushPromises()

    state.options!.onExpired()
    await flushPromises()

    expect(assign).toHaveBeenCalledWith('https://quit.example/done')
    expect(seen[0]?.open).toBe(false)
    expect(seen[0]?.text).toContain('Ujian sudah dikumpulkan')
  })

  it('announces the send status in one live region that stays in place', async () => {
    state.submit.mockRejectedValueOnce(new Error('Server sedang sibuk.'))
    mountAttached()
    await flushPromises()

    state.options!.onExpired()
    const live = () => document.body.querySelector('[aria-live="polite"]')
    await vi.waitFor(() => expect(live()).not.toBeNull())
    const before = live()
    await flushPromises()

    expect(live()).toBe(before)
    expect(live()?.textContent).toContain(
      'Jawaban akan dikirim ulang otomatis.',
    )
  })

  it('stores a new deadline from the server for a reload', () => {
    mountAttached()

    state.options!.onDeadlineChanged(
      ...([2_000_000_600_000, '2026-11-01T02:29:59.000Z'] as never[]),
    )

    const stored = JSON.parse(
      window.sessionStorage.getItem('cbt:deadline:s1') ?? '{}',
    ) as { deadline: number; serverTime: number }
    expect(stored.deadline).toBe(2_000_000_600_000)
    expect(stored.serverTime).toBe(Date.parse('2026-11-01T02:29:59.000Z'))
  })
})
