import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { loadPaperSources } from '../../../../exam-session/application/load-paper-sources.js'
import { IExamPackageRepository } from '../../../../exam-package/domain/repositories/exam-package.repository.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IExamSessionRepository } from '../../../../exam-session/domain/repositories/exam-session.repository.js'
import { IStudentDirectoryPort } from '../../../../platform/student-directory/student-directory.port.js'
import { IQuestionRepository } from '../../../../question/domain/repositories/question.repository.js'
import {
  toGradingSessionDetail,
  type GradingSessionDetail,
} from '../../grading-item.js'
import {
  GradingScopeService,
  type GradingUser,
} from '../../grading-scope.service.js'

export type { GradingSessionDetail }

@Injectable()
export class GetGradingSessionUseCase {
  constructor(
    private readonly scope: GradingScopeService,
    private readonly schedules: IExamScheduleRepository,
    private readonly packages: IExamPackageRepository,
    private readonly questions: IQuestionRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly students: IStudentDirectoryPort,
  ) {}

  async execute(
    user: GradingUser,
    sessionId: string,
  ): Promise<GradingSessionDetail> {
    const session = await this.sessions.findById(sessionId)
    const schedule = session
      ? await this.schedules.findById(session.scheduleId)
      : null
    const scope = await this.scope.forRead(user)
    if (
      session === null ||
      schedule === null ||
      !(await scope.allows(
        schedule.subjectId,
        schedule.classroomId,
        schedule.semesterId,
      ))
    ) {
      throw new NotFoundException('Sesi ujian tidak ditemukan')
    }
    if (session.status === 'IN_PROGRESS') {
      throw new ConflictException('Sesi ujian belum selesai')
    }

    const [sources, answers, refs] = await Promise.all([
      loadPaperSources(
        this.schedules,
        this.packages,
        this.questions,
        session.scheduleId,
      ),
      this.sessions.listAnswers(session.id),
      this.students.refsByIds([session.studentId]),
    ])

    return toGradingSessionDetail(session, sources, answers, refs[0] ?? null)
  }
}
