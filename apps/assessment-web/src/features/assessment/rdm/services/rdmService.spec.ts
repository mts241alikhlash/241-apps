// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { rdmApi } from '../api/rdmApi'
import { RdmRequestError, rdmService } from './rdmService'

vi.mock('../api/rdmApi', () => ({
  rdmApi: {
    getCandidates: vi.fn(),
    downloadWorkbook: vi.fn(),
    fillTemplate: vi.fn(),
    previewImport: vi.fn(),
    confirmImport: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-1'),
  },
}))

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

describe('rdmService', () => {
  const createdAnchors: HTMLAnchorElement[] = []
  let originalCreateElement: typeof document.createElement

  beforeEach(() => {
    vi.clearAllMocks()
    createdAnchors.length = 0
    URL.createObjectURL = vi.fn(() => 'blob:rdm-test')
    URL.revokeObjectURL = vi.fn()
    originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName.toLowerCase() === 'a') {
          const anchor = el as HTMLAnchorElement
          anchor.click = vi.fn()
          createdAnchors.push(anchor)
        }
        return el
      },
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('fills a template, sends FormData with repeated itemIds, and saves the base64 xlsx with returned fileName', async () => {
    const summary = {
      kind: 'sumatif' as const,
      classSubjectWarning: null,
      sheets: [
        { sheetName: 'SUM 1', itemId: 'item-1', itemName: 'UH 1', written: 20 },
      ],
      unmatchedRows: [],
      ambiguousRows: [],
      missingStudents: [],
      itemsNotSent: [],
    }
    vi.mocked(rdmApi.fillTemplate).mockResolvedValueOnce({
      data: {
        data: {
          fileName: 'Template Nilai Sumatif-7A-MTK - terisi.xlsx',
          fileBase64: btoa('fake-xlsx-bytes'),
          summary,
        },
      },
    } as never)

    const file = new File(['tpl'], 'Template Nilai Sumatif-7A-MTK.xlsx', {
      type: XLSX_MIME,
    })

    const result = await rdmService.fillTemplate({
      teachingAssignmentId: 'ta-1',
      file,
      itemIds: ['item-1', 'item-2'],
    })

    expect(result.fileName).toBe('Template Nilai Sumatif-7A-MTK - terisi.xlsx')
    expect(rdmApi.fillTemplate).toHaveBeenCalledTimes(1)
    const formData = vi.mocked(rdmApi.fillTemplate).mock.calls[0][0]
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('teachingAssignmentId')).toBe('ta-1')
    expect(formData.get('file')).toBe(file)
    expect(formData.getAll('itemIds')).toEqual(['item-1', 'item-2'])

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    const blobArg = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    expect(blobArg).toBeInstanceOf(Blob)
    expect(blobArg.type).toBe(XLSX_MIME)
    expect(createdAnchors[0]?.download).toBe(
      'Template Nilai Sumatif-7A-MTK - terisi.xlsx',
    )
    expect(createdAnchors[0]?.click).toHaveBeenCalledTimes(1)
  })

  it('downloads an RDM workbook using UTF-8 Content-Disposition and surfaces X-Rdm-Items-Not-Included', async () => {
    const blob = new Blob(['xlsx'], { type: XLSX_MIME })
    vi.mocked(rdmApi.downloadWorkbook).mockResolvedValueOnce({
      data: blob,
      headers: {
        'content-disposition':
          'attachment; filename="Nilai_Sumatif-7A-MTK.xlsx"; filename*=UTF-8\'\'Nilai%20Sumatif-7A-MTK.xlsx',
        'x-rdm-items-not-included': '3',
      },
    } as never)

    const result = await rdmService.downloadWorkbook('ta-1', 'sumatif')

    expect(rdmApi.downloadWorkbook).toHaveBeenCalledWith('ta-1', 'sumatif')
    expect(result.fileName).toBe('Nilai Sumatif-7A-MTK.xlsx')
    expect(result.itemsNotIncluded).toBe(3)
    expect(createdAnchors[0]?.download).toBe('Nilai Sumatif-7A-MTK.xlsx')
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('3'))
  })

  it('explains omitted SAS items with the one-item SAS limit, not the 15-item limit', async () => {
    vi.mocked(rdmApi.downloadWorkbook).mockResolvedValueOnce({
      data: new Blob(['xlsx'], { type: XLSX_MIME }),
      headers: { 'x-rdm-items-not-included': '1' },
    } as never)

    await rdmService.downloadWorkbook('ta-1', 'sas')

    expect(toast.warning).toHaveBeenCalledWith(
      '1 penilaian tidak disertakan karena template SAS hanya memuat 1 penilaian.',
    )
  })

  it('shows an Indonesian fallback for errors without an HTTP response', async () => {
    vi.mocked(rdmApi.getCandidates).mockRejectedValueOnce(
      new Error('timeout of 30000ms exceeded'),
    )

    const failure = rdmService.getCandidates('ta-1')

    await expect(failure).rejects.toBeInstanceOf(RdmRequestError)
    await expect(failure).rejects.not.toThrow('timeout of 30000ms exceeded')
  })

  it('surfaces verbatim Indonesian 400/403 API error messages including blob errors', async () => {
    vi.mocked(rdmApi.fillTemplate).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'File ini bukan template RDM',
        },
      },
    })

    const file = new File(['x'], 'bad.xlsx')
    await expect(
      rdmService.fillTemplate({
        teachingAssignmentId: 'ta-1',
        file,
        itemIds: ['item-1'],
      }),
    ).rejects.toThrow('File ini bukan template RDM')

    const errorBlob = new Blob(
      [
        JSON.stringify({
          message:
            'Hanya guru pengampu kelas dan mapel ini yang dapat memakai fitur RDM',
        }),
      ],
      { type: 'application/json' },
    )
    vi.mocked(rdmApi.downloadWorkbook).mockRejectedValueOnce({
      response: {
        status: 403,
        data: errorBlob,
      },
    })

    await expect(rdmService.downloadWorkbook('ta-1', 'sas')).rejects.toThrow(
      'Hanya guru pengampu kelas dan mapel ini yang dapat memakai fitur RDM',
    )
  })

  it('fetches and updates RDM settings and surfaces 400 validation errors verbatim', async () => {
    vi.mocked(rdmApi.getSettings).mockResolvedValueOnce({
      data: {
        data: {
          sumatifTypes: ['DAILY', 'ASSIGNMENT'],
          sasType: 'FINAL',
        },
      },
    } as never)

    const loaded = await rdmService.getSettings()
    expect(loaded).toEqual({
      sumatifTypes: ['DAILY', 'ASSIGNMENT'],
      sasType: 'FINAL',
    })

    vi.mocked(rdmApi.updateSettings).mockResolvedValueOnce({
      data: {
        data: {
          sumatifTypes: ['DAILY', 'PRACTICAL'],
          sasType: 'MIDTERM',
        },
      },
    } as never)

    const saved = await rdmService.updateSettings({
      sumatifTypes: ['DAILY', 'PRACTICAL'],
      sasType: 'MIDTERM',
    })
    expect(rdmApi.updateSettings).toHaveBeenCalledWith({
      sumatifTypes: ['DAILY', 'PRACTICAL'],
      sasType: 'MIDTERM',
    })
    expect(saved).toEqual({
      sumatifTypes: ['DAILY', 'PRACTICAL'],
      sasType: 'MIDTERM',
    })

    vi.mocked(rdmApi.updateSettings).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'Pilih minimal satu jenis penilaian untuk Sumatif',
        },
      },
    })

    await expect(
      rdmService.updateSettings({ sumatifTypes: [], sasType: 'FINAL' }),
    ).rejects.toThrow('Pilih minimal satu jenis penilaian untuk Sumatif')
  })
})
