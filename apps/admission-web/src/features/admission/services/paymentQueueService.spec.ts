import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import { paymentQueueService } from './paymentQueueService'

vi.mock('../api/admissionApi', () => ({
  admissionApi: {
    getPaymentQueue: vi.fn(),
    getEligiblePaymentApplications: vi.fn(),
    verifyQueuePayment: vi.fn(),
    cancelPaymentVerification: vi.fn(),
    addPayment: vi.fn(),
  },
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function failure(status: number, message: string) {
  return { isAxiosError: true, response: { status, data: { message } } }
}

describe('paymentQueueService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads a tab with its counts', async () => {
    vi.mocked(admissionApi.getPaymentQueue).mockResolvedValue({
      data: {
        data: [{ applicationId: 'app1' }],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          counts: { pending: 1, verified: 0, rejected: 0 },
        },
      },
    } as never)

    const result = await paymentQueueService.fetchQueue({
      status: 'PENDING',
      page: 1,
      limit: 20,
    })

    expect(admissionApi.getPaymentQueue).toHaveBeenCalledWith({
      status: 'PENDING',
      page: 1,
      limit: 20,
    })
    expect(result).toMatchObject({
      rows: [{ applicationId: 'app1' }],
      total: 1,
      counts: { pending: 1, verified: 0, rejected: 0 },
    })
  })

  it('returns the load error', async () => {
    vi.mocked(admissionApi.getPaymentQueue).mockRejectedValue(
      Object.assign(new Error('offline'), { isAxiosError: true }),
    )

    const result = await paymentQueueService.fetchQueue({
      status: 'PENDING',
      page: 1,
      limit: 20,
    })

    expect(result).toHaveProperty('error')
  })

  it('verifies and toasts', async () => {
    vi.mocked(admissionApi.verifyQueuePayment).mockResolvedValue({} as never)

    await expect(paymentQueueService.verify('app1')).resolves.toEqual({
      success: true,
    })
    expect(admissionApi.verifyQueuePayment).toHaveBeenCalledWith('app1', {
      status: 'VERIFIED',
    })
    expect(toast.success).toHaveBeenCalledWith('Pembayaran diverifikasi.')
  })

  it('shows the full-wave message when verification is refused', async () => {
    vi.mocked(admissionApi.verifyQueuePayment).mockRejectedValue(
      failure(409, 'Gelombang penuh'),
    )

    await expect(paymentQueueService.verify('app1')).resolves.toEqual({
      success: false,
    })
    expect(toast.error).toHaveBeenCalledWith('Gelombang penuh')
  })

  it('rejects with the reason and cancels with the reason', async () => {
    vi.mocked(admissionApi.verifyQueuePayment).mockResolvedValue({} as never)
    vi.mocked(admissionApi.cancelPaymentVerification).mockResolvedValue(
      {} as never,
    )

    await paymentQueueService.reject('app1', 'Buram')
    await paymentQueueService.cancel('app1', 'Salah nominal')

    expect(admissionApi.verifyQueuePayment).toHaveBeenCalledWith('app1', {
      status: 'REJECTED',
      note: 'Buram',
    })
    expect(admissionApi.cancelPaymentVerification).toHaveBeenCalledWith(
      'app1',
      'Salah nominal',
    )
  })

  it('shows the 409 message when a decided application cannot be cancelled', async () => {
    vi.mocked(admissionApi.cancelPaymentVerification).mockRejectedValue(
      failure(
        409,
        'Pembayaran tidak bisa dibatalkan setelah pendaftaran diputuskan',
      ),
    )

    await expect(paymentQueueService.cancel('app1', 'x')).resolves.toEqual({
      success: false,
    })
    expect(toast.error).toHaveBeenCalledWith(
      'Pembayaran tidak bisa dibatalkan setelah pendaftaran diputuskan',
    )
  })

  it('adds a payment with its proof', async () => {
    vi.mocked(admissionApi.addPayment).mockResolvedValue({} as never)
    const file = new File(['x'], 'bukti.png', { type: 'image/png' })
    const payload = {
      applicationId: 'app1',
      bankAccountId: 'acc1',
      bankName: 'BSI',
      senderAccountName: 'Ahmad Fauzi',
      transferDate: '2026-10-01',
    }

    await expect(paymentQueueService.add(payload, file)).resolves.toEqual({
      success: true,
    })
    expect(admissionApi.addPayment).toHaveBeenCalledWith(payload, file)
    expect(toast.success).toHaveBeenCalledWith('Pembayaran ditambahkan.')
  })
})
