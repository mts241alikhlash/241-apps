import { describe, it, expect } from 'vitest'
import type { Attendance, AttendanceStatus } from '../types'

function totals(rows: Attendance[]) {
  const count = (status: string) =>
    rows.filter((r) => r.status === status).length
  return {
    present: count('PRESENT'),
    late: count('LATE'),
    sick: count('SICK'),
    excused: count('EXCUSED'),
    absent: count('ABSENT'),
    total: rows.length,
  }
}

function row(status: AttendanceStatus): Attendance {
  return {
    id: crypto.randomUUID(),
    enrollmentId: 'enr-1',
    date: '2026-08-14',
    status,
  }
}

describe("a student's own attendance totals", () => {
  it('counts each status separately', () => {
    const result = totals([
      row('PRESENT'),
      row('PRESENT'),
      row('LATE'),
      row('SICK'),
      row('ABSENT'),
    ])

    expect(result).toEqual({
      present: 2,
      late: 1,
      sick: 1,
      excused: 0,
      absent: 1,
      total: 5,
    })
  })

  it('accounts for every row, so the parts sum to the total', () => {
    const rows = [
      row('PRESENT'),
      row('LATE'),
      row('SICK'),
      row('EXCUSED'),
      row('ABSENT'),
    ]
    const t = totals(rows)

    expect(t.present + t.late + t.sick + t.excused + t.absent).toBe(t.total)
  })

  it('reports zeroes rather than failing on an empty record', () => {
    expect(totals([])).toEqual({
      present: 0,
      late: 0,
      sick: 0,
      excused: 0,
      absent: 0,
      total: 0,
    })
  })
})
