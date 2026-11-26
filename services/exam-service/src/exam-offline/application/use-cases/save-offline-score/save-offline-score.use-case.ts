import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { GradingUser } from '../../../../exam-grading/application/grading-scope.service.js'
import type { OfflineRosterRow } from '../../../domain/entities/offline-result.entity.js'
import {
  OFFLINE_NOTE_MAX,
  offlineScoreProblem,
  offlineStateOf,
} from '../../../domain/policies/offline-score.policy.js'
import { IOfflineResultRepository } from '../../../domain/repositories/offline-result.repository.js'
import { OfflineRosterReader } from '../../offline-roster.reader.js'
import { writeOfflineScore } from '../../offline-score.writer.js'

export interface SaveOfflineScoreInput {
  scheduleId: string
  studentId: string
  rawScore: number | null
  note?: string
}

@Injectable()
export class SaveOfflineScoreUseCase {
  constructor(
    private readonly reader: OfflineRosterReader,
    private readonly results: IOfflineResultRepository,
  ) {}

  async execute(
    user: GradingUser,
    input: SaveOfflineScoreInput,
    now: Date = new Date(),
  ): Promise<OfflineRosterRow> {
    const roster = await this.reader.load(user, input.scheduleId, 'write')
    const row = roster.rows.find((item) => item.studentId === input.studentId)
    if (row === undefined) {
      throw new NotFoundException('Siswa tidak terdaftar di kelas ujian ini')
    }
    if (row.state === 'ABSENT') {
      throw new ConflictException('Siswa tidak hadir, nilai tidak bisa diisi')
    }
    if (input.rawScore !== null) {
      const problem = offlineScoreProblem(
        input.rawScore,
        roster.activity.maxScore,
      )
      if (problem !== null) throw new BadRequestException(problem)
    }
    const note = (input.note ?? '').trim()
    if (note.length > OFFLINE_NOTE_MAX) {
      throw new BadRequestException('Catatan maksimal 300 karakter')
    }

    const saved = await writeOfflineScore(this.results, {
      scheduleId: roster.schedule.id,
      studentId: row.studentId,
      rawScore: input.rawScore,
      note,
      existing: roster.results.get(row.studentId),
      actorId: user.id,
      at: now,
    })
    return {
      ...row,
      state: offlineStateOf(false, saved),
      rawScore: saved.rawScore,
      note: saved.note === '' ? null : saved.note,
      publication: saved.publicationStatus,
    }
  }
}
