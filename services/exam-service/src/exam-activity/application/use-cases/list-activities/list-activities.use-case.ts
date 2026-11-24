import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { ExamCategory } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { categoryOf } from '../../../../exam-schedule/domain/policies/exam-category.policy.js'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from '../../../../exam-schedule/application/schedule-scope.service.js'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'

export interface ActivityDetailSchedule {
  scheduleId: string
  classroomId: string
  classroomName: string | null
  startsAt: Date
  endsAt: Date
}

export interface ActivityDetail {
  activity: ExamActivity
  schedules: ActivityDetailSchedule[]
}

export interface NamedActivity {
  activity: ExamActivity
  subjectName: string | null
  gradeName: string | null
}

@Injectable()
export class ListActivitiesUseCase {
  constructor(
    private readonly activities: ExamActivityRepository,
    private readonly academic: IAcademicLookupPort,
    @Inject(forwardRef(() => ScheduleScopeService))
    private readonly scheduleScope: ScheduleScopeService,
  ) {}

  async execute(
    user: ScheduleAccessUser,
    category?: ExamCategory,
  ): Promise<ExamActivity[]> {
    const semester = await this.academic.activeSemester()
    if (semester === null) return []
    const rows = await this.activities.listBySemester(semester.id, category)
    const scope = await this.scheduleScope.forUser(user)
    if (scope.allRead) return rows
    const targets = await Promise.all(
      rows.map(async (row) => {
        if (categoryOf(row.type) === 'EXAM' || row.createdById === user.id) {
          return row
        }
        const schedules = await this.activities.listSchedules(row.id)
        return {
          ...row,
          classroomIds: schedules.map((item) => item.classroomId),
        }
      }),
    )
    return scope.filterActivities(targets)
  }

  async listNamed(
    user: ScheduleAccessUser,
    category?: ExamCategory,
  ): Promise<NamedActivity[]> {
    const activities = await this.execute(user, category)
    const subjects = new Map(
      (
        await this.academic.subjectsByIds([
          ...new Set(activities.map((row) => row.subjectId)),
        ])
      ).map((row) => [row.id, row.name]),
    )
    const grades = new Map(
      (
        await this.academic.gradesByIds([
          ...new Set(activities.map((row) => row.gradeId)),
        ])
      ).map((row) => [row.id, row.name ?? `Kelas ${row.level}`]),
    )
    return activities.map((activity) => ({
      activity,
      subjectName: subjects.get(activity.subjectId) ?? null,
      gradeName: grades.get(activity.gradeId) ?? null,
    }))
  }

  async findOne(id: string, user: ScheduleAccessUser): Promise<ActivityDetail> {
    const activity = await this.activities.findById(id)
    if (activity === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    const scope = await this.scheduleScope.forUser(user)
    const rows = await this.activities.listSchedules(id)
    await scope.assertCanReadActivity({
      ...activity,
      classroomIds: rows.map((row) => row.classroomId),
    })
    const ids = [...new Set(rows.map((row) => row.classroomId))]
    const names = new Map(
      (await this.academic.classroomsByIds(ids)).map((room) => [
        room.id,
        room.name,
      ]),
    )
    return {
      activity,
      schedules: rows.map((row) => ({
        scheduleId: row.id,
        classroomId: row.classroomId,
        classroomName: names.get(row.classroomId) ?? null,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      })),
    }
  }
}
