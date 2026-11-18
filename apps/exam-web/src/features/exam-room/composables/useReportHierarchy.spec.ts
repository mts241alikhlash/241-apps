import { describe, expect, it } from 'vitest'
import { groupReports, NO_SUBJECT } from './useReportHierarchy'
import type { RoomReportSummary } from '../types'

const row = (
  overrides: Partial<RoomReportSummary> = {},
): RoomReportSummary => ({
  roomId: 'r1',
  roomCode: 'R01',
  roomName: 'Ruang 01',
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

const WIB = 'Asia/Jakarta'

describe('groupReports', () => {
  it('splits days by the local date, not the UTC date', () => {
    const days = groupReports(
      [
        row({ slotId: 'a', startsAt: '2026-11-02T17:30:00.000Z' }),
        row({ slotId: 'b', startsAt: '2026-11-02T01:00:00.000Z' }),
      ],
      WIB,
    )

    expect(days.map((day) => day.id)).toEqual(['2026-11-02', '2026-11-03'])
  })

  it('orders subjects of a day by time and counts rooms and participants', () => {
    const [day] = groupReports(
      [
        row({
          slotId: 'late',
          startsAt: '2026-11-02T03:00:00.000Z',
          endsAt: '2026-11-02T04:00:00.000Z',
          subjectNames: ['IPA'],
        }),
        row({ slotId: 'a1', roomId: 'r1' }),
        row({ slotId: 'a2', roomId: 'r2', roomName: 'Ruang 02' }),
      ],
      WIB,
    )

    expect(day.subjects.map((s) => s.subjectName)).toEqual([
      'Matematika',
      'IPA',
    ])
    expect(day.subjects[0]).toMatchObject({
      roomCount: 2,
      participantCount: 20,
    })
    expect(day).toMatchObject({ subjectCount: 2, roomCount: 2, slotCount: 3 })
  })

  it('summarizes how many reports were handed in', () => {
    const [day] = groupReports(
      [
        row({ slotId: 'a1', roomId: 'r1', status: 'SUBMITTED' }),
        row({ slotId: 'a2', roomId: 'r2', status: 'VERIFIED' }),
        row({ slotId: 'a3', roomId: 'r3', status: 'DRAFT' }),
      ],
      WIB,
    )

    expect(day.summary).toBe('2 dari 3 diserahkan')
    expect(day.subjects[0].summary).toBe('2 dari 3 diserahkan')
  })

  it('puts a slot with two subjects under both but counts it once for the day', () => {
    const [day] = groupReports(
      [row({ subjectNames: ['Matematika', 'IPA'], status: 'SUBMITTED' })],
      WIB,
    )

    expect(day.subjects.map((s) => s.subjectName).sort()).toEqual([
      'IPA',
      'Matematika',
    ])
    expect(day.slotCount).toBe(1)
    expect(day.summary).toBe('1 dari 1 diserahkan')
  })

  it('files a slot without subject under Tanpa mapel', () => {
    const [day] = groupReports([row({ subjectNames: [] })], WIB)

    expect(day.subjects[0].subjectName).toBe(NO_SUBJECT)
  })

  it('keeps the same subject at different times as separate groups', () => {
    const [day] = groupReports(
      [
        row({ slotId: 'a' }),
        row({
          slotId: 'b',
          startsAt: '2026-11-02T05:00:00.000Z',
          endsAt: '2026-11-02T06:00:00.000Z',
        }),
      ],
      WIB,
    )

    expect(day.subjects).toHaveLength(2)
  })
})
