import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examBankService } from './examBankService'

const { importQuestions, previewImport } = vi.hoisted(() => ({
  importQuestions: vi.fn(),
  previewImport: vi.fn(),
}))
vi.mock('../api/examBankApi', () => ({
  examBankApi: { importQuestions, previewImport },
}))
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
      created: 1,
      questionIds: ['a'],
      errors: [],
    })

    await examBankService.importQuestions({
      file: new File(['x'], 'soal.xlsx'),
      packageId: 'p1',
    })

    const form = importQuestions.mock.calls[0][0] as FormData
    expect(form.get('packageId')).toBe('p1')
    expect(form.get('confirmDuplicates')).toBeNull()
  })

  it('sends the duplicate confirmation when it is set', async () => {
    importQuestions.mockResolvedValue({
      created: 1,
      questionIds: [],
      errors: [],
    })

    await examBankService.importQuestions({
      file: new File(['x'], 'soal.xlsx'),
      packageId: 'p1',
      confirmDuplicates: true,
    })

    const form = importQuestions.mock.calls[0][0] as FormData
    expect(form.get('confirmDuplicates')).toBe('true')
  })
})

describe('examBankService.previewImport', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the preview for the file and package', async () => {
    const preview = { canSave: true, errors: [], duplicateRows: [] }
    previewImport.mockResolvedValue(preview)

    const result = await examBankService.previewImport({
      file: new File(['x'], 'soal.xlsx'),
      packageId: 'p1',
    })

    expect(result).toEqual({ success: true, data: preview })
    const form = previewImport.mock.calls[0][0] as FormData
    expect(form.get('packageId')).toBe('p1')
    expect(form.get('file')).toBeInstanceOf(File)
  })

  it('hands the server reason for a refused preview to the page', async () => {
    previewImport.mockRejectedValue(refused(400, 'Berkas tidak bisa dibaca'))

    const result = await examBankService.previewImport({
      file: new File(['x'], 'soal.xlsx'),
      packageId: 'p1',
    })

    expect(result).toEqual({
      success: false,
      error: 'Berkas tidak bisa dibaca',
    })
  })
})
