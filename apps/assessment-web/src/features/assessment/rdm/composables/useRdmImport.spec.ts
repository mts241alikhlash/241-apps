import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rdmService } from '../services/rdmService'
import type * as RdmServiceModule from '../services/rdmService'
import type { RdmImportPreview, RdmImportResponse } from '../types'
import { useRdmImport } from './useRdmImport'

vi.mock('../services/rdmService', async (importOriginal) => {
  const actual = await importOriginal<typeof RdmServiceModule>()
  return {
    ...actual,
    rdmService: {
      getCandidates: vi.fn(),
      downloadWorkbook: vi.fn(),
      fillTemplate: vi.fn(),
      previewImport: vi.fn(),
      confirmImport: vi.fn(),
    },
  }
})

describe('useRdmImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('previews on file selection without calling confirmImport, then sends the same file on confirm', async () => {
    const preview: RdmImportPreview = {
      classSubjectWarning: null,
      sheets: [
        {
          sheetName: 'SUM 1',
          name: 'UH 1',
          action: 'update',
          itemId: 'item-1',
          scoresToWrite: 12,
          unchanged: 8,
        },
      ],
      unmatchedRows: [],
      invalidValues: [],
    }
    const importResponse: RdmImportResponse = {
      itemsCreated: 0,
      itemsUpdated: 1,
      scoresWritten: 12,
    }
    vi.mocked(rdmService.previewImport).mockResolvedValueOnce(preview)
    vi.mocked(rdmService.confirmImport).mockResolvedValueOnce(importResponse)

    const importer = useRdmImport(() => 'ta-1')
    const file = new File(['xlsx'], 'Nilai Sumatif-7A-MTK.xlsx')

    await importer.setFile(file)
    expect(rdmService.previewImport).toHaveBeenCalledWith({
      teachingAssignmentId: 'ta-1',
      file,
    })
    expect(rdmService.confirmImport).not.toHaveBeenCalled()
    expect(importer.preview.value).toEqual(preview)

    const result = await importer.confirm()
    expect(rdmService.confirmImport).toHaveBeenCalledWith({
      teachingAssignmentId: 'ta-1',
      file,
    })
    expect(result).toEqual(importResponse)
    expect(importer.importResult.value).toEqual(importResponse)
  })

  it('surfaces verbatim API errors from preview and confirm', async () => {
    vi.mocked(rdmService.previewImport).mockRejectedValueOnce({
      response: {
        status: 400,
        data: { message: 'File terlalu besar setelah diekstrak' },
      },
    })

    const importer = useRdmImport(() => 'ta-1')
    await importer.setFile(new File(['bad'], 'bad.xlsx'))

    expect(importer.error.value).toBe('File terlalu besar setelah diekstrak')
    expect(importer.preview.value).toBeNull()
  })
})
