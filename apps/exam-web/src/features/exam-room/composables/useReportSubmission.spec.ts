import { describe, expect, it, vi } from 'vitest'
import { useReportSubmission } from './useReportSubmission'
import type { SubjectGroup } from './useReportHierarchy'
import type { RoomReportSummary } from '../types'

const row = (
  id: number,
  overrides: Partial<RoomReportSummary> = {},
): RoomReportSummary => ({
  roomId: `r${id}`,
  roomCode: `R${id}`,
  roomName: `Ruang ${id}`,
  slotId: 's1',
  startsAt: '2026-11-02T01:00:00.000Z',
  endsAt: '2026-11-02T02:00:00.000Z',
  status: 'DRAFT',
  registeredCount: 10,
  reportId: null,
  hasAttachment: false,
  attachmentName: null,
  subjectNames: ['Matematika'],
  supervisorName: null,
  ...overrides,
})

const pdf = (name = 'scan.pdf') =>
  new File(['%PDF-'], name, { type: 'application/pdf' })

const ok = { success: true as const, data: null }

function fill(
  s: ReturnType<typeof useReportSubmission>,
  rows: RoomReportSummary[],
) {
  for (const item of rows) s.setFile(item, pdf())
}

describe('useReportSubmission', () => {
  it('keeps confirm blocked until every listed room has a file', async () => {
    const submit = vi.fn().mockResolvedValue(ok)
    const s = useReportSubmission({ submit, refresh: vi.fn() })
    const rows = [row(1), row(2)]
    s.request(rows)
    expect(s.ready.value).toBe(false)
    s.setFile(rows[0], pdf())
    expect(s.ready.value).toBe(false)
    await s.confirm()
    expect(submit).not.toHaveBeenCalled()
    s.setFile(rows[1], pdf())
    expect(s.ready.value).toBe(true)
  })

  it('refuses a wrong type or an oversized file on the client', () => {
    const s = useReportSubmission({ submit: vi.fn(), refresh: vi.fn() })
    const rows = [row(1)]
    s.request(rows)
    s.setFile(rows[0], new File(['x'], 'catatan.txt'))
    expect(s.ready.value).toBe(false)
    expect(Object.values(s.problems.value)).toEqual([
      'Berkas harus PDF, JPG, atau PNG.',
    ])
    const big = new File(['x'], 'besar.pdf')
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 })
    s.setFile(rows[0], big)
    expect(Object.values(s.problems.value)).toEqual([
      'Ukuran berkas maksimal 10 MB.',
    ])
    s.setFile(rows[0], pdf())
    expect(s.ready.value).toBe(true)
  })

  it('caps concurrency at 3, sends each room its own file, refreshes once', async () => {
    let active = 0
    let peak = 0
    const submit = vi.fn(async (_room: string, _slot: string, _file: File) => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
      return ok
    })
    const refresh = vi.fn().mockResolvedValue(undefined)
    const s = useReportSubmission({ submit, refresh })
    const rows = Array.from({ length: 10 }, (_, i) => row(i))
    s.request(rows)
    rows.forEach((item, i) => s.setFile(item, pdf(`scan-${i}.pdf`)))
    await s.confirm()
    expect(submit).toHaveBeenCalledTimes(10)
    expect(submit.mock.calls.find(([room]) => room === 'r4')?.[2].name).toBe(
      'scan-4.pdf',
    )
    expect(peak).toBe(3)
    expect(s.done.value).toBe(10)
    expect(s.succeeded.value).toBe(10)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(s.resultOpen.value).toBe(true)
  })

  it('skips non-DRAFT rows and duplicates, and ignores an empty request', () => {
    const s = useReportSubmission({ submit: vi.fn(), refresh: vi.fn() })
    s.request([row(1, { status: 'SUBMITTED' }), row(2, { status: 'VERIFIED' })])
    expect(s.confirmOpen.value).toBe(false)
    s.request([row(1), row(1), row(2, { status: 'SUBMITTED' })])
    expect(s.total.value).toBe(1)
    expect(s.confirmOpen.value).toBe(true)
  })

  it('collects failures, then retries only the failed rooms with their files', async () => {
    let attempt = 0
    const submit = vi.fn((roomId: string) => {
      if (roomId === 'r1') {
        attempt += 1
        return Promise.resolve(
          attempt === 1 ? { success: false as const, error: 'Terkunci' } : ok,
        )
      }
      if (roomId === 'r2') return Promise.reject(new Error('Jaringan'))
      return Promise.resolve(ok)
    })
    const refresh = vi.fn().mockResolvedValue(undefined)
    const s = useReportSubmission({ submit, refresh })
    const rows = [row(1), row(2), row(3), row(4)]
    s.request(rows)
    fill(s, rows)
    await s.confirm()
    expect(submit).toHaveBeenCalledTimes(4)
    expect(s.failures.value).toEqual([
      {
        key: 'r1-s1',
        roomName: 'Ruang 1',
        subjectName: 'Matematika',
        error: 'Terkunci',
      },
      {
        key: 'r2-s1',
        roomName: 'Ruang 2',
        subjectName: 'Matematika',
        error: 'Jaringan',
      },
    ])
    expect(s.succeeded.value).toBe(2)

    await s.retryFailed()
    expect(submit).toHaveBeenCalledTimes(6)
    expect(submit.mock.calls.slice(4).map(([room]) => room)).toEqual([
      'r1',
      'r2',
    ])
    expect(s.succeeded.value).toBe(3)
    expect(s.failures.value.map((item) => item.roomName)).toEqual(['Ruang 2'])
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('day level: choose a subject first, then needs a file for each of its drafts', () => {
    const subject = (id: string, rooms: RoomReportSummary[]): SubjectGroup =>
      ({ id, subjectName: id, rooms }) as SubjectGroup
    const s = useReportSubmission({ submit: vi.fn(), refresh: vi.fn() })
    s.requestDay([
      subject('IPA', [row(1), row(2, { status: 'SUBMITTED' })]),
      subject('IPS', [row(3, { status: 'SUBMITTED' })]),
      subject('MTK', [row(4), row(5)]),
    ])
    expect(s.step.value).toBe('subject')
    expect(s.choices.value).toEqual([
      { id: 'IPA', name: 'IPA', draftCount: 1 },
      { id: 'MTK', name: 'MTK', draftCount: 2 },
    ])
    expect(s.ready.value).toBe(false)
    s.chooseSubject('MTK')
    expect(s.step.value).toBe('files')
    expect(s.total.value).toBe(2)
    expect(s.ready.value).toBe(false)
    fill(s, s.queue.value)
    expect(s.ready.value).toBe(true)
    s.backToSubjects()
    expect(s.step.value).toBe('subject')
    expect(s.total.value).toBe(0)
  })
})
