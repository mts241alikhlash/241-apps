// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useExamSession } from './useExamSession'
import type { AnswerRow } from '../logic/answerSync'

const service = vi.hoisted(() => ({
  getQuestions: vi.fn(),
  getAnswers: vi.fn(),
  saveAnswersBatch: vi.fn(),
  submit: vi.fn(),
  heartbeat: vi.fn(),
}))

vi.mock('../services/studentExamService', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  studentExamService: service,
}))

import { ExamApiError } from '../services/studentExamService'

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

function setup(
  options: { monotonic?: () => number; onExpired?: () => void } = {},
) {
  const storage = memoryStorage()
  const session = useExamSession({
    storage: () => storage,
    isOnline: () => true,
    newClientId: () => 'client-1',
    monotonic: options.monotonic,
    onExpired: options.onExpired,
  })
  return { session, storage }
}

const paper = {
  questions: [
    {
      id: 'q1',
      number: 1,
      type: 'MULTIPLE_CHOICE' as const,
      bodyHtml: '<p>x</p>',
      points: 1,
      choices: [
        { key: 'A' as const, html: 'A' },
        { key: 'B' as const, html: 'B' },
      ],
    },
  ],
  startedAt: '2026-11-01T01:00:00.000Z',
  minSubmitMinutes: 20,
  serverTime: '2026-11-01T01:05:00.000Z',
}

beforeEach(() => {
  service.getQuestions.mockReset()
  service.getAnswers.mockReset()
  service.saveAnswersBatch.mockReset()
  service.submit.mockReset()
  service.getQuestions.mockResolvedValue(paper)
  service.getAnswers.mockResolvedValue([])
})

describe('useExamSession clock', () => {
  it('keeps the countdown on the monotonic base when the wall clock moves', async () => {
    vi.useFakeTimers()
    try {
      let monotonic = 1_000
      const { session } = setup({ monotonic: () => monotonic })
      await session.load('s1')

      const deadline = Date.parse('2026-11-01T02:30:00.000Z')
      session.startClock(deadline, '2026-11-01T01:05:00.000Z')

      const before = session.remaining.value
      expect(before).toBe(85 * 60 * 1000)

      const wall = vi
        .spyOn(Date, 'now')
        .mockReturnValue(Date.parse('2026-11-01T03:05:00.000Z'))
      monotonic += 60_000
      vi.advanceTimersByTime(1_000)

      expect(session.remaining.value).toBe(before - 60_000)
      wall.mockRestore()
    } finally {
      vi.useRealTimers()
    }
  })

  it('locks the submit button until the minimum submit time passes', async () => {
    let monotonic = 0
    const { session } = setup({ monotonic: () => monotonic })
    await session.load('s1')

    const deadline = Date.parse('2026-11-01T02:30:00.000Z')
    session.startClock(deadline, '2026-11-01T01:00:00.000Z')

    expect(session.canSubmit.value).toBe(false)
    expect(session.submitGateMinutes.value).toBe(20)

    monotonic += 20 * 60 * 1000
    session.startClock(deadline, '2026-11-01T01:20:00.000Z')

    expect(session.canSubmit.value).toBe(true)
  })
})

describe('useExamSession submit', () => {
  it('keeps the carried answers pending when the server already closed the session', async () => {
    const { session, storage } = setup()
    await session.load('s1')
    session.answer(paper.questions[0], { key: 'B' })

    service.submit.mockResolvedValue({
      status: 'EXPIRED',
      submittedAt: null,
      confirmedAnswerCount: 0,
      answersStored: false,
      serverTime: '2026-11-01T01:30:00.000Z',
    })

    const result = await session.submit('s1')

    expect(result.answersStored).toBe(false)
    const stored = JSON.parse(
      storage.getItem('cbt:answers:s1') ?? '[]',
    ) as AnswerRow[]
    expect(stored).toHaveLength(1)
    expect(stored[0]?.syncState).not.toBe('SERVER_CONFIRMED')
    expect(session.sync.value.pendingCount).toBe(1)
  })

  it('marks the carried answers confirmed when the server stored them', async () => {
    const { session } = setup()
    await session.load('s1')
    session.answer(paper.questions[0], { key: 'B' })

    service.submit.mockResolvedValue({
      status: 'GRADED',
      submittedAt: '2026-11-01T01:30:00.000Z',
      confirmedAnswerCount: 1,
      answersStored: true,
      serverTime: '2026-11-01T01:30:00.000Z',
    })

    await session.submit('s1')

    expect(session.sync.value.pendingCount).toBe(0)
  })

  it('locks the answer controls while a submit is in flight', async () => {
    const { session } = setup()
    await session.load('s1')
    expect(session.answersLocked.value).toBe(false)
    expect(session.answer(paper.questions[0], { key: 'A' })).toBe(true)

    let resolveSubmit: (value: unknown) => void = () => undefined
    const gate = new Promise<unknown>((resolve) => {
      resolveSubmit = resolve
    })
    service.submit.mockReturnValue(gate)

    const inFlight = session.submit('s1')
    await Promise.resolve()

    expect(session.answersLocked.value).toBe(true)
    expect(session.answer(paper.questions[0], { key: 'B' })).toBe(false)

    resolveSubmit({
      status: 'GRADED',
      submittedAt: '2026-11-01T01:30:00.000Z',
      confirmedAnswerCount: 1,
      answersStored: true,
      serverTime: '2026-11-01T01:30:00.000Z',
    })
    await inFlight

    expect(session.answers.value.get('q1')).toEqual({ key: 'A' })
    expect(session.answersLocked.value).toBe(true)
  })
})

