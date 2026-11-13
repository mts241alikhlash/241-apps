// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { listExams, startSession, activeSebConfigs, resume, replace } =
  vi.hoisted(() => ({
    listExams: vi.fn(),
    startSession: vi.fn(),
    activeSebConfigs: vi.fn(),
    resume: vi.fn(),
    replace: vi.fn(),
  }))

const routeQuery: Record<string, string> = {}

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { scheduleId: 'sch1' }, query: routeQuery }),
  useRouter: () => ({ replace }),
}))

vi.mock('../services/studentExamService', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  studentExamService: { listExams, startSession, activeSebConfigs, resume },
}))

import { SebOutdatedError } from '@/shared/seb'
import { ExamApiError } from '../services/studentExamService'
import SebRequiredView from './SebRequiredView.vue'
import ExamTokenView from './ExamTokenView.vue'

const exam = {
  id: 'sch1',
  title: 'Matematika',
  durationMinutes: 60,
  status: 'OPEN',
}

async function mountAndStart(error: unknown) {
  listExams.mockResolvedValue([exam])
  startSession.mockRejectedValue(error)
  const wrapper = mount(ExamTokenView)
  await flushPromises()
  await wrapper.find('input').setValue('ABC123')
  await wrapper
    .findAll('button')
    .find((node) => node.text() === 'Mulai Ujian')!
    .trigger('click')
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  activeSebConfigs.mockResolvedValue([])
  delete routeQuery.resume
  sessionStorage.clear()
})

describe('ExamTokenView Safe Exam Browser', () => {
  it('shows the server message and opens the SEB guide on SEB_REQUIRED', async () => {
    const wrapper = await mountAndStart(
      new ExamApiError(
        'Ujian hanya bisa dibuka dengan Safe Exam Browser.',
        'SEB_REQUIRED',
      ),
    )

    expect(wrapper.text()).toContain(
      'Ujian hanya bisa dibuka dengan Safe Exam Browser.',
    )
    const guide = wrapper
      .findAll('button')
      .find((node) => node.text() === 'Panduan Safe Exam Browser')
    expect(guide).toBeDefined()

    await guide!.trigger('click')

    expect(wrapper.findComponent(SebRequiredView).exists()).toBe(true)
  })

  it('shows the update message on SebOutdatedError', async () => {
    const wrapper = await mountAndStart(new SebOutdatedError())

    expect(wrapper.text()).toContain(
      'Perbarui Safe Exam Browser ke versi terbaru.',
    )
  })

  it('resumes the session in resume mode and returns to the sheet', async () => {
    routeQuery.resume = 's1'
    listExams.mockResolvedValue([exam])
    resume.mockResolvedValue({
      deadline: '2026-11-01T02:00:00.000Z',
      serverTime: '2026-11-01T01:05:00.000Z',
      requiresTokenReentry: false,
    })
    const wrapper = mount(ExamTokenView)
    await flushPromises()
    await wrapper.find('input').setValue('ABC123')
    await wrapper
      .findAll('button')
      .find((node) => node.text() === 'Lanjutkan Ujian')!
      .trigger('click')
    await flushPromises()

    expect(startSession).not.toHaveBeenCalled()
    expect(resume).toHaveBeenCalledWith('s1', 'ABC123')
    expect(replace).toHaveBeenCalledWith({
      name: 'student-exam-sheet',
      params: { sessionId: 's1' },
    })
  })
})
