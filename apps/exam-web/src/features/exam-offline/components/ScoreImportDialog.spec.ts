// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ScoreImportDialog from './ScoreImportDialog.vue'

const { service } = vi.hoisted(() => ({
  service: { importScores: vi.fn() },
}))

vi.mock('../services/examOfflineService', () => ({
  examOfflineService: service,
}))

const button = (label: string) =>
  [...document.body.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === label,
  )

function choose(file: File) {
  const input =
    document.body.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

const sized = (name: string, bytes: number) => {
  const file = new File(['x'], name)
  Object.defineProperty(file, 'size', { value: bytes })
  return file
}

const mountDialog = () =>
  mount(ScoreImportDialog, {
    props: { open: true, scheduleId: 's1' },
    attachTo: document.body,
  })

beforeEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('ScoreImportDialog', () => {
  it('refuses a file that is not .xlsx or .csv', async () => {
    mountDialog()
    await flushPromises()
    choose(new File(['x'], 'nilai.pdf'))
    await flushPromises()
    expect(document.body.textContent).toContain('Pilih berkas .xlsx atau .csv.')
    expect(button('Unggah')?.disabled).toBe(true)
  })

  it('refuses a file above 5 MB', async () => {
    mountDialog()
    await flushPromises()
    choose(sized('nilai.xlsx', 5 * 1024 * 1024 + 1))
    await flushPromises()
    expect(document.body.textContent).toContain('Ukuran berkas maksimal 5 MB.')
    expect(button('Unggah')?.disabled).toBe(true)
  })

  it('uploads, then lists rejected rows as errors and skipped rows apart, and asks for a reload', async () => {
    service.importScores.mockResolvedValue({
      success: true,
      data: {
        saved: 27,
        rejected: [
          {
            row: 7,
            participantNumber: '25-099',
            reason: 'No. Peserta tidak terdaftar di kelas ini',
          },
        ],
        skipped: [
          { row: 5, participantNumber: '25-004', reason: 'KOSONG' },
          { row: 9, participantNumber: '25-008', reason: 'TIDAK_HADIR' },
        ],
      },
    })
    const wrapper = mountDialog()
    await flushPromises()
    const file = new File(['x'], 'Nilai.CSV')
    choose(file)
    await flushPromises()
    button('Unggah')!.click()
    await flushPromises()

    expect(service.importScores).toHaveBeenCalledWith('s1', file)
    expect(document.body.textContent).toContain('27 nilai tersimpan.')

    const rejected = document.body.querySelector('[data-test="rejected"]')!
    expect(rejected.getAttribute('role')).toBe('alert')
    const cells = [...rejected.querySelectorAll('tbody td')].map((cell) =>
      cell.textContent?.trim(),
    )
    expect(cells).toEqual([
      '7',
      '25-099',
      'No. Peserta tidak terdaftar di kelas ini',
    ])

    const skipped = document.body.querySelector('[data-test="skipped"]')!
    expect(skipped.getAttribute('role')).toBeNull()
    expect(skipped.textContent).toContain('Dilewati (kosong)')
    expect(skipped.textContent).toContain('Dilewati (tidak hadir)')
    expect(skipped.textContent).toContain('25-008')

    expect(wrapper.emitted('imported')).toHaveLength(1)
  })

  it('shows a failed upload and does not ask for a reload', async () => {
    service.importScores.mockResolvedValue({
      success: false,
      error: 'Kolom No. Peserta tidak ditemukan',
    })
    const wrapper = mountDialog()
    await flushPromises()
    choose(new File(['x'], 'nilai.xlsx'))
    await flushPromises()
    button('Unggah')!.click()
    await flushPromises()
    expect(document.body.textContent).toContain(
      'Kolom No. Peserta tidak ditemukan',
    )
    expect(wrapper.emitted('imported')).toBeUndefined()
  })
})
