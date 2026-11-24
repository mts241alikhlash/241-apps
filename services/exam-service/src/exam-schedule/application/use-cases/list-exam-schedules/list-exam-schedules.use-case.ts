import { Injectable } from '@nestjs/common'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import type { PaginatedResult } from '@mts241alikhlash/nest-core/domain'
import type { ExamScheduleView } from '../../../domain/entities/exam-schedule.entity.js'
import { IScheduleSessionGuard } from '../../../domain/ports/schedule-session-guard.port.js'
import {
  IExamScheduleRepository,
  type ExamScheduleListQuery,
} from '../../../domain/repositories/exam-schedule.repository.js'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from '../../schedule-scope.service.js'
import { withClassroomNames } from '../../with-classroom-names.js'

@Injectable()
export class ListExamSchedulesUseCase {
  constructor(
    private readonly schedules: IExamScheduleRepository,
    private readonly academic: IAcademicLookupPort,
    private readonly guard: IScheduleSessionGuard,
    private readonly scheduleScope: ScheduleScopeService,
  ) {}

  async execute(
    input: Partial<ExamScheduleListQuery>,
    user: ScheduleAccessUser,
  ): Promise<PaginatedResult<ExamScheduleView>> {
    let allowedPairs = input.allowedPairs
    const scope = await this.scheduleScope.forUser(user)
    if (!scope.allRead) {
      const semester = await this.academic.activeSemester()
      allowedPairs = semester ? await scope.pairsFor(semester.id) : []
    }
    const page = await this.schedules.findAll({
      ...input,
      allowedPairs,
      page: input.page ?? 1,
      limit: input.limit ?? 10,
    })
    const [named, started] = await Promise.all([
      withClassroomNames(this.academic, page.data),
      this.guard.idsWithSessions(page.data.map((row) => row.id)),
    ])
    return {
      ...page,
      data: named.map((row) => ({ ...row, hasSessions: started.has(row.id) })),
    }
  }
}
