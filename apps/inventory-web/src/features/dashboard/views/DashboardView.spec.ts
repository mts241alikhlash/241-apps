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
    assets: vi.fn(),
    loans: vi.fn(),
    pendingApprovals: vi.fn(),
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
  vi.mocked(dashboardApi.assets).mockResolvedValue({
    total: 9,
    byStatus: [{ name: 'Tersedia', total: 7 }],
    byCondition: [{ name: 'Baik', total: 9 }],
  })
  vi.mocked(dashboardApi.loans).mockResolvedValue({ active: 3, overdue: 1 })
  vi.mocked(dashboardApi.pendingApprovals).mockResolvedValue(4)
})

describe('inventory DashboardView', () => {
  it('renders no card and calls no endpoint without any inventory code', async () => {
    held.codes = []
    const wrapper = render()
    await flushPromises()
    expect(wrapper.find('[data-testid]').exists()).toBe(false)
    expect(dashboardApi.assets).not.toHaveBeenCalled()
    expect(dashboardApi.loans).not.toHaveBeenCalled()
    expect(dashboardApi.pendingApprovals).not.toHaveBeenCalled()
  })

  it('renders only the cards whose code is held', async () => {
    held.codes = ['inventory-loans.read']
    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).toContain('Sedang dipinjam')
    expect(wrapper.text()).not.toContain('Ringkasan Aset')
    expect(dashboardApi.assets).not.toHaveBeenCalled()
  })

  it('shows the error state of the failing card only', async () => {
    held.codes = ['inventory-assets.read', 'inventory-loans.read']
    vi.mocked(dashboardApi.assets).mockRejectedValue(new Error('x'))
    const wrapper = render()
    await flushPromises()
    expect(wrapper.findAll('[data-testid="card-error"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Terlambat')
  })

  it('shows the pending approvals count', async () => {
    held.codes = ['inventory-approvals.read']
    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).toContain('4')
  })
})
