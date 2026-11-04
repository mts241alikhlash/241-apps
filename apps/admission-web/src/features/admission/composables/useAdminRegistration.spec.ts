import { beforeEach, expect, it, vi } from 'vitest'
import { useAdminRegistration } from './useAdminRegistration'
import { admissionApi } from '../api/admissionApi'

vi.mock('../api/admissionApi', () => ({
  admissionApi: {
    adminRegisterApplicant: vi.fn(),
    getApplicationById: vi.fn(),
  },
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

it('distinguishes fetch failure, 404 and successful retry without creating another account', async () => {
  vi.mocked(admissionApi.adminRegisterApplicant).mockResolvedValue({
    data: {
      data: {
        id: 'a-1',
        identifier: 'test@example.org',
        registrationNumber: 'REG-1',
      },
    },
  } as never)
  const registration = useAdminRegistration()
  await registration.registerApplicant({ password: 'not-for-logging' } as never)
  vi.mocked(admissionApi.getApplicationById).mockRejectedValueOnce(
    Object.assign(new Error('offline'), { isAxiosError: true }),
  )
  expect(await registration.fetchApplication()).toBeNull()
  expect(registration.fetchError.value).toBe('load-failed')
  vi.mocked(admissionApi.getApplicationById).mockRejectedValueOnce(
    Object.assign(new Error('missing'), {
      isAxiosError: true,
      response: { status: 404 },
    }),
  )
  await registration.fetchApplication()
  expect(registration.fetchError.value).toBe('not-found')
  vi.mocked(admissionApi.getApplicationById).mockResolvedValueOnce({
    data: { data: { id: 'a-1' } },
  } as never)
  expect((await registration.fetchApplication())?.id).toBe('a-1')
  expect(registration.fetchError.value).toBeNull()
  expect(admissionApi.adminRegisterApplicant).toHaveBeenCalledTimes(1)
  registration.reset()
  expect(registration.fetchError.value).toBeNull()
})
