import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examBankService } from './examBankService'

const { importQuestions } = vi.hoisted(() => ({ importQuestions: vi.fn() }))
vi.mock('../api/examBankApi', () => ({ examBankApi: { importQuestions } }))
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const refused = (status: number, message: string) => ({
  isAxiosError: true,
  response: { status, data: { statusCode: status, message, data: null } },
})

describe('examBankService.importQuestions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('hands the server reason for a refused import to the page', async () => {
    importQuestions.mockRejectedValue(
      refused(409, 'Paket berstatus SUBMITTED dan tidak bisa diubah'),
    )

    const result = await examBankService.importQuestions({
      file: new File(['x'], 'soal.xlsx'),
      packageId: 'p1',
    })

    expect(result).toEqual({
      success: false,
      error: 'Paket berstatus SUBMITTED dan tidak bisa diubah',
    })
  })

  it('sends the file with the package id', async () => {
    importQuestions.mockResolvedValue({
      data: { data: { created: 1, questionIds: ['a'], errors: [] } },
    })

    await examBankService.importQuestions({
      file: new File(['x'], 'soal.xlsx'),
      packageId: 'p1',
      authorEmployeeId: 'e1',
    })

    const form = importQuestions.mock.calls[0][0] as FormData
    expect(form.get('packageId')).toBe('p1')
    expect(form.get('authorEmployeeId')).toBe('e1')
  })
})
