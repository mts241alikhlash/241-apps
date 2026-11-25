import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rdmService } from '../services/rdmService'
import type * as RdmServiceModule from '../services/rdmService'
import type { RdmCandidateItem, RdmFillResponse } from '../types'
import { useRdmFill } from './useRdmFill'

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

function makeCandidate(
  index: number,
  type: RdmCandidateItem['type'] = 'DAILY',
): RdmCandidateItem {
  return {
    id: `item-${index}`,
    name: `Penilaian ${index}`,
    type,
    maxScore: 100,
    material: null,
    kktp: null,
  }
}

describe('useRdmFill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preselects all sumatif candidates when 15 or fewer', async () => {
    vi.mocked(rdmService.getCandidates).mockResolvedValueOnce({
      sumatif: [makeCandidate(1), makeCandidate(2), makeCandidate(3)],
      sas: [makeCandidate(4, 'FINAL')],
    })

    const fill = useRdmFill(() => 'ta-1')
    await fill.loadCandidates()

    expect(fill.selectedIds.value).toEqual(['item-1', 'item-2', 'item-3'])
    expect(fill.selectionError.value).toBeNull()
  })

  it('does not preselect all when more than 15 sumatif candidates and blocks selecting a 16th', async () => {
    const sixteen = Array.from({ length: 16 }, (_, i) => makeCandidate(i + 1))
    vi.mocked(rdmService.getCandidates).mockResolvedValueOnce({
      sumatif: sixteen,
      sas: [],
    })

    const fill = useRdmFill(() => 'ta-1')
    await fill.loadCandidates()

    expect(fill.selectedIds.value).toEqual([])

    for (let i = 1; i <= 15; i += 1) {
      fill.toggleItem(`item-${i}`)
    }
    expect(fill.selectedIds.value).toHaveLength(15)
    expect(fill.selectionError.value).toBeNull()

    fill.toggleItem('item-16')
    expect(fill.selectedIds.value).toHaveLength(15)
    expect(fill.selectedIds.value).not.toContain('item-16')
    expect(fill.selectionError.value).toBe('Maksimal 15 penilaian per file RDM')
  })

  it('submits file and selected itemIds, stores fill result, and switches to sas without sending sumatif ids', async () => {
    vi.mocked(rdmService.getCandidates).mockResolvedValueOnce({
      sumatif: [makeCandidate(1), makeCandidate(2)],
      sas: [makeCandidate(99, 'FINAL')],
    })
    const response: RdmFillResponse = {
      fileName: 'Template Nilai Sumatif-7A-MTK - terisi.xlsx',
      fileBase64: 'YWJj',
      summary: {
        kind: 'sumatif',
        classSubjectWarning: null,
        sheets: [
          {
            sheetName: 'SUM 1',
            itemId: 'item-1',
            itemName: 'Penilaian 1',
            written: 25,
          },
        ],
        unmatchedRows: [],
        ambiguousRows: [],
        missingStudents: [],
        itemsNotSent: [],
      },
    }
    vi.mocked(rdmService.fillTemplate).mockResolvedValueOnce(response)

    const fill = useRdmFill(() => 'ta-1')
    await fill.loadCandidates()

    const file = new File(['x'], 'Template Nilai Sumatif-7A-MTK.xlsx')
    fill.setFile(file)
    expect(fill.templateKind.value).toBe('sumatif')

    await fill.submit()
    expect(rdmService.fillTemplate).toHaveBeenCalledWith({
      teachingAssignmentId: 'ta-1',
      file,
      itemIds: ['item-1', 'item-2'],
    })
    expect(fill.result.value).toEqual(response)

    const sasFile = new File(['x'], 'Template SAS-7A-MTK.xlsx')
    fill.setFile(sasFile)
    expect(fill.templateKind.value).toBe('sas')

    vi.mocked(rdmService.fillTemplate).mockResolvedValueOnce({
      ...response,
      summary: { ...response.summary, kind: 'sas' },
    })
    await fill.submit()
    expect(rdmService.fillTemplate).toHaveBeenLastCalledWith({
      teachingAssignmentId: 'ta-1',
      file: sasFile,
      itemIds: ['item-99'],
    })
  })

  it('preserves verbatim API errors on submit failure', async () => {
    vi.mocked(rdmService.getCandidates).mockResolvedValueOnce({
      sumatif: [makeCandidate(1)],
      sas: [],
    })
    vi.mocked(rdmService.fillTemplate).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message:
            'Nama penilaian untuk RDM maksimal 50 karakter: Tugas Panjang Sekali',
        },
      },
    })

    const fill = useRdmFill(() => 'ta-1')
    await fill.loadCandidates()
    fill.setFile(new File(['x'], 'template.xlsx'))
    await fill.submit()

    expect(fill.error.value).toBe(
      'Nama penilaian untuk RDM maksimal 50 karakter: Tugas Panjang Sekali',
    )
    expect(fill.result.value).toBeNull()
  })
})
