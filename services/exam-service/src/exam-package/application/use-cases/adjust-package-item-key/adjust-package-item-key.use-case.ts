import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { IExamPackageRepository } from '../../../../exam-package/domain/repositories/exam-package.repository.js'
import type { ItemResolution } from '../../../../exam-package/domain/entities/exam-package.entity.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IQuestionRepository } from '../../../../question/domain/repositories/question.repository.js'
import { IExamSessionRepository } from '../../../../exam-session/domain/repositories/exam-session.repository.js'
import { ISessionRecoveryRepository } from '../../../../exam-session/domain/repositories/session-recovery.port.js'
import { computeSessionResult } from '../../../../exam-session/domain/policies/compute-session-result.policy.js'
import { loadPaperSources } from '../../../../exam-session/application/load-paper-sources.js'
import { assertRecoveryReason } from '../../../../exam-session/domain/policies/recovery-reason.policy.js'
import { applyKeyOverride } from '../../../../question/domain/value-objects/question-content.js'

const RESOLUTIONS: readonly ItemResolution[] = [
  'NORMAL',
  'BONUS_ALL',
  'KEY_OVERRIDE',
]

export interface AdjustPackageItemKeyInput {
  resolution: ItemResolution
  overrideContent?: unknown
  reason: string
}

const OVERRIDE_SHAPE: Record<string, 'answer' | 'root'> = {
  MULTIPLE_CHOICE: 'answer',
  MULTIPLE_RESPONSE: 'answer',
  TRUE_FALSE: 'answer',
  SHORT_ANSWER: 'answer',
  ESSAY: 'root',
}

const ANSWER_FIELD: Record<string, string> = {
  MULTIPLE_CHOICE: 'key',
  MULTIPLE_RESPONSE: 'keys',
  TRUE_FALSE: 'value',
  SHORT_ANSWER: 'accepted',
}

export function assertOverrideMatchesType(
  type: string,
  overrideContent: unknown,
): void {
  const scope = OVERRIDE_SHAPE[type]
  const content =
    typeof overrideContent === 'object' && overrideContent !== null
      ? (overrideContent as Record<string, unknown>)
      : null
  const answer =
    content !== null && typeof content.answer === 'object'
      ? (content.answer as Record<string, unknown>)
      : null
  const ok =
    scope === 'root'
      ? content !== null && 'guideHtml' in content
      : scope === 'answer' &&
        answer !== null &&
        ANSWER_FIELD[type] !== undefined &&
        ANSWER_FIELD[type] in answer
  if (!ok) {
    throw new BadRequestException(
      `Kunci pengganti tidak cocok untuk tipe soal ${type}`,
    )
  }
}

export interface AdjustedPackageItemKey {
  packageId: string
  questionId: string
  resolution: ItemResolution
  rescoredSessions: number
}

@Injectable()
export class AdjustPackageItemKeyUseCase {
  constructor(
    private readonly packages: IExamPackageRepository,
    private readonly schedules: IExamScheduleRepository,
    private readonly questions: IQuestionRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly recovery: ISessionRecoveryRepository,
  ) {}

  async execute(
    user: { id: string },
    packageId: string,
    itemId: string,
    input: AdjustPackageItemKeyInput,
    now: Date = new Date(),
  ): Promise<AdjustedPackageItemKey> {
    const reason = assertRecoveryReason(input.reason)
    if (!RESOLUTIONS.includes(input.resolution)) {
      throw new BadRequestException('Resolusi soal tidak dikenal')
    }
    if (input.resolution === 'KEY_OVERRIDE' && input.overrideContent == null) {
      throw new BadRequestException(
        'Kunci jawaban pengganti wajib diisi untuk KEY_OVERRIDE',
      )
    }
    const pkg = await this.packages.findById(packageId)
    if (pkg === null) throw new NotFoundException('Paket soal tidak ditemukan')
    const item = pkg.items.find(
      (row) => row.id === itemId || row.questionId === itemId,
    )
    if (item === undefined) {
      throw new NotFoundException('Soal tidak ada di paket ini')
    }
    const questionId = item.questionId
    if (input.resolution === 'KEY_OVERRIDE') {
      const question = await this.questions.findById(questionId)
      if (question === null) {
        throw new NotFoundException('Soal tidak ditemukan')
      }
      assertOverrideMatchesType(question.type, input.overrideContent)
    }
    const adjustment = {
      packageId,
      questionId,
      resolution: input.resolution,
      overrideContent:
        input.resolution === 'KEY_OVERRIDE' ? input.overrideContent : null,
      adjustedById: user.id,
      adjustedReason: reason,
      adjustedAt: now,
    }

    const scheduleIds = await this.schedules.listIdsByPackage(packageId)
    let rescoredSessions = 0
    let written = false
    for (const scheduleId of scheduleIds) {
      const loaded = await loadPaperSources(
        this.schedules,
        this.packages,
        this.questions,
        scheduleId,
      )
      const sources = loaded.map((source) =>
        source.questionId === questionId
          ? {
              ...source,
              resolution: adjustment.resolution,
              overrideContent:
                adjustment.resolution === 'KEY_OVERRIDE'
                  ? applyKeyOverride(source.content, adjustment.overrideContent)
                  : null,
            }
          : source,
      )
      const sessions = await this.sessions.listByScheduleStatuses(scheduleId, [
        'SUBMITTED',
        'EXPIRED',
        'GRADED',
      ])
      for (const session of sessions) {
        const answers = await this.sessions.listAnswers(session.id)
        const result = computeSessionResult(sources, answers)
        await this.recovery.applyRescore(
          session.id,
          result,
          written ? undefined : adjustment,
        )
        written = true
        rescoredSessions += 1
      }
    }
    if (!written) await this.packages.adjustItemKey(adjustment)

    return {
      packageId,
      questionId,
      resolution: input.resolution,
      rescoredSessions,
    }
  }
}
