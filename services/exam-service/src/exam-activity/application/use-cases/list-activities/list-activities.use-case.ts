import { Injectable } from '@nestjs/common'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'

@Injectable()
export class ListActivitiesUseCase {
  constructor(
    private readonly activities: ExamActivityRepository,
    private readonly academic: IAcademicLookupPort,
  ) {}

  async execute(): Promise<ExamActivity[]> {
    const semester = await this.academic.activeSemester()
    if (semester === null) return []
    return this.activities.listBySemester(semester.id)
  }
}
