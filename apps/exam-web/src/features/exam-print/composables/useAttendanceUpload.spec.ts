import { describe, expect, it, vi } from 'vitest'
import {
  ATTENDANCE_UPLOAD_CONCURRENCY,
  useAttendanceUpload,
} from './useAttendanceUpload'
import type { AttendanceTarget } from '../attendanceFileTypes'

const target = (id: number): AttendanceTarget => ({
  key: `r${id}`,
  label: `Ruang ${id}`,
  roomId: `r${id}`,
  day: '2026-11-18',
})

const pdf = (name = 'scan.pdf') =>
  new File(['%PDF-'], name, { type: 'application/pdf' })

const ok = { success: true as const, data: null }

describe('useAttendanceUpload', () => {
  it('stays unready until every target has a valid file', () => {
    const s = useAttendanceUpload({ upload: vi.fn() })
    const targets = [target(1), target(2)]
    s.start(targets)
    expect(s.ready.value).toBe(false)
    s.setFile('r1', pdf())
    expect(s.ready.value).toBe(false)
    s.setFile('r2', new File(['x'], 'catatan.txt'))
    expect(s.ready.value).toBe(false)
    expect(s.problems.value.r2).toBe('Berkas harus PDF, JPG, atau PNG.')
    s.setFile('r2', pdf())
    expect(s.ready.value).toBe(true)
    s.setFile('r1', null)
    expect(s.ready.value).toBe(false)
  })

  it('does not upload while not ready', async () => {
    const upload = vi.fn().mockResolvedValue(ok)
    const s = useAttendanceUpload({ upload })
    s.start([target(1)])
    await s.confirm()
    expect(upload).not.toHaveBeenCalled()
  })

  it('uploads at most 3 at a time and counts n of N', async () => {
    let active = 0
    let peak = 0
    const upload = vi.fn(async () => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
      return ok
    })
    const s = useAttendanceUpload({ upload })
    const targets = [1, 2, 3, 4, 5, 6, 7].map(target)
    s.start(targets)
    for (const item of targets) s.setFile(item.key, pdf())
    await s.confirm()

    expect(peak).toBe(ATTENDANCE_UPLOAD_CONCURRENCY)
    expect(upload).toHaveBeenCalledTimes(7)
    expect(s.done.value).toBe(7)
    expect(s.runTotal.value).toBe(7)
    expect(s.succeeded.value).toBe(7)
    expect(s.finished.value).toBe(true)
    expect(s.failures.value).toEqual([])
  })

  it('collects failures and retries only the failed targets', async () => {
    const upload = vi
      .fn()
      .mockImplementation((item: AttendanceTarget) =>
        Promise.resolve(
          item.key === 'r2'
            ? { success: false as const, error: 'Ruang penuh' }
            : ok,
        ),
      )
    const s = useAttendanceUpload({ upload })
    const targets = [target(1), target(2), target(3)]
    s.start(targets)
    for (const item of targets) s.setFile(item.key, pdf())
    await s.confirm()

    expect(s.succeeded.value).toBe(2)
    expect(s.failures.value).toEqual([
      { key: 'r2', label: 'Ruang 2', error: 'Ruang penuh' },
    ])

    upload.mockClear()
    upload.mockResolvedValue(ok)
    await s.retryFailed()

    expect(upload).toHaveBeenCalledTimes(1)
    expect(upload.mock.calls[0][0].key).toBe('r2')
    expect(s.failures.value).toEqual([])
    expect(s.succeeded.value).toBe(3)
  })

  it('turns a thrown error into a failure', async () => {
    const s = useAttendanceUpload({
      upload: vi.fn().mockRejectedValue(new Error('jaringan putus')),
    })
    s.start([target(1)])
    s.setFile('r1', pdf())
    await s.confirm()
    expect(s.failures.value[0].error).toBe('jaringan putus')
  })

  it('start clears the previous run', async () => {
    const s = useAttendanceUpload({ upload: vi.fn().mockResolvedValue(ok) })
    s.start([target(1)])
    s.setFile('r1', pdf())
    await s.confirm()
    s.start([target(2)])
    expect(s.finished.value).toBe(false)
    expect(s.succeeded.value).toBe(0)
    expect(s.ready.value).toBe(false)
  })
})
