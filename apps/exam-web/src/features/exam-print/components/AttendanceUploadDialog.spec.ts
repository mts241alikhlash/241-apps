// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AttendanceUploadDialog from './AttendanceUploadDialog.vue'
import { attendanceFileService } from '../services/attendanceFileService'
import type { AttendanceTarget } from '../attendanceFileTypes'

vi.mock('../services/attendanceFileService', () => ({
  attendanceFileService: { uploadAttendanceFile: vi.fn() },
}))

const targets: AttendanceTarget[] = [
  { key: 'a', label: 'Ruang A', roomId: 'ra', slotId: 's1', day: '2026-11-18' },
  { key: 'b', label: 'Ruang B', roomId: 'rb', slotId: 's2', day: '2026-11-18' },
]

const button = (label: string) =>
  [...document.body.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === label,
  )

function choose(index: number, file: File) {
  const input = document.body.querySelector<HTMLInputElement>(
    `input[aria-label="Pilih berkas ${targets[index].label}"]`,
  )!
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

const mountDialog = () =>
  mount(AttendanceUploadDialog, {
    props: {
      open: true,
      eventId: 'e1',
      kind: 'STUDENT',
      title: 'Unggah Daftar Hadir Peserta',
      targets,
    },
    attachTo: document.body,
  })

describe('AttendanceUploadDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.mocked(attendanceFileService.uploadAttendanceFile).mockReset()
  })

  it('lists every target and keeps Unggah disabled until each has a file', async () => {
    mountDialog()
    await flushPromises()

    expect(document.body.textContent).toContain('Unggah Daftar Hadir Peserta')
    expect(document.body.textContent).toContain('Ruang A')
    expect(document.body.textContent).toContain('Ruang B')
    expect(button('Unggah')?.disabled).toBe(true)

    choose(0, new File(['%PDF-'], 'a.pdf'))
    await flushPromises()
    expect(button('Unggah')?.disabled).toBe(true)

    choose(1, new File(['%PDF-'], 'b.pdf'))
    await flushPromises()
    expect(button('Unggah')?.disabled).toBe(false)
  })

  it('uploads each target, then emits done and closes', async () => {
    vi.mocked(attendanceFileService.uploadAttendanceFile).mockResolvedValue({
      success: true,
      data: {} as never,
    })
    const wrapper = mountDialog()
    await flushPromises()
    choose(0, new File(['%PDF-'], 'a.pdf'))
    choose(1, new File(['%PDF-'], 'b.pdf'))
    await flushPromises()

    button('Unggah')?.click()
    await flushPromises()

    expect(attendanceFileService.uploadAttendanceFile).toHaveBeenCalledTimes(2)
    expect(attendanceFileService.uploadAttendanceFile).toHaveBeenCalledWith(
      'e1',
      'STUDENT',
      targets[0],
      expect.any(File),
    )
    expect(wrapper.emitted('done')).toHaveLength(1)
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('shows failures and retries only them', async () => {
    const upload = vi.mocked(attendanceFileService.uploadAttendanceFile)
    upload.mockImplementation((_event, _kind, target) =>
      Promise.resolve(
        target.key === 'b'
          ? { success: false as const, error: 'Gagal jaringan' }
          : { success: true as const, data: {} as never },
      ),
    )
    const wrapper = mountDialog()
    await flushPromises()
    choose(0, new File(['%PDF-'], 'a.pdf'))
    choose(1, new File(['%PDF-'], 'b.pdf'))
    await flushPromises()
    button('Unggah')?.click()
    await flushPromises()

    expect(document.body.textContent).toContain('Ruang B: Gagal jaringan')
    expect(wrapper.emitted('done')).toBeUndefined()

    upload.mockClear()
    upload.mockResolvedValue({ success: true, data: {} as never })
    button('Coba lagi yang gagal')?.click()
    await flushPromises()

    expect(upload).toHaveBeenCalledTimes(1)
    expect(upload.mock.calls[0][2].key).toBe('b')
    expect(wrapper.emitted('done')).toHaveLength(1)
  })
})
