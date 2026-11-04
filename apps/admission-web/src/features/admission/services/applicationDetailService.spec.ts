import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { admissionApi } from '../api/admissionApi'
import { useApplicationDetailStore } from '../stores/applicationDetailStore'
import { applicationDetailService } from './applicationDetailService'
import type { AdmissionApplication } from '../types'

vi.mock('../api/admissionApi', () => ({
  admissionApi: { getApplicationById: vi.fn() },
}))

vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

describe('applicationDetailService.fetchDetail', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('clears stale data and distinguishes 404 from load failure', async () => {
    const store = useApplicationDetailStore()
    store.application = { id: 'previous' } as AdmissionApplication
    vi.mocked(admissionApi.getApplicationById).mockRejectedValueOnce(
      Object.assign(new Error('offline'), { isAxiosError: true }),
    )

    await applicationDetailService.fetchDetail('next')
    expect(store.application).toBeNull()
    expect(store.error).toBe('load-failed')
    expect(store.loading).toBe(false)

    vi.mocked(admissionApi.getApplicationById).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    })
    await applicationDetailService.fetchDetail('missing')
    expect(store.application).toBeNull()
    expect(store.error).toBe('not-found')
    expect(store.loading).toBe(false)

    vi.mocked(admissionApi.getApplicationById).mockResolvedValueOnce({
      data: { data: { id: 'retried' } },
    } as never)
    await applicationDetailService.fetchDetail('retried')
    expect(store.application?.id).toBe('retried')
    expect(store.error).toBeNull()
  })

  it('keeps the newest detail when requests resolve out of order', async () => {
    type DetailResponse = Awaited<
      ReturnType<typeof admissionApi.getApplicationById>
    >
    const releases: ((value: DetailResponse) => void)[] = []
    vi.mocked(admissionApi.getApplicationById).mockImplementation(
      () => new Promise((resolve) => releases.push(resolve)),
    )

    const older = applicationDetailService.fetchDetail('A')
    const newer = applicationDetailService.fetchDetail('B')
    releases[1]({ data: { data: { id: 'B' } } } as DetailResponse)
    await newer
    releases[0]({ data: { data: { id: 'A' } } } as DetailResponse)
    await older

    const store = useApplicationDetailStore()
    expect(store.application?.id).toBe('B')
    expect(store.loading).toBe(false)
  })
})
