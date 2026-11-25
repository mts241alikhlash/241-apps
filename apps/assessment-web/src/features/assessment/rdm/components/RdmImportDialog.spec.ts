// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rdmService } from '../services/rdmService'
import type * as RdmServiceModule from '../services/rdmService'
import type { RdmImportPreview, RdmImportResponse } from '../types'
import RdmImportDialog from './RdmImportDialog.vue'

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

describe('RdmImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('previews file without writing, renders table and warnings, then confirms with the same file on Simpan', async () => {
    const preview: RdmImportPreview = {
      classSubjectWarning: 'Header kelas tidak cocok dengan 7A/Matematika.',
      sheets: [
        {
          sheetName: 'SUM 1',
          name: 'UH 1',
          action: 'update',
          itemId: 'item-1',
          scoresToWrite: 15,
          unchanged: 5,
        },
        {
          sheetName: 'SUM 2',
          name: 'Tugas Baru',
          action: 'create',
          itemId: null,
          scoresToWrite: 20,
          unchanged: 0,
        },
      ],
      unmatchedRows: [{ sheetName: 'SUM 1', row: 11 }],
      invalidValues: [{ sheetName: 'SUM 2', row: 15 }],
    }
    const importResult: RdmImportResponse = {
      itemsCreated: 1,
      itemsUpdated: 1,
      scoresWritten: 35,
    }
    vi.mocked(rdmService.previewImport).mockResolvedValueOnce(preview)
    vi.mocked(rdmService.confirmImport).mockResolvedValueOnce(importResult)

    const wrapper = mount(RdmImportDialog, {
      props: { open: true, teachingAssignmentId: 'ta-1' },
      attachTo: document.body,
    })
    await flushPromises()

    const file = new File(['xlsx'], 'Nilai Sumatif-7A-MTK.xlsx')
    selectFileOnInput(file)
    await flushPromises()

    expect(rdmService.previewImport).toHaveBeenCalledWith({
      teachingAssignmentId: 'ta-1',
      file,
    })
    expect(rdmService.confirmImport).not.toHaveBeenCalled()

    const text = document.body.textContent ?? ''
    expect(text).toContain('Header kelas tidak cocok dengan 7A/Matematika.')
    expect(text).toContain('SUM 1')
    expect(text).toContain('UH 1')
    expect(text).toContain('SUM 2')
    expect(text).toContain('Tugas Baru')
    expect(text).toContain('15')
    expect(text).toContain('20')
    expect(text).toContain('baris 11')
    expect(text).toContain('baris 15')

    const simpanBtn = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('button'),
    ).find((btn) => btn.textContent?.trim() === 'Simpan')
    expect(simpanBtn).toBeDefined()
    simpanBtn!.click()
    await flushPromises()

    expect(rdmService.confirmImport).toHaveBeenCalledWith({
      teachingAssignmentId: 'ta-1',
      file,
    })
    expect(wrapper.emitted('import-success')?.[0]).toEqual([importResult])
    expect(document.body.textContent).toContain('35')

    wrapper.unmount()
  })

  it('shows verbatim API errors when preview fails', async () => {
    vi.mocked(rdmService.previewImport).mockRejectedValueOnce({
      response: {
        status: 400,
        data: { message: 'File ini bukan template RDM' },
      },
    })

    const wrapper = mount(RdmImportDialog, {
      props: { open: true, teachingAssignmentId: 'ta-1' },
      attachTo: document.body,
    })
    await flushPromises()

    selectFileOnInput(new File(['bad'], 'bad.xlsx'))
    await flushPromises()

    expect(document.body.textContent).toContain('File ini bukan template RDM')
    expect(rdmService.confirmImport).not.toHaveBeenCalled()

    wrapper.unmount()
  })
})
