import { examActivityApi } from '@/features/exam-activity/api/examActivityApi'
import type { ExamActivityRecord } from '@/features/exam-activity/types'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { SCHEDULE_PAGE_LIMIT, examPrintApi } from '../api/examPrintApi'
import type { PrintPack, PrintSchedule, ResetCredentials } from '../types'

export type PrintOutcome<T> =
  { success: true; data: T } | { success: false; error: string }

const failure = <T>(err: unknown, fallback: string): PrintOutcome<T> => ({
  success: false,
  error: messageOf(err, fallback),
})

export const scheduleOfActivity = (
  activity: ExamActivityRecord,
): PrintSchedule => ({
  id: activity.id,
  activityId: activity.id,
  category: activity.category,
  classroomId: activity.gradeId,
  classroomName: activity.gradeName,
  createdAt: activity.startsAt,
  createdById: '',
  durationMinutes: activity.durationMinutes,
  endsAt: activity.endsAt,
  eventId: activity.eventId,
  hasSessions: false,
  kind: 'REGULAR',
  makeupOfId: null,
  minSubmitMinutes: 0,
  packageId: activity.packageId ?? activity.id,
  packageTitle: activity.subjectName ?? '-',
  semesterId: activity.semesterId,
  startsAt: activity.startsAt,
  status: 'SCHEDULED',
  type: activity.type,
  updatedAt: activity.startsAt,
})

export const examPrintService = {
  async loadPack(eventId: string): Promise<PrintOutcome<PrintPack>> {
    try {
      return { success: true, data: await examPrintApi.getPrintPack(eventId) }
    } catch (err: unknown) {
      return failure(err, 'Data cetak tidak dapat dimuat.')
    }
  },

  async resetCredentials(
    eventId: string,
    roomId?: string,
  ): Promise<PrintOutcome<ResetCredentials>> {
    try {
      return {
        success: true,
        data: await examPrintApi.resetCredentials(eventId, roomId),
      }
    } catch (err: unknown) {
      return failure(err, 'Kata sandi tidak dapat direset.')
    }
  },

  async loadActivitySchedules(
    event: PrintPack['event'],
  ): Promise<PrintOutcome<PrintSchedule[]>> {
    try {
      const activities = await examActivityApi.list({ category: 'EXAM' })
      return {
        success: true,
        data: activities
          .filter((activity) => activity.eventId === event.id)
          .map(scheduleOfActivity),
      }
    } catch (err: unknown) {
      return failure(err, 'Jadwal ujian tidak dapat dimuat.')
    }
  },

  async loadSchedules(
    event: PrintPack['event'],
  ): Promise<PrintOutcome<PrintSchedule[]>> {
    try {
      const collected: PrintSchedule[] = []
      let page = 1
      for (;;) {
        const result = await examPrintApi.getSchedules(event, page)
        collected.push(
          ...result.data.filter((schedule) => schedule.eventId === event.id),
        )
        const seen = (page - 1) * SCHEDULE_PAGE_LIMIT + result.data.length
        if (
          result.data.length < SCHEDULE_PAGE_LIMIT ||
          seen >= result.meta.total
        ) {
          break
        }
        page += 1
      }
      return { success: true, data: collected }
    } catch (err: unknown) {
      return failure(err, 'Jadwal ujian tidak dapat dimuat.')
    }
  },
}
