import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardApi } from '../api/dashboardApi'
import DashboardView from './DashboardView.vue'

const held = vi.hoisted(() => ({ codes: [] as string[] }))

vi.mock('@mts241alikhlash/platform/auth', () => ({
  useRoleGuard: () => ({
    can: (...permissions: string[]) =>
      permissions.some((code) => held.codes.includes(code)),
  }),
}))

vi.mock('../api/dashboardApi', () => ({
  dashboardApi: {
    attendanceToday: vi.fn(),
    pendingLeaves: vi.fn(),
    mine: vi.fn(),
    employeeSummary: vi.fn(),
    latestPayslipPeriod: vi.fn(),
  },
}))

function render() {
  return mount(DashboardView, {
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
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(dashboardApi.attendanceToday).mockResolvedValue({
    present: 4,
    late: 2,
    onLeave: 1,
    notScanned: 3,
    date: '2026-11-05T00:00:00.000Z',
  })
  vi.mocked(dashboardApi.pendingLeaves).mockResolvedValue({ total: 7 })
  vi.mocked(dashboardApi.mine).mockResolvedValue({
    today: { status: 'PRESENT', clockIn: null, clockOut: null },
    leaveBalance: [{ leaveTypeName: 'Cuti Tahunan', remainingDays: 8 }],
  })
  vi.mocked(dashboardApi.employeeSummary).mockResolvedValue({
    activeTotal: 12,
    byEmploymentType: [{ name: 'Tetap', total: 9 }],
    byPositionCategory: [{ name: 'Guru', total: 10 }],
  })
  vi.mocked(dashboardApi.latestPayslipPeriod).mockResolvedValue({
    year: 2026,
    month: 10,
  })
})

describe('hr DashboardView', () => {
  it('shows no management card and calls no management endpoint with only read-own codes', async () => {
    held.codes = [
      'presence-records.read-own',
      'leave-requests.read-own',
      'payroll-payslips.read-own',
    ]
    const wrapper = render()
    await flushPromises()
    expect(wrapper.find('[data-testid="management-section"]').exists()).toBe(
      false,
    )
    expect(dashboardApi.attendanceToday).not.toHaveBeenCalled()
    expect(dashboardApi.pendingLeaves).not.toHaveBeenCalled()
    expect(dashboardApi.employeeSummary).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Cuti Tahunan')
    expect(wrapper.text()).toContain('Oktober 2026')
    expect(dashboardApi.mine).toHaveBeenCalledTimes(1)
  })

  it('shows the management section before mine for a holder of both', async () => {
    held.codes = [
      'presence-records.read',
      'employees.read',
      'leave-requests.read',
      'presence-records.read-own',
    ]
    const wrapper = render()
    await flushPromises()
    const html = wrapper.html()
    expect(html.indexOf('management-section')).toBeLessThan(
      html.indexOf('mine-section'),
    )
    expect(wrapper.text()).toContain('Pegawai Aktif')
    expect(wrapper.text()).toContain('12')
  })

  it('shows the error state of the failing card only', async () => {
    held.codes = ['presence-records.read', 'leave-requests.read']
    vi.mocked(dashboardApi.attendanceToday).mockRejectedValue(new Error('x'))
    const wrapper = render()
    await flushPromises()
    expect(wrapper.findAll('[data-testid="card-error"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Cuti Menunggu Persetujuan')
    expect(wrapper.text()).toContain('7')
  })

  it('shows the empty state when there is no approved payslip', async () => {
    held.codes = ['payroll-payslips.read-own']
    vi.mocked(dashboardApi.latestPayslipPeriod).mockResolvedValue(null)
    const wrapper = render()
    await flushPromises()
    expect(wrapper.find('[data-testid="card-empty"]').exists()).toBe(true)
  })
})
