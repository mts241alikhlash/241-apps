import { describe, expect, it } from 'vitest'
import type { ExamActivityRecord } from '../types'
import { buildTimetable } from './buildTimetable'

function row(
  subjectName: string,
  gradeName: string,
  startsAt: string,
  endsAt: string,
): ExamActivityRecord {
  return { subjectName, gradeName, startsAt, endsAt } as ExamActivityRecord
}

describe('buildTimetable', () => {
  it('groups grades of one subject into one entry per slot, by Jakarta day', () => {
    const days = buildTimetable([
      row(
        'Matematika',
        'Kelas 8',
        '2026-11-24T00:00:00.000Z',
        '2026-11-24T01:15:00.000Z',
      ),
      row(
        'Matematika',
        'Kelas 7',
        '2026-11-24T00:00:00.000Z',
        '2026-11-24T01:15:00.000Z',
      ),
      row(
        'Fikih',
        'Kelas 7',
        '2026-11-23T00:00:00.000Z',
        '2026-11-23T01:15:00.000Z',
      ),
    ])

    expect(days.map((day) => day.key)).toEqual(['2026-11-23', '2026-11-24'])
    expect(days[1].slots[0].time).toBe('07.00 – 08.15')
    expect(days[1].slots[0].entries).toEqual([
      { subject: 'Matematika', grades: ['Kelas 8', 'Kelas 7'] },
    ])
  })
})
