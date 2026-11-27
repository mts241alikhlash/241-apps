import { ForbiddenException, Injectable } from '@nestjs/common'
import { ApiForbiddenException } from '../../core/filters/api-exception.js'
import {
  GradingScopeService,
  type GradingUser,
} from '../../exam-grading/application/grading-scope.service.js'
import type { ExamSchedule } from '../domain/entities/exam-schedule.entity.js'
import { categoryOf } from '../domain/policies/exam-category.policy.js'
import { ScheduleScopeService } from './schedule-scope.service.js'

const GRADING_MANAGE_ALL = 'exam-grading.manage-all'

@Injectable()
export class MakeupScopeService {
  constructor(
    private readonly scope: GradingScopeService,
    private readonly schedules: ScheduleScopeService,
  ) {}

  async assertCanRead(
    user: GradingUser,
    schedule: ExamSchedule,
  ): Promise<void> {
    if ((await this.schedules.forUser(user)).allRead) return
    const scope = await this.scope.forRead(user)
    await this.verify(scope, schedule)
  }

  async assertCanWrite(
    user: GradingUser,
    schedule: ExamSchedule,
  ): Promise<void> {
    if (
      (await this.schedules.forUser(user)).allManage ||
      user.permissions.includes(GRADING_MANAGE_ALL)
    ) {
      return
    }
    if (categoryOf(schedule.type) === 'EXAM') {
      throw new ApiForbiddenException(
        'EXAM_ADMIN_ONLY',
        'Jadwal ujian hanya dapat dikelola oleh panitia atau admin ujian.',
      )
    }
    const scope = await this.scope.forWrite(user)
    await this.verify(scope, schedule)
  }

  private async verify(
    scope: Awaited<ReturnType<GradingScopeService['forRead']>>,
    schedule: ExamSchedule,
  ): Promise<void> {
    const allowed = await scope.allows(
      schedule.subjectId,
      schedule.classroomId,
      schedule.semesterId,
    )
    if (!allowed) {
      throw new ForbiddenException('Anda tidak mengajar mapel ini di kelas ini')
    }
  }
}
