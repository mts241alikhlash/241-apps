import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { myDashboardApi } from '../api/myDashboardApi'
import InstitutionDashboard from './InstitutionDashboard.vue'

vi.mock('../api/myDashboardApi', () => ({
  myDashboardApi: { getInstitutionDashboard: vi.fn() },
}))

function render() {
  return mount(InstitutionDashboard, {
    global: {
      plugins: [
        [
          VueQueryPlugin,
          {
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
          },
        ],
      ],
    },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('InstitutionDashboard', () => {
  it('renders the three cards from the institution endpoint', async () => {
    vi.mocked(myDashboardApi.getInstitutionDashboard).mockResolvedValue({
      data: {
        data: {
          semester: { id: 's', name: 'Ganjil' },
          scoreCompleteness: [
            {
              classroomId: 'c1',
              classroomName: '7A',
              filled: 15,
              expected: 20,
            },
          ],
          attendanceToday: {
            present: 30,
            sick: 2,
            permit: 1,
            absent: 0,
            date: '2026-11-05T00:00:00.000Z',
          },
          examScores: { published: 3, unpublished: 9 },
        },
      },
    } as never)
    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).toContain('7A')
    expect(wrapper.text()).toContain('15/20 (75%)')
    expect(wrapper.text()).toContain('Kehadiran Siswa Hari Ini')
    expect(wrapper.text()).toContain('Belum dipublikasikan')
    expect(myDashboardApi.getInstitutionDashboard).toHaveBeenCalledTimes(1)
  })

  it('shows the error state on every card when the endpoint fails and does not throw', async () => {
    vi.mocked(myDashboardApi.getInstitutionDashboard).mockRejectedValue(
      new Error('x'),
    )
    const wrapper = render()
    await flushPromises()
    expect(wrapper.findAll('[data-testid="card-error"]')).toHaveLength(3)
  })

  it('shows the empty state when there is no assessment this semester', async () => {
    vi.mocked(myDashboardApi.getInstitutionDashboard).mockResolvedValue({
      data: {
        data: {
          semester: null,
          scoreCompleteness: [],
          attendanceToday: {
            present: 0,
            sick: 0,
            permit: 0,
            absent: 0,
            date: '',
          },
          examScores: { published: 0, unpublished: 0 },
        },
      },
    } as never)
    const wrapper = render()
    await flushPromises()
    expect(wrapper.find('[data-testid="card-empty"]').exists()).toBe(true)
  })
})
