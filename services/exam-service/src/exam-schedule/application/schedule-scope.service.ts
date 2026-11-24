import { Injectable } from '@nestjs/common'
import { ApiForbiddenException } from '../../core/filters/api-exception.js'
import type { ExamActivity } from '../../exam-activity/domain/entities/exam-activity.entity.js'
import {
  IAcademicLookupPort,
  type TeachingAssignmentRef,
} from '../../platform/academic-lookup/academic-lookup.port.js'
import { IEmployeeIdentityReadPort } from '../../platform/employee-identity/employee-identity.port.js'
import type { ExamSchedule } from '../domain/entities/exam-schedule.entity.js'
import { categoryOf } from '../domain/policies/exam-category.policy.js'

const MANAGE_ALL = 'exam-schedules.manage-all'
const EVENTS_MANAGE = 'exam-events.manage'
const EVENTS_READ = 'exam-events.read'

export interface ScheduleAccessUser {
  id: string
  roles?: string[]
  permissions?: string[]
}

export type ActivityScopeTarget = Pick<
  ExamActivity,
  'type' | 'semesterId' | 'gradeId' | 'subjectId'
> & {
  createdById?: string
  classroomIds?: string[]
}

export type ScheduleScopeTarget = Pick<
  ExamSchedule,
  'type' | 'kind' | 'subjectId' | 'classroomId' | 'semesterId'
> & {
  createdById?: string
}

export interface ScheduleScope {
  allRead: boolean
  allManage: boolean
  nonExamOnly: boolean
  pairsFor(semesterId: string): Promise<TeachingAssignmentRef[]>
  assertCanReadActivity(activity: ActivityScopeTarget): Promise<void>
  assertCanManageActivity(
    activity: ActivityScopeTarget,
    classroomIds?: string[],
  ): Promise<void>
  assertCanReadSchedule(schedule: ScheduleScopeTarget): Promise<void>
  assertCanManageSchedule(schedule: ScheduleScopeTarget): Promise<void>
  filterActivities<T extends ActivityScopeTarget>(activities: T[]): Promise<T[]>
}

function forbiddenSchedule(): ApiForbiddenException {
  return new ApiForbiddenException(
    'SCHEDULE_FORBIDDEN',
    'Anda tidak berwenang pada kegiatan atau jadwal ini',
  )
}

@Injectable()
export class ScheduleScopeService {
  constructor(
    private readonly employees: IEmployeeIdentityReadPort,
    private readonly academic: IAcademicLookupPort,
  ) {}

