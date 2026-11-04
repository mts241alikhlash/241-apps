import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { admissionApi } from '../api/admissionApi'
import { useMyApplicationStore } from '../stores/myApplicationStore'
import { myApplicationService } from './myApplicationService'
import type { AdmissionApplication } from '../types'

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api/admissionApi', () => ({
  admissionApi: {
    getMyApplication: vi.fn(),
    getMyNotifications: vi.fn(),
    getAnnouncements: vi.fn(),
  },
}))

describe('myApplicationService.fetchDashboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('reads notifications from data and the unread count from meta', async () => {
    const notification = { id: 'n-1', title: 'Diterima', readAt: null }
    vi.mocked(admissionApi.getMyApplication).mockResolvedValue({
      data: { data: { id: 'app-1' } },
    } as never)
    vi.mocked(admissionApi.getMyNotifications).mockResolvedValue({
      data: { data: [notification], meta: { unreadCount: 1 } },
    } as never)
    vi.mocked(admissionApi.getAnnouncements).mockResolvedValue({
      data: { data: [] },
    } as never)

    await myApplicationService.fetchDashboard()

    const store = useMyApplicationStore()
    expect(store.notifications).toEqual([notification])
    expect(store.unreadCount).toBe(1)
  })

  it('clears stale application on network failure and reports load failure', async () => {
    const store = useMyApplicationStore()
    store.application = { id: 'previous' } as AdmissionApplication
    vi.mocked(admissionApi.getMyApplication).mockRejectedValueOnce(
      new Error('offline'),
    )
    await myApplicationService.fetchDashboard()
    expect(store.application).toBeNull()
    expect(store.dashboardError).toBe('load-failed')
    expect(store.loading).toBe(false)
  })

  it('classifies only application 404 as not-found', async () => {
    const missing = Object.assign(new Error('missing'), {
      isAxiosError: true,
      response: { status: 404 },
    })
    vi.mocked(admissionApi.getMyApplication).mockRejectedValueOnce(missing)
    await myApplicationService.fetchDashboard()
    expect(useMyApplicationStore().dashboardError).toBe('not-found')
    vi.mocked(admissionApi.getMyApplication).mockRejectedValueOnce(missing)
    await myApplicationService.fetchMyApplication()
    expect(useMyApplicationStore().formError).toBe('not-found')
  })

  it('keeps application when notifications fail with 404', async () => {
    vi.mocked(admissionApi.getMyApplication).mockResolvedValue({
      data: { data: { id: 'current' } },
    } as never)
    vi.mocked(admissionApi.getMyNotifications).mockRejectedValueOnce(
      Object.assign(new Error('missing'), {
        isAxiosError: true,
        response: { status: 404 },
      }),
    )
    vi.mocked(admissionApi.getAnnouncements).mockResolvedValue({
      data: { data: [] },
    } as never)
    await myApplicationService.fetchDashboard()
    const store = useMyApplicationStore()
    expect(store.application?.id).toBe('current')
    expect(store.dashboardError).toBeNull()
    expect(store.notificationsError).toBe(true)
    expect(store.announcementsError).toBe(false)
    vi.mocked(admissionApi.getMyApplication).mockRejectedValueOnce(
      new Error('offline'),
    )
    await myApplicationService.fetchMyApplication()
    expect(store.application?.id).toBe('current')
    expect(store.formError).toBe('load-failed')
  })
})
