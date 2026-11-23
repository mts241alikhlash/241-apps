import { examGradingApi } from '@/features/exam-grading/api/examGradingApi'
import { examGradingService } from '@/features/exam-grading/services/examGradingService'
import type {
  GradingSchedule,
  GradingSessionRow,
} from '@/features/exam-grading/types'
import type { ExamCategory } from '@/features/exam-shared/examType'
import { participantNumberApi } from '@/features/exam-participant/api/participantNumberApi'
import { teachingAssignmentApi } from '@/features/lookup/teaching-assignment'
import type { GradingSheetStudent } from '../documents/gradingSheet'

const PAGE_LIMIT = 100
const DETAIL_BATCH = 8

export interface LoadedSheet {
  schedule: GradingSchedule
  subject: string
  teacher: string
  students: GradingSheetStudent[]
}

export interface SessionPerson extends GradingSessionRow {
  participantNumber: string | null
}

async function loadAll<T>(
  fetchPage: (page: number) => Promise<{ data: T[]; meta: { total: number } }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let page = 1; ; page += 1) {
    const result = await fetchPage(page)
    rows.push(...result.data)
    if (result.data.length === 0 || rows.length >= result.meta.total) break
  }
  return rows
}

async function numbersOf(semesterId: string, studentIds: string[]) {
  if (studentIds.length === 0) return new Map<string, string>()
  try {
    const items = await participantNumberApi.lookup(semesterId, studentIds)
    return new Map(items.map((item) => [item.studentId, item.number]))
  } catch {
    return new Map<string, string>()
  }
}

const teachers = new Map<string, string>()

async function teacherOf(schedule: GradingSchedule): Promise<string> {
  const key = `${schedule.semesterId}|${schedule.classroomId}|${schedule.subjectId}`
  const cached = teachers.get(key)
  if (cached !== undefined) return cached
  const query = {
    classroomId: schedule.classroomId,
    subjectId: schedule.subjectId,
    semesterId: schedule.semesterId,
    limit: 10,
  }
  let name = ''
  for (const load of [
    teachingAssignmentApi.getTeachingAssignments,
    teachingAssignmentApi.getMyTeachingAssignments,
  ]) {
    try {
      const result = await load(query)
      const found = result.data.find(
        (item) =>
          (item.classroomId ?? item.classroom?.id) === schedule.classroomId &&
          (item.subjectId ?? item.subject?.id) === schedule.subjectId,
      )
      const value = found?.employee?.user?.profile?.name
      if (value) {
        name = value
        break
      }
    } catch {
      continue
    }
  }
  teachers.set(key, name)
  return name
}

export const gradingSheetService = {
  loadSchedules(
    category: ExamCategory | undefined,
    semesterId: string,
  ): Promise<GradingSchedule[]> {
    return loadAll((page) =>
      examGradingApi.getSchedules({
        page,
        limit: PAGE_LIMIT,
        category,
        semesterId: semesterId === '' ? undefined : semesterId,
      }),
    )
  },

  async loadPeople(schedule: GradingSchedule): Promise<SessionPerson[]> {
    const rows = (
      await loadAll((page) =>
        examGradingApi.getSessions(schedule.id, { page, limit: PAGE_LIMIT }),
      )
    ).filter((row) => row.status !== 'IN_PROGRESS')
    const numbers = await numbersOf(
      schedule.semesterId,
      rows.map((row) => row.studentId),
    )
    return rows
      .map((row) => ({
        ...row,
        participantNumber: numbers.get(row.studentId) ?? null,
      }))
      .sort((left, right) =>
        (left.studentName ?? '').localeCompare(right.studentName ?? '', 'id'),
      )
  },

  async loadSheet(
    schedule: GradingSchedule,
    subject: string,
    onlyStudentId?: string,
  ): Promise<LoadedSheet> {
    const people = (await this.loadPeople(schedule)).filter(
      (row) => onlyStudentId === undefined || row.studentId === onlyStudentId,
    )
    const students: GradingSheetStudent[] = []
    for (let start = 0; start < people.length; start += DETAIL_BATCH) {
      const batch = people.slice(start, start + DETAIL_BATCH)
      const details = await Promise.all(
        batch.map((row) => examGradingService.loadSession(row.sessionId)),
      )
      details.forEach((detail, index) => {
        const row = batch[index]
        if (!detail.success) return
        const items = detail.data.items
          .filter((item) => item.manual)
          .sort((left, right) => left.number - right.number)
        if (items.length === 0) return
        students.push({
          key: row.sessionId,
          studentId: row.studentId,
          name: row.studentName,
          participantNumber: row.participantNumber,
          items,
        })
      })
    }
    return { schedule, subject, teacher: await teacherOf(schedule), students }
  },
}
