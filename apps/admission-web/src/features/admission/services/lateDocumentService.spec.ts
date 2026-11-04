import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import { lateDocumentService } from './lateDocumentService'

vi.mock('../api/admissionApi', () => ({
  admissionApi: {
    getLateDocuments: vi.fn(),
    uploadLateDocument: vi.fn(),
    decideLateDocument: vi.fn(),
  },
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const query = { page: 1, limit: 10, state: 'OPEN' as const }

describe('lateDocumentService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps the list, the meta counts and the year', async () => {
    vi.mocked(admissionApi.getLateDocuments).mockResolvedValue({
      data: {
        data: [{ applicationId: 'app1' }],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          year: { id: 'y1', name: '2027/2028' },
          datesMissing: ['end'],
          counts: { onTime: 2, late: 1, overdue: 0, complete: 4 },
        },
      },
    } as never)

    const result = await lateDocumentService.fetchList(query)

    expect(admissionApi.getLateDocuments).toHaveBeenCalledWith(query)
    expect(result).toEqual({
      rows: [{ applicationId: 'app1' }],
      total: 1,
      year: { id: 'y1', name: '2027/2028' },
      datesMissing: ['end'],
      counts: { onTime: 2, late: 1, overdue: 0, complete: 4 },
    })
  })

  it('returns an error message when the list fails', async () => {
    vi.mocked(admissionApi.getLateDocuments).mockRejectedValue(
      Object.assign(new Error('offline'), { isAxiosError: true }),
    )

    await expect(lateDocumentService.fetchList(query)).resolves.toHaveProperty(
      'error',
    )
  })

  it('uploads the file for one student and one type', async () => {
    vi.mocked(admissionApi.uploadLateDocument).mockResolvedValue({} as never)
    const file = new File(['x'], 'ijazah.pdf', { type: 'application/pdf' })

    const result = await lateDocumentService.upload('app1', 'ijazah', file)

    expect(admissionApi.uploadLateDocument).toHaveBeenCalledWith(
      'app1',
      'ijazah',
      file,
    )
    expect(result).toEqual({ success: true })
    expect(toast.success).toHaveBeenCalledWith('Berkas susulan diunggah.')
  })

  it('sends the note only for a rejection', async () => {
    vi.mocked(admissionApi.decideLateDocument).mockResolvedValue({} as never)

    await lateDocumentService.decide('app1', 'd1', 'APPROVED')
    await lateDocumentService.decide('app1', 'd1', 'REJECTED', 'Buram')

    expect(admissionApi.decideLateDocument).toHaveBeenNthCalledWith(
      1,
      'app1',
      'd1',
      { status: 'APPROVED' },
    )
    expect(admissionApi.decideLateDocument).toHaveBeenNthCalledWith(
      2,
      'app1',
      'd1',
      { status: 'REJECTED', note: 'Buram' },
    )
  })

  it('toasts the server message and reports failure', async () => {
    vi.mocked(admissionApi.decideLateDocument).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { message: 'Berkas ini diperiksa lewat Verifikasi Berkas' },
      },
    })

    const result = await lateDocumentService.decide('app1', 'd1', 'APPROVED')

    expect(result).toEqual({ success: false })
    expect(toast.error).toHaveBeenCalledWith(
      'Berkas ini diperiksa lewat Verifikasi Berkas',
    )
  })
})
