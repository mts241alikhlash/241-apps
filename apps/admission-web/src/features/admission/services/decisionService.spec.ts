import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import { decisionService } from './decisionService'

vi.mock('../api/admissionApi', () => ({
  admissionApi: {
    getDecisionQueue: vi.fn(),
    acceptDecision: vi.fn(),
    rejectDecision: vi.fn(),
    acceptManyDecisions: vi.fn(),
    cancelAcceptance: vi.fn(),
    cancelRejection: vi.fn(),
  },
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function failure(status: number, message: string) {
  return { isAxiosError: true, response: { status, data: { message } } }
}

describe('decisionService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads a tab with its counts', async () => {
    vi.mocked(admissionApi.getDecisionQueue).mockResolvedValue({
      data: {
        data: [{ applicationId: 'app1' }],
        meta: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          counts: { waiting: 1, accepted: 2, rejected: 3 },
        },
      },
    } as never)

    const result = await decisionService.fetchQueue({
      tab: 'waiting',
      page: 1,
      limit: 50,
    })

    expect(admissionApi.getDecisionQueue).toHaveBeenCalledWith({
      tab: 'waiting',
      page: 1,
      limit: 50,
    })
    expect(result).toEqual({
      rows: [{ applicationId: 'app1' }],
      total: 1,
      counts: { waiting: 1, accepted: 2, rejected: 3 },
    })
  })

  it('returns the load error', async () => {
    vi.mocked(admissionApi.getDecisionQueue).mockRejectedValue(
      Object.assign(new Error('offline'), { isAxiosError: true }),
    )

    await expect(
      decisionService.fetchQueue({ tab: 'waiting', page: 1, limit: 50 }),
    ).resolves.toHaveProperty('error')
  })

  it('accepts with a trimmed note or none, and rejects with a reason', async () => {
    vi.mocked(admissionApi.acceptDecision).mockResolvedValue({} as never)
    vi.mocked(admissionApi.rejectDecision).mockResolvedValue({} as never)

    await expect(decisionService.accept('app1', ' Selamat ')).resolves.toEqual({
      success: true,
    })
    await decisionService.accept('app2')
    await expect(
      decisionService.reject('app1', 'Kuota penuh'),
    ).resolves.toEqual({
      success: true,
    })

    expect(admissionApi.acceptDecision).toHaveBeenNthCalledWith(
      1,
      'app1',
      'Selamat',
    )
    expect(admissionApi.acceptDecision).toHaveBeenNthCalledWith(
      2,
      'app2',
      undefined,
    )
    expect(admissionApi.rejectDecision).toHaveBeenCalledWith(
      'app1',
      'Kuota penuh',
    )
    expect(toast.success).toHaveBeenCalledWith('Pendaftar diterima.', {
      description:
        'Status pendaftar diubah menjadi diterima dan siap daftar ulang.',
    })
    expect(toast.success).toHaveBeenCalledWith('Pendaftar ditolak.', {
      description:
        'Pendaftar diberi tahu hasil keputusan penolakan beserta alasannya.',
    })
  })

  it('shows the server message when a decision is refused', async () => {
    vi.mocked(admissionApi.acceptDecision).mockRejectedValue(
      failure(
        409,
        'Pendaftaran berubah saat Anda bekerja, muat ulang dan coba lagi',
      ),
    )

    await expect(decisionService.accept('app1')).resolves.toEqual({
      success: false,
    })
    expect(toast.error).toHaveBeenCalledWith(
      'Pendaftaran berubah saat Anda bekerja, muat ulang dan coba lagi',
    )
  })

  it('accepts many and reports the outcome of every applicant', async () => {
    vi.mocked(admissionApi.acceptManyDecisions).mockResolvedValue({
      data: {
        data: {
          results: [
            { applicationId: 'a', outcome: 'ACCEPTED' },
            {
              applicationId: 'b',
              outcome: 'SKIPPED',
              reason: 'Status pendaftar sudah berubah',
            },
          ],
        },
      },
    } as never)

    const result = await decisionService.acceptMany(['a', 'b'], 'Selamat')

    expect(admissionApi.acceptManyDecisions).toHaveBeenCalledWith(
      ['a', 'b'],
      'Selamat',
    )
    expect(result).toEqual({
      success: true,
      accepted: 1,
      skipped: [
        { applicationId: 'b', reason: 'Status pendaftar sudah berubah' },
      ],
    })
    expect(toast.success).toHaveBeenCalledWith(
      'Penerimaan massal selesai diproses.',
      {
        description: '1 pendaftar diterima, 1 dilewati.',
      },
    )
  })

  it('cancels an acceptance and a rejection with a reason and says where the applicant went', async () => {
    vi.mocked(admissionApi.cancelAcceptance).mockResolvedValue({} as never)
    vi.mocked(admissionApi.cancelRejection)
      .mockResolvedValueOnce({
        data: { data: { status: 'VERIFIED', verified: true } },
      } as never)
      .mockResolvedValueOnce({
        data: { data: { status: 'SUBMITTED', verified: false } },
      } as never)

    await decisionService.cancelAcceptance('app1', 'Salah klik')
    await decisionService.cancelRejection('app1', 'Banding diterima')
    await decisionService.cancelRejection('app2', 'Banding diterima')

    expect(admissionApi.cancelAcceptance).toHaveBeenCalledWith(
      'app1',
      'Salah klik',
    )
    expect(toast.success).toHaveBeenCalledWith('Penerimaan dibatalkan.', {
      description: 'Pendaftar dikembalikan ke antrean menunggu keputusan.',
    })
    expect(toast.success).toHaveBeenCalledWith('Penolakan dibatalkan.', {
      description: 'Pendaftar dikembalikan ke antrean menunggu keputusan.',
    })
    expect(toast.success).toHaveBeenCalledWith('Penolakan dibatalkan.', {
      description: 'Pendaftar dikembalikan ke antrean verifikasi berkas.',
    })
  })

  it('shows the 409 message when enrollment has started', async () => {
    vi.mocked(admissionApi.cancelAcceptance).mockRejectedValue(
      failure(
        409,
        'Penerimaan tidak bisa dibatalkan setelah proses daftar ulang dimulai',
      ),
    )

    await expect(
      decisionService.cancelAcceptance('app1', 'x'),
    ).resolves.toEqual({
      success: false,
    })
    expect(toast.error).toHaveBeenCalledWith(
      'Penerimaan tidak bisa dibatalkan setelah proses daftar ulang dimulai',
    )
  })
})
