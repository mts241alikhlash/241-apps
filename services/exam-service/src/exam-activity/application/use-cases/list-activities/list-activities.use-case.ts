import { Injectable, NotFoundException } from '@nestjs/common'
import type { ExamCategory } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
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

@Injectable()
export class ListActivitiesUseCase {
  constructor(
    private readonly activities: ExamActivityRepository,
    private readonly academic: IAcademicLookupPort,
  ) {}

  async execute(category?: ExamCategory): Promise<ExamActivity[]> {
    const semester = await this.academic.activeSemester()
    if (semester === null) return []
    return this.activities.listBySemester(semester.id, category)
  }

  async findOne(id: string): Promise<ActivityDetail> {
    const activity = await this.activities.findById(id)
    if (activity === null) {
      throw new NotFoundException('Kegiatan tidak ditemukan')
    }
    const rows = await this.activities.listSchedules(id)
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
