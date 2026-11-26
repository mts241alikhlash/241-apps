import { describe, expect, it } from 'vitest'
import type { PrintPack, PrintSchedule } from '../types'
import { buildAttendanceDays } from './attendanceUnits'

const pack: PrintPack = {
  event: {
    id: 'e1',
    name: 'ASAS Ganjil',
    startsAt: '2026-11-23T00:00:00.000Z',
    endsAt: '2026-12-05T00:00:00.000Z',
  },
  rooms: [
    {
      id: 'r1',
      code: 'R01',
      name: 'Ruang 1',
      building: null,
      technician: { name: 'Teknisi' },
      supervisors: [
        {
          startsAt: '2026-11-24T00:00:00.000Z',
          endsAt: '2026-11-24T01:15:00.000Z',
          name: 'Pengawas 1',
        },
      ],
      students: [
        {
          seatNumber: 1,
          studentId: 's1',
          name: 'Siswa 7A',
          nis: '101',
          classroomName: 'VII-A',
          participantNumber: '001',
        },
        {
          seatNumber: 2,
          studentId: 's2',
          name: 'Siswa 9A',
          nis: '201',
          classroomName: 'IX-A',
          participantNumber: '002',
        },
      ],
    },
  ],
  warnings: [],
}

const activitySchedule = (
  id: string,
  gradeId: string,
  gradeName: string,
  packageTitle: string,
): PrintSchedule => ({
  id,
  activityId: id,
  category: 'EXAM',
  classroomId: gradeId,
  classroomName: gradeName,
  createdAt: '2026-11-24T00:00:00.000Z',
  createdById: '',
  deliveryMode: 'ONLINE',
  durationMinutes: 75,
  endsAt: '2026-11-24T01:15:00.000Z',
  eventId: 'e1',
  hasSessions: false,
  kind: 'REGULAR',
  makeupOfId: null,
  minSubmitMinutes: 0,
  packageId: id,
  packageTitle,
  semesterId: 'sem-1',
  startsAt: '2026-11-24T00:00:00.000Z',
  status: 'SCHEDULED',
  type: 'FINAL',
  updatedAt: '2026-11-24T00:00:00.000Z',
})

describe('buildAttendanceDays', () => {
  it('matches grade-scoped activity schedules to student classroom names', () => {
    const gradeClassrooms = new Map<string, readonly string[]>([
      ['grade-7', ['VII-A', 'VII-B']],
      ['Kelas 7', ['VII-A', 'VII-B']],
    ])

    const days = buildAttendanceDays(
      pack,
      [activitySchedule('a1', 'grade-7', 'Kelas 7', 'Akidah Akhlak')],
      (item) => item.packageTitle ?? '',
      gradeClassrooms,
    )

    expect(days).toHaveLength(1)
    expect(days[0].subjects).toHaveLength(1)
    expect(days[0].subjects[0].subject).toBe('Akidah Akhlak')
    expect(days[0].subjects[0].rooms).toHaveLength(1)
    expect(days[0].subjects[0].rooms[0].students.map((s) => s.name)).toEqual([
      'Siswa 7A',
    ])
    expect(days[0].subjects[0].rooms[0].supervisorName).toBe('Pengawas 1')
  })

  it('still matches direct classroom names when no grade map matches', () => {
    const days = buildAttendanceDays(
      pack,
      [activitySchedule('s1', 'cls-9a', 'IX-A', 'Matematika')],
      (item) => item.packageTitle ?? '',
    )

    expect(days).toHaveLength(1)
    expect(days[0].subjects[0].rooms[0].students.map((s) => s.name)).toEqual([
      'Siswa 9A',
    ])
  })
})
