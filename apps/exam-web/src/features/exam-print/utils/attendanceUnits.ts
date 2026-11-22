import { dayKeyOf } from '@/features/exam-schedule/utils/groupSchedules'
import type { PrintPack, PrintSchedule } from '../types'

export interface AttendanceStudent {
  studentId: string
  name: string | null
  classroomName: string | null
  participantNumber: string | null
  seatNumber: number
}

export interface AttendanceRoom {
  key: string
  roomId: string
  roomCode: string
  roomName: string
  startsAt: string
  endsAt: string
  subject: string
  students: AttendanceStudent[]
  supervisorName: string | null
  technicianName: string | null
}

export interface AttendanceSubject {
  id: string
  dayKey: string
  subject: string
  startsAt: string
  endsAt: string
  rooms: AttendanceRoom[]
  roomCount: number
  studentCount: number
}

export interface AttendanceDay {
  id: string
  startsAt: string
  subjects: AttendanceSubject[]
  subjectCount: number
  roomCount: number
  studentCount: number
}

const slug = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const time = (iso: string): number => new Date(iso).getTime()

const subjectNode = (
  key: string,
  items: PrintSchedule[],
  subject: string,
  rooms: AttendanceRoom[],
): AttendanceSubject => ({
  id: key,
  dayKey: dayKeyOf(items[0].startsAt),
  subject,
  startsAt: items[0].startsAt,
  endsAt: items[0].endsAt,
  rooms,
  roomCount: rooms.length,
  studentCount: rooms.reduce((sum, room) => sum + room.students.length, 0),
})

const dayNode = (id: string, subjects: AttendanceSubject[]): AttendanceDay => ({
  id,
  startsAt: subjects[0].startsAt,
  subjects,
  subjectCount: subjects.length,
  roomCount: subjects.reduce((sum, item) => sum + item.roomCount, 0),
  studentCount: subjects.reduce((sum, item) => sum + item.studentCount, 0),
})

export function buildAttendanceDays(
  pack: PrintPack,
  schedules: PrintSchedule[],
  subjectOf: (schedule: PrintSchedule) => string,
): AttendanceDay[] {
  const groups = new Map<
    string,
    { subject: string; items: PrintSchedule[]; classes: Set<string> }
  >()
  for (const schedule of schedules) {
    if (schedule.status === 'CANCELLED' || schedule.kind === 'MAKEUP') continue
    const subject = subjectOf(schedule)
    const key = `${time(schedule.startsAt)}-${time(schedule.endsAt)}-${slug(subject)}`
    const group = groups.get(key) ?? {
      subject,
      items: [],
      classes: new Set<string>(),
    }
    group.items.push(schedule)
    if (schedule.classroomName !== null)
      group.classes.add(schedule.classroomName)
    groups.set(key, group)
  }

  const byDay = new Map<string, AttendanceSubject[]>()
  for (const [key, group] of groups) {
    const start = time(group.items[0].startsAt)
    const rooms = pack.rooms
      .map((room): AttendanceRoom | null => {
        const students = room.students
          .filter(
            (student) =>
              student.classroomName !== null &&
              group.classes.has(student.classroomName),
          )
          .map((student) => ({
            studentId: student.studentId,
            name: student.name,
            classroomName: student.classroomName,
            participantNumber: student.participantNumber,
            seatNumber: student.seatNumber,
          }))
          .sort((left, right) => left.seatNumber - right.seatNumber)
        if (students.length === 0) return null
        const duty = room.supervisors.find(
          (slot) => time(slot.startsAt) <= start && start < time(slot.endsAt),
        )
        return {
          key: `${key}-${room.id}`,
          roomId: room.id,
          roomCode: room.code,
          roomName: room.name,
          startsAt: group.items[0].startsAt,
          endsAt: group.items[0].endsAt,
          subject: group.subject,
          students,
          supervisorName: duty?.name ?? null,
          technicianName: room.technician?.name ?? null,
        }
      })
      .filter((room): room is AttendanceRoom => room !== null)
      .sort((left, right) => left.roomName.localeCompare(right.roomName, 'id'))
    if (rooms.length === 0) continue
    const node = subjectNode(key, group.items, group.subject, rooms)
    byDay.set(node.dayKey, [...(byDay.get(node.dayKey) ?? []), node])
  }

  return [...byDay]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, subjects]) =>
      dayNode(
        id,
        subjects.sort(
          (left, right) =>
            left.startsAt.localeCompare(right.startsAt) ||
            left.subject.localeCompare(right.subject, 'id'),
        ),
      ),
    )
}

export function filterAttendanceDays(
  days: AttendanceDay[],
  keyword: string,
): AttendanceDay[] {
  const needle = keyword.trim().toLocaleLowerCase('id')
  if (needle === '') return days
  return days.flatMap((day) => {
    const subjects = day.subjects.flatMap((item) => {
      const rooms = item.rooms.filter((room) =>
        [room.roomCode, room.roomName, room.subject].some((value) =>
          value.toLocaleLowerCase('id').includes(needle),
        ),
      )
      return rooms.length === 0
        ? []
        : [
            {
              ...item,
              rooms,
              roomCount: rooms.length,
              studentCount: rooms.reduce(
                (sum, room) => sum + room.students.length,
                0,
              ),
            },
          ]
    })
    return subjects.length === 0 ? [] : [dayNode(day.id, subjects)]
  })
}
