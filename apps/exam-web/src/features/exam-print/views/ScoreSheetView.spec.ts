// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { rowActionProps } from '@/test/dataTableCards'
import type {
  OfflineRosterRow,
  OfflineSchedule,
} from '@/features/exam-offline/types'
import ScoreSheetView from './ScoreSheetView.vue'

const { service, printed } = vi.hoisted(() => ({
  service: { loadSchedules: vi.fn(), loadRoster: vi.fn() },
  printed: [] as { sheets: number; text: string; stacked: boolean }[],
}))

vi.mock('@/features/exam-offline/services/examOfflineService', () => ({
  examOfflineService: service,
}))
vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(),
}))
vi.mock('../printImages', () => ({
  waitForPrintImages: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), info: vi.fn() } }))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const stubs = {
  Tooltip: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
  LetterheadKop: true,
}

const schedule = (
  scheduleId: string,
  classroomName: string,
): OfflineSchedule => ({
  scheduleId,
  activityId: 'act',
  subjectName: 'Tafsir',
  classroomName,
  offlineKind: 'WRITTEN',
  maxScore: 50,
  startsAt: '2026-11-30T01:00:00.000Z',
  endsAt: '2026-11-30T02:30:00.000Z',
  registered: 2,
  scored: 0,
  absent: 1,
  missing: 1,
  published: 0,
})

const roster: OfflineRosterRow[] = [
  {
    studentId: 'a',
    participantNumber: '25-001',
    name: 'Ahmad',
    state: 'MISSING',
    rawScore: null,
    note: null,
    publication: null,
  },
  {
    studentId: 'b',
    participantNumber: '25-002',
    name: 'Budi',
    state: 'ABSENT',
    rawScore: null,
    note: null,
    publication: null,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  printed.length = 0
  service.loadSchedules.mockResolvedValue({
    success: true,
    data: [schedule('s1', 'VII A'), schedule('s2', 'VII B')],
  })
  service.loadRoster.mockResolvedValue({ success: true, data: roster })
  window.print = vi.fn(() => {
    printed.push({
      sheets: document.querySelectorAll('.print-only .score-sheet').length,
      text: document.querySelector('.print-only')?.textContent ?? '',
      stacked: document.body.classList.contains('printing-stack'),
    })
  })
})

const mountView = async () => {
  const wrapper = mount(ScoreSheetView, {
    global: { stubs },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('ScoreSheetView', () => {
  it('lists the offline exams with their kind', async () => {
    const wrapper = await mountView()
    const cells = wrapper
      .get('tbody tr')
      .findAll('td')
      .map((cell) => cell.text())
    expect(cells.slice(0, 3)).toEqual(['Tafsir', 'VII A', 'Written'])
  })

  it('prints the Score Sheet of one classroom from its row action', async () => {
    const wrapper = await mountView()
    rowActionProps(wrapper, schedule('s1', 'VII A')).onView()
    await flushPromises()
    expect(service.loadRoster).toHaveBeenCalledWith('s1')
    expect(printed).toHaveLength(1)
    expect(printed[0].sheets).toBe(1)
    expect(printed[0].stacked).toBe(true)
    expect(printed[0].text).toContain('Ahmad')
    expect(printed[0].text).toContain('TIDAK HADIR')
    expect(document.body.classList.contains('printing-stack')).toBe(false)
    wrapper.unmount()
  })

  it('prints one sheet per classroom for every listed exam', async () => {
    const wrapper = await mountView()
    await wrapper
      .findAll('button')
      .find((item) => item.text() === 'Cetak semua')!
      .trigger('click')
    await flushPromises()
    expect(service.loadRoster.mock.calls).toEqual([['s1'], ['s2']])
    expect(printed[0].sheets).toBe(2)
    wrapper.unmount()
  })
})
