// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rdmService } from '../services/rdmService'
import type * as RdmServiceModule from '../services/rdmService'
import type { RdmCandidateItem, RdmFillResponse } from '../types'
import RdmFillDialog from './RdmFillDialog.vue'

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

const RDM_STEPS_TEXT =
  'Upload file ini di RDM: Nilai Sumatif Lingkup Materi (atau Nilai SAS) > Upload. TP/LM Ke diatur di RDM bila diperlukan.'
const RDM_SAS_WARNING =
  'Upload SAS ke RDM hanya berhasil sekali per kelas dan mapel. Pastikan nilai SAS sudah final sebelum upload; koreksi setelahnya diisi di halaman Nilai SAS di RDM.'

function makeCandidate(
  index: number,
  type: RdmCandidateItem['type'] = 'DAILY',
): RdmCandidateItem {
  return {
    id: `item-${index}`,
    name: `UH ${index}`,
    type,
    maxScore: 100,
    material: null,
    kktp: null,
  }
}

function selectFileOnInput(file: File) {
  const input =
    document.body.querySelector<HTMLInputElement>('input[type="file"]')
  expect(input).not.toBeNull()
  Object.defineProperty(input!, 'files', {
    value: [file],
    configurable: true,
  })
  input!.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('RdmFillDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('preselects all candidates when 15 or fewer and shows summary + RDM steps text after submit', async () => {
    vi.mocked(rdmService.getCandidates).mockResolvedValueOnce({
      sumatif: [makeCandidate(1), makeCandidate(2)],
      sas: [],
    })

    const fillResponse: RdmFillResponse = {
      fileName: 'Template Nilai Sumatif-7A-MTK - terisi.xlsx',
      fileBase64: btoa('filled-bytes'),
      summary: {
        kind: 'sumatif',
        classSubjectWarning:
          'Template ini bertuliskan 7B/IPA, bukan 7A/Matematika.',
        sheets: [
          {
            sheetName: 'SUM 1',
            itemId: 'item-1',
            itemName: 'UH 1',
            written: 28,
          },
        ],
        unmatchedRows: [9, 14],
        ambiguousRows: [18],
        missingStudents: ['Ahmad Fauzi'],
        itemsNotSent: [{ id: 'item-2', name: 'UH 2' }],
      },
    }
    vi.mocked(rdmService.fillTemplate).mockResolvedValueOnce(fillResponse)

    const wrapper = mount(RdmFillDialog, {
      props: { open: true, teachingAssignmentId: 'ta-1' },
      attachTo: document.body,
    })
    await flushPromises()

    const checkboxes = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('[role="checkbox"]'),
    )
    expect(checkboxes).toHaveLength(2)
    expect(
      checkboxes.every((cb) => cb.getAttribute('aria-checked') === 'true'),
    ).toBe(true)

    const file = new File(['tpl'], 'Template Nilai Sumatif-7A-MTK.xlsx')
    selectFileOnInput(file)
    await flushPromises()

    const submitBtn = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('button'),
    ).find((btn) => btn.textContent?.includes('Isi Template'))
    expect(submitBtn).toBeDefined()
    submitBtn!.click()
    await flushPromises()

    expect(rdmService.fillTemplate).toHaveBeenCalledWith({
      teachingAssignmentId: 'ta-1',
      file,
      itemIds: ['item-1', 'item-2'],
    })

    const text = document.body.textContent ?? ''
    expect(text).toContain('Template Nilai Sumatif-7A-MTK - terisi.xlsx')
    expect(text).toContain(
      'Template ini bertuliskan 7B/IPA, bukan 7A/Matematika.',
    )
    expect(text).toContain('SUM 1')
    expect(text).toContain('UH 1')
    expect(text).toContain('9, 14')
    expect(text).toContain('18')
    expect(text).toContain('Ahmad Fauzi')
    expect(text).toContain('UH 2')
    expect(text).toContain(RDM_STEPS_TEXT)
    expect(text).not.toContain(RDM_SAS_WARNING)

    wrapper.unmount()
  })

  it('keeps the fill button disabled while candidates load and when nothing can be sent', async () => {
    interface Candidates {
      sumatif: RdmCandidateItem[]
      sas: RdmCandidateItem[]
    }
    const resolvers: ((value: Candidates) => void)[] = []
    vi.mocked(rdmService.getCandidates).mockReturnValueOnce(
      new Promise<Candidates>((resolve) => {
        resolvers.push(resolve)
      }),
    )

    const wrapper = mount(RdmFillDialog, {
      props: { open: true, teachingAssignmentId: 'ta-1' },
      attachTo: document.body,
    })
    await flushPromises()
    selectFileOnInput(new File(['tpl'], 'Template Nilai Sumatif-7A.xlsx'))
    await flushPromises()

    const submitButton = () =>
      Array.from(
        document.body.querySelectorAll<HTMLButtonElement>('button'),
      ).find((btn) => btn.textContent?.includes('Isi Template'))
    expect(submitButton()?.disabled).toBe(true)

    resolvers[0]?.({ sumatif: [], sas: [] })
    await flushPromises()
    expect(submitButton()?.disabled).toBe(true)

    submitButton()?.click()
    await flushPromises()
    expect(rdmService.fillTemplate).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('blocks selecting more than 15 items with the brief message', async () => {
    const sixteen = Array.from({ length: 16 }, (_, i) => makeCandidate(i + 1))
    vi.mocked(rdmService.getCandidates).mockResolvedValueOnce({
      sumatif: sixteen,
      sas: [],
    })

    const wrapper = mount(RdmFillDialog, {
      props: { open: true, teachingAssignmentId: 'ta-1' },
      attachTo: document.body,
    })
    await flushPromises()

    const checkboxes = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('[role="checkbox"]'),
    )
    expect(checkboxes).toHaveLength(16)
    expect(
      checkboxes.every((cb) => cb.getAttribute('aria-checked') === 'false'),
    ).toBe(true)

    for (let i = 0; i < 15; i += 1) {
      checkboxes[i].click()
    }
    await flushPromises()

    checkboxes[15].click()
    await flushPromises()

    expect(checkboxes[15].getAttribute('aria-checked')).toBe('false')
    expect(document.body.textContent).toContain(
      'Maksimal 15 penilaian per file RDM',
    )

    wrapper.unmount()
  })

  it('shows the SAS once-only upload sentence when kind is sas', async () => {
    vi.mocked(rdmService.getCandidates).mockResolvedValueOnce({
      sumatif: [],
      sas: [makeCandidate(1, 'FINAL')],
    })
    vi.mocked(rdmService.fillTemplate).mockResolvedValueOnce({
      fileName: 'Template SAS-7A-MTK - terisi.xlsx',
      fileBase64: btoa('sas'),
      summary: {
        kind: 'sas',
        classSubjectWarning: null,
        sheets: [
          {
            sheetName: 'SAS 1',
            itemId: 'item-1',
            itemName: 'UAS',
            written: 28,
          },
        ],
        unmatchedRows: [],
        ambiguousRows: [],
        missingStudents: [],
        itemsNotSent: [],
      },
    })

    const wrapper = mount(RdmFillDialog, {
      props: { open: true, teachingAssignmentId: 'ta-1' },
      attachTo: document.body,
    })
    await flushPromises()

    selectFileOnInput(new File(['sas'], 'Template SAS-7A-MTK.xlsx'))
    await flushPromises()

    const submitBtn = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('button'),
    ).find((btn) => btn.textContent?.includes('Isi Template'))
    submitBtn!.click()
    await flushPromises()

    const text = document.body.textContent ?? ''
    expect(text).toContain(RDM_STEPS_TEXT)
    expect(text).toContain(RDM_SAS_WARNING)

    wrapper.unmount()
  })

  it('shows API error messages verbatim', async () => {
    vi.mocked(rdmService.getCandidates).mockResolvedValueOnce({
      sumatif: [makeCandidate(1)],
      sas: [],
    })
    vi.mocked(rdmService.fillTemplate).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message:
            'Template SAS membutuhkan tepat satu penilaian jenis FINAL. Saat ini ada 0.',
        },
      },
    })

    const wrapper = mount(RdmFillDialog, {
      props: { open: true, teachingAssignmentId: 'ta-1' },
      attachTo: document.body,
    })
    await flushPromises()

    selectFileOnInput(new File(['x'], 'Template Nilai Sumatif-7A-MTK.xlsx'))
    await flushPromises()

    const submitBtn = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('button'),
    ).find((btn) => btn.textContent?.includes('Isi Template'))
    submitBtn!.click()
    await flushPromises()

    expect(document.body.textContent).toContain(
      'Template SAS membutuhkan tepat satu penilaian jenis FINAL. Saat ini ada 0.',
    )

    wrapper.unmount()
  })
})
