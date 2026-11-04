import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import { documentReviewService } from './documentReviewService'

vi.mock('../api/admissionApi', () => ({
  admissionApi: {
    getDocumentReviews: vi.fn(),
    getDocumentReview: vi.fn(),
    saveDocumentDecision: vi.fn(),
    sendDocumentReview: vi.fn(),
  },
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function failure(status: number, message: string) {
  return { isAxiosError: true, response: { status, data: { message } } }
}

describe('documentReviewService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads a tab with its counts', async () => {
    vi.mocked(admissionApi.getDocumentReviews).mockResolvedValue({
      data: {
        data: [{ applicationId: 'app1' }],
        meta: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          counts: { waiting: 1, revision: 2, done: 3 },
        },
      },
    } as never)

    const result = await documentReviewService.fetchQueue({
      tab: 'waiting',
      page: 1,
      limit: 50,
    })

    expect(admissionApi.getDocumentReviews).toHaveBeenCalledWith({
      tab: 'waiting',
      page: 1,
      limit: 50,
    })
    expect(result).toEqual({
      rows: [{ applicationId: 'app1' }],
      total: 1,
      counts: { waiting: 1, revision: 2, done: 3 },
    })
  })

  it('returns the load error of the queue', async () => {
    vi.mocked(admissionApi.getDocumentReviews).mockRejectedValue(
      Object.assign(new Error('offline'), { isAxiosError: true }),
    )

    const result = await documentReviewService.fetchQueue({
      tab: 'waiting',
      page: 1,
      limit: 50,
    })

    expect(result).toHaveProperty('error')
  })

  it('loads one review and tells a missing applicant from a failed load', async () => {
    vi.mocked(admissionApi.getDocumentReview).mockResolvedValueOnce({
      data: { data: { applicationId: 'app1' } },
    } as never)
    vi.mocked(admissionApi.getDocumentReview).mockRejectedValueOnce(
      failure(404, 'Pendaftar tidak ditemukan'),
    )
    vi.mocked(admissionApi.getDocumentReview).mockRejectedValueOnce(
      failure(500, 'x'),
    )

    await expect(documentReviewService.fetchReview('app1')).resolves.toEqual({
      review: { applicationId: 'app1' },
    })
    await expect(documentReviewService.fetchReview('gone')).resolves.toEqual({
      error: 'not-found',
    })
    await expect(documentReviewService.fetchReview('app1')).resolves.toEqual({
      error: 'load-failed',
    })
  })

  it('saves a decision silently', async () => {
    vi.mocked(admissionApi.saveDocumentDecision).mockResolvedValue({} as never)

    await expect(
      documentReviewService.decide('app1', 'doc1', 'REJECTED', 'Buram'),
    ).resolves.toEqual({ success: true })

    expect(admissionApi.saveDocumentDecision).toHaveBeenCalledWith(
      'app1',
      'doc1',
      { status: 'REJECTED', note: 'Buram' },
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('shows the server message when a decision is refused', async () => {
    vi.mocked(admissionApi.saveDocumentDecision).mockRejectedValue(
      failure(
        409,
        'Keputusan berkas hanya bisa diubah selama pendaftaran menunggu pemeriksaan',
      ),
    )

    await expect(
      documentReviewService.decide('app1', 'doc1', 'APPROVED'),
    ).resolves.toEqual({ success: false })
    expect(toast.error).toHaveBeenCalledWith(
      'Keputusan berkas hanya bisa diubah selama pendaftaran menunggu pemeriksaan',
    )
  })

  it.each([
    [
      { status: 'VERIFIED', outcome: 'APPROVED', verified: true },
      'Hasil dikirim. Pendaftaran terverifikasi.',
    ],
    [
      { status: 'SUBMITTED', outcome: 'APPROVED', verified: false },
      'Hasil dikirim. Pendaftaran terverifikasi otomatis setelah pembayaran diverifikasi.',
    ],
    [
      {
        status: 'REVISION_NEEDED',
        outcome: 'REVISION_REQUESTED',
        verified: false,
      },
      'Formulir dikembalikan ke pendaftar.',
    ],
  ])(
    'sends the result and says what happened (%o)',
    async (result, message) => {
      vi.mocked(admissionApi.sendDocumentReview).mockResolvedValue({
        data: { data: result },
      } as never)

      await expect(
        documentReviewService.send('app1', 'Catatan'),
      ).resolves.toEqual({ success: true, result })

      expect(admissionApi.sendDocumentReview).toHaveBeenCalledWith('app1', {
        dataNote: 'Catatan',
      })
      expect(toast.success).toHaveBeenCalledWith(message)
    },
  )

  it('shows the 409 message when sending is refused', async () => {
    vi.mocked(admissionApi.sendDocumentReview).mockRejectedValue(
      failure(
        409,
        'Masih ada berkas wajib yang belum diputuskan atau belum diunggah',
      ),
    )

    await expect(documentReviewService.send('app1')).resolves.toEqual({
      success: false,
    })
    expect(toast.error).toHaveBeenCalledWith(
      'Masih ada berkas wajib yang belum diputuskan atau belum diunggah',
    )
  })
})