describe('useExamSession heartbeat', () => {
  const alive = {
    requiresTokenReentry: false,
    lockedByViolation: false,
    absentSince: null,
    serverTime: '2026-11-01T01:05:00.000Z',
  }

  beforeEach(() => {
    vi.useFakeTimers()
    service.heartbeat.mockReset()
    service.heartbeat.mockResolvedValue(alive)
    service.submit.mockReset()
    service.submit.mockResolvedValue({ answersStored: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('beats at the interval while open', async () => {
    const { session } = setup()
    session.startHeartbeat('s1', 30_000)

    await vi.advanceTimersByTimeAsync(29_999)
    expect(service.heartbeat).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(service.heartbeat).toHaveBeenCalledTimes(1)
    expect(service.heartbeat).toHaveBeenCalledWith('s1')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(service.heartbeat).toHaveBeenCalledTimes(2)
    session.stopHeartbeat()
  })

  it('falls back to the default interval when none is given', async () => {
    const { session } = setup()
    session.startHeartbeat('s1')

    await vi.advanceTimersByTimeAsync(14_999)
    expect(service.heartbeat).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(service.heartbeat).toHaveBeenCalledTimes(1)
    session.stopHeartbeat()
  })

  it('stops after submit', async () => {
    const { session } = setup()
    session.startHeartbeat('s1', 30_000)
    await session.submit('s1')
    service.heartbeat.mockClear()

    await vi.advanceTimersByTimeAsync(90_000)
    expect(service.heartbeat).not.toHaveBeenCalled()
  })

  it('stops on unmount', async () => {
    let session!: ReturnType<typeof setup>['session']
    const host = defineComponent({
      setup() {
        session = setup().session
        session.startHeartbeat('s1', 30_000)
        return () => h('div')
      },
    })
    const wrapper = mount(host)
    wrapper.unmount()
    service.heartbeat.mockClear()

    await vi.advanceTimersByTimeAsync(90_000)
    expect(service.heartbeat).not.toHaveBeenCalled()
  })

  it('reports token re-entry and stops beating', async () => {
    const onTokenReentry = vi.fn()
    const session = useExamSession({
      storage: () => memoryStorage(),
      isOnline: () => true,
      newClientId: () => 'client-1',
      onTokenReentry,
    })
    service.heartbeat.mockResolvedValue({
      ...alive,
      requiresTokenReentry: true,
    })

    session.startHeartbeat('s1', 30_000)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(onTokenReentry).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(90_000)
    expect(service.heartbeat).toHaveBeenCalledTimes(1)
  })
})

describe('useExamSession time up', () => {
  const serverTime = '2026-11-01T02:29:58.000Z'
  const deadline = Date.parse('2026-11-01T02:30:00.000Z')

  beforeEach(() => {
    vi.useFakeTimers()
    service.saveAnswersBatch.mockResolvedValue({
      confirmed: [],
      skipped: [],
      confirmedCount: 0,
      serverTime,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is not locked before the clock starts', async () => {
    const { session } = setup({ monotonic: () => Date.now() })
    await session.load('s1')

    expect(session.expired.value).toBe(false)
    expect(session.answersLocked.value).toBe(false)
  })

  it('locks the answers once the time is up', async () => {
    const onExpired = vi.fn()
    const { session } = setup({ monotonic: () => Date.now(), onExpired })
    await session.load('s1')
    session.startClock(deadline, serverTime)
    expect(session.answer(paper.questions[0], { key: 'A' })).toBe(true)

    await vi.advanceTimersByTimeAsync(2_000)

    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(session.expired.value).toBe(true)
    expect(session.answersLocked.value).toBe(true)
    expect(session.answer(paper.questions[0], { key: 'B' })).toBe(false)
    expect(session.answers.value.get('q1')).toEqual({ key: 'A' })
  })

  it('stops syncing single answers once the time is up', async () => {
    const { session } = setup({ monotonic: () => Date.now() })
    await session.load('s1')
    session.startClock(deadline, serverTime)
    await vi.advanceTimersByTimeAsync(1_000)
    session.answer(paper.questions[0], { key: 'A' })

    await vi.advanceTimersByTimeAsync(1_000)
    session.onConnectivityChanged(true)
    await vi.advanceTimersByTimeAsync(30_000)
    await session.syncNow()

    expect(service.saveAnswersBatch).not.toHaveBeenCalled()
    expect(session.sync.value.pendingCount).toBe(1)
  })

  it('treats a TIME_UP refusal of a save as the end of the working time', async () => {
    const onExpired = vi.fn()
    const { session } = setup({ monotonic: () => Date.now(), onExpired })
    await session.load('s1')
    session.startClock(Date.parse('2026-11-01T02:40:00.000Z'), serverTime)
    service.saveAnswersBatch.mockRejectedValue(
      new ExamApiError(
        'Waktu mengerjakan sudah habis. Kumpulkan jawaban.',
        'TIME_UP',
      ),
    )
    session.answer(paper.questions[0], { key: 'A' })

    await vi.advanceTimersByTimeAsync(1_500)

    expect(service.saveAnswersBatch).toHaveBeenCalledTimes(1)
    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(session.expired.value).toBe(true)
    expect(session.answersLocked.value).toBe(true)
    expect(session.error.value).toBeNull()
    expect(session.sync.value.pendingCount).toBe(1)

    await vi.advanceTimersByTimeAsync(30_000)
    expect(service.saveAnswersBatch).toHaveBeenCalledTimes(1)
  })
})
