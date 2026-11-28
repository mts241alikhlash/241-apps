// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { rowActionProps } from '@/test/dataTableCards'
import type { OfflineSchedule } from '../types'
import OfflineScoreListView from './OfflineScoreListView.vue'

const { push, refresh, state } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  state: {} as {
    schedules: { value: unknown[] }
    loading: { value: boolean }
    listError: { value: string | null }
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: {}, query: {} }),
}))

vi.mock('../composables/useOfflineSchedules', () => ({
  useOfflineSchedules: () => ({ ...state, refresh }),
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const stubs = {
  Tooltip: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
}

const schedule: OfflineSchedule = {
  scheduleId: 's1',
  activityId: 'act',
  subjectName: 'Tafsir',
  classroomName: 'VII A',
  offlineKind: 'WRITTEN',
  maxScore: 50,
  startsAt: '2026-11-30T01:00:00.000Z',
  endsAt: '2026-11-30T02:30:00.000Z',
  registered: 30,
  scored: 20,
  absent: 2,
  missing: 8,
  published: 15,
}

beforeEach(() => {
  vi.clearAllMocks()
  state.schedules = ref<OfflineSchedule[]>([schedule])
  state.loading = ref(false)
  state.listError = ref<string | null>(null)
})

describe('OfflineScoreListView', () => {
  it('shows each offline exam with its kind and counts', async () => {
    const wrapper = mount(OfflineScoreListView, { global: { stubs } })
    await flushPromises()
    const firstRow = wrapper.get('tbody tr')
    const cells = firstRow.findAll('td').map((cell) => cell.text())
    expect(cells.slice(0, 3)).toEqual(['Tafsir', 'VII A', 'Written'])
    expect(cells.slice(6, 11)).toEqual(['50', '20', '2', '8', '15'])
  })

  it('opens the entry page from the row action and from a row click', async () => {
    const wrapper = mount(OfflineScoreListView, { global: { stubs } })
    await flushPromises()
    rowActionProps(wrapper, schedule).onView()
    expect(push).toHaveBeenCalledWith('/exam/offline-scores/s1')

    push.mockClear()
    await wrapper.get('tbody tr').trigger('click')
    expect(push).toHaveBeenCalledWith('/exam/offline-scores/s1')
  })

  it('explains an empty list', async () => {
    state.schedules.value = []
    const wrapper = mount(OfflineScoreListView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('Belum ada ujian offline untuk dinilai.')
  })

  it('shows a load error with a retry', async () => {
    state.listError.value = 'Gagal memuat ujian offline.'
    const wrapper = mount(OfflineScoreListView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Gagal memuat ujian offline.',
    )
    await wrapper.get('[role="alert"] button').trigger('click')
    expect(refresh).toHaveBeenCalled()
  })
})
