import { Injectable, NotFoundException } from '@nestjs/common'
import { loadPaperSources } from '../../../../exam-session/application/load-paper-sources.js'
import { IExamPackageRepository } from '../../../../exam-package/domain/repositories/exam-package.repository.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import type { ExamAnswerRecord } from '../../../../exam-session/domain/entities/exam-session.entity.js'
import { IExamSessionRepository } from '../../../../exam-session/domain/repositories/exam-session.repository.js'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
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

const FINISHED_STATUSES: ('SUBMITTED' | 'EXPIRED' | 'GRADED')[] = [
  'SUBMITTED',
  'EXPIRED',
  'GRADED',
]

@Injectable()
export class ListScheduleGradingDetailsUseCase {
  constructor(
    private readonly scope: GradingScopeService,
    private readonly schedules: IExamScheduleRepository,
    private readonly packages: IExamPackageRepository,
    private readonly questions: IQuestionRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly students: IStudentDirectoryPort,
    private readonly participantNumbers: IParticipantNumberPort,
  ) {}

  async execute(
    user: GradingUser,
    scheduleId: string,
  ): Promise<GradingSessionDetail[]> {
    const schedule = await this.schedules.findById(scheduleId)
    const scope = await this.scope.forRead(user)
    if (
      schedule === null ||
      !(await scope.allows(
        schedule.subjectId,
        schedule.classroomId,
        schedule.semesterId,
      ))
    ) {
      throw new NotFoundException('Jadwal tidak ditemukan')
    }

    const sessions = await this.sessions.listByScheduleStatuses(
      scheduleId,
      FINISHED_STATUSES,
    )
    if (sessions.length === 0) return []

    const sessionIds = sessions.map((session) => session.id)
    const studentIds = [
      ...new Set(sessions.map((session) => session.studentId)),
    ]
    const [sources, answers, refs, numbers] = await Promise.all([
      loadPaperSources(
        this.schedules,
        this.packages,
        this.questions,
        scheduleId,
      ),
      this.sessions.listAnswersBySessionIds(sessionIds),
      this.students.refsByIds(studentIds),
      this.numbersOf(studentIds, schedule.semesterId),
    ])

    const answersBySession = new Map<string, ExamAnswerRecord[]>()
    for (const answer of answers) {
      const list = answersBySession.get(answer.sessionId) ?? []
      list.push(answer)
      answersBySession.set(answer.sessionId, list)
    }
    const refOf = new Map(refs.map((ref) => [ref.id, ref]))

    return sessions.map((session) =>
      toGradingSessionDetail(
        session,
        sources,
        answersBySession.get(session.id) ?? [],
        refOf.get(session.studentId) ?? null,
        numbers.get(session.studentId) ?? null,
      ),
    )
  }

  private async numbersOf(
    studentIds: string[],
    semesterId: string,
  ): Promise<Map<string, string>> {
    try {
      return await this.participantNumbers.findNumbers(studentIds, semesterId)
    } catch {
      return new Map()
    }
  }
}