  forUser(user: ScheduleAccessUser): Promise<ScheduleScope> {
    const perms = user.permissions ?? []
    const hasManageAll = perms.includes(MANAGE_ALL)
    const hasEventsManage = perms.includes(EVENTS_MANAGE)
    const allManage = hasManageAll || hasEventsManage
    const allRead = allManage || perms.includes(EVENTS_READ)
    const nonExamOnly = !allManage

    let employeeIdPromise: Promise<string | null> | null = null
    const employeeIdOf = (): Promise<string | null> => {
      employeeIdPromise ??= this.employees.findEmployeeIdByUserId(user.id)
      return employeeIdPromise
    }

    const assignmentCache = new Map<string, Promise<TeachingAssignmentRef[]>>()
    const pairsFor = (semesterId: string): Promise<TeachingAssignmentRef[]> => {
      let cached = assignmentCache.get(semesterId)
      if (cached === undefined) {
        cached = employeeIdOf().then((employeeId) =>
          employeeId === null
            ? []
            : this.academic.teachingAssignmentsOf(employeeId, semesterId),
        )
        assignmentCache.set(semesterId, cached)
      }
      return cached
    }

    const gradeCache = new Map<string, Promise<Map<string, Set<string>>>>()
    const gradesBySubjectFor = (
      semesterId: string,
    ): Promise<Map<string, Set<string>>> => {
      let cached = gradeCache.get(semesterId)
      if (cached === undefined) {
        cached = pairsFor(semesterId).then(async (pairs) => {
          const result = new Map<string, Set<string>>()
          if (pairs.length === 0) return result
          const classroomIds = [
            ...new Set(pairs.map((pair) => pair.classroomId)),
          ]
          const classrooms = await this.academic.classroomsByIds(classroomIds)
          const gradeOfClassroom = new Map(
            classrooms.map((room) => [room.id, room.gradeId]),
          )
          for (const pair of pairs) {
            const gradeId = gradeOfClassroom.get(pair.classroomId)
            if (gradeId === undefined) continue
            let grades = result.get(pair.subjectId)
            if (grades === undefined) {
              grades = new Set()
              result.set(pair.subjectId, grades)
            }
            grades.add(gradeId)
          }
          return result
        })
        gradeCache.set(semesterId, cached)
      }
      return cached
    }

    const teachesSchedule = async (
      semesterId: string,
      subjectId: string,
      classroomId: string,
    ): Promise<boolean> =>
      (await pairsFor(semesterId)).some(
        (pair) =>
          pair.subjectId === subjectId && pair.classroomId === classroomId,
      )

    const teachesActivity = async (
      activity: ActivityScopeTarget,
    ): Promise<boolean> => {
      const grades = await gradesBySubjectFor(activity.semesterId)
      return grades.get(activity.subjectId)?.has(activity.gradeId) ?? false
    }

    const teachesActivityClassrooms = async (
      activity: ActivityScopeTarget,
      classroomIds: string[],
    ): Promise<boolean> => {
      const pairs = await pairsFor(activity.semesterId)
      return classroomIds.every((classroomId) =>
        pairs.some(
          (pair) =>
            pair.subjectId === activity.subjectId &&
            pair.classroomId === classroomId,
        ),
      )
    }

    const teachesAnyActivityClassroom = async (
      activity: ActivityScopeTarget,
      classroomIds: string[],
    ): Promise<boolean> => {
      const pairs = await pairsFor(activity.semesterId)
      return classroomIds.some((classroomId) =>
        pairs.some(
          (pair) =>
            pair.subjectId === activity.subjectId &&
            pair.classroomId === classroomId,
        ),
      )
    }

    const canReadActivity = async (
      activity: ActivityScopeTarget,
    ): Promise<boolean> => {
      if (allRead) return true
      if (categoryOf(activity.type) === 'EXAM') return false
      if (
        activity.createdById !== undefined &&
        activity.createdById === user.id
      ) {
        return true
      }
      if (
        activity.classroomIds !== undefined &&
        activity.classroomIds.length > 0
      ) {
        return teachesAnyActivityClassroom(activity, activity.classroomIds)
      }
      return teachesActivity(activity)
    }

    return Promise.resolve({
      allRead,
      allManage,
      nonExamOnly,
      pairsFor,
      assertCanReadActivity: async (activity) => {
        if (!(await canReadActivity(activity))) {
          throw forbiddenSchedule()
        }
      },
      assertCanManageActivity: async (activity, classroomIds) => {
        if (activity.type === 'FINAL' && !hasManageAll) {
          throw new ApiForbiddenException(
            'FINAL_ADMIN_ONLY',
            'Penilaian Akhir Semester hanya dapat dibuat oleh tata usaha atau kurikulum.',
          )
        }
        if (allManage) return
        if (categoryOf(activity.type) === 'EXAM') {
          throw new ApiForbiddenException(
            'EXAM_ADMIN_ONLY',
            'Kegiatan ujian hanya dapat dikelola oleh panitia atau admin ujian.',
          )
        }
        const targetClassrooms =
          classroomIds !== undefined && classroomIds.length > 0
            ? classroomIds
            : activity.classroomIds
        if (targetClassrooms !== undefined && targetClassrooms.length > 0) {
          if (
            activity.createdById !== undefined &&
            activity.createdById === user.id &&
            classroomIds === undefined
          ) {
            return
          }
          if (!(await teachesActivityClassrooms(activity, targetClassrooms))) {
            throw forbiddenSchedule()
          }
          return
        }
        if (
          activity.createdById !== undefined &&
          activity.createdById === user.id
        ) {
          return
        }
        if (!(await teachesActivity(activity))) {
          throw forbiddenSchedule()
        }
      },
      assertCanReadSchedule: async (schedule) => {
        if (allRead) return
        if (
          categoryOf(schedule.type) === 'NON_EXAM' &&
          schedule.createdById !== undefined &&
          schedule.createdById === user.id
        ) {
          return
        }
        if (
          await teachesSchedule(
            schedule.semesterId,
            schedule.subjectId,
            schedule.classroomId,
          )
        ) {
          return
        }
        throw forbiddenSchedule()
      },
      assertCanManageSchedule: async (schedule) => {
        if (
          schedule.type === 'FINAL' &&
          schedule.kind !== 'MAKEUP' &&
          !hasManageAll
        ) {
          throw new ApiForbiddenException(
            'FINAL_ADMIN_ONLY',
            'Penilaian Akhir Semester hanya dapat dikelola oleh admin ujian.',
          )
        }
        if (allManage) return
        if (categoryOf(schedule.type) === 'EXAM') {
          if (
            schedule.kind === 'MAKEUP' &&
            (await teachesSchedule(
              schedule.semesterId,
              schedule.subjectId,
              schedule.classroomId,
            ))
          ) {
            return
          }
          throw new ApiForbiddenException(
            'EXAM_ADMIN_ONLY',
            'Jadwal ujian hanya dapat dikelola oleh panitia atau admin ujian.',
          )
        }
        if (
          schedule.createdById !== undefined &&
          schedule.createdById === user.id
        ) {
          return
        }
        if (
          await teachesSchedule(
            schedule.semesterId,
            schedule.subjectId,
            schedule.classroomId,
          )
        ) {
          return
        }
        throw forbiddenSchedule()
      },
      filterActivities: async <T extends ActivityScopeTarget>(
        activities: T[],
      ): Promise<T[]> => {
        if (allRead) return activities
        const kept: T[] = []
        for (const activity of activities) {
          if (await canReadActivity(activity)) {
            kept.push(activity)
          }
        }
        return kept
      },
    })
  }
}
