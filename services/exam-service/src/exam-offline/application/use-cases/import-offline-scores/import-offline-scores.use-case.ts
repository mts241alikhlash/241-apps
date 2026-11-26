import {
  Injectable,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common'
import type { GradingUser } from '../../../../exam-grading/application/grading-scope.service.js'
import type { OfflineRosterRow } from '../../../domain/entities/offline-result.entity.js'
import {
  OFFLINE_NOTE_MAX,
  offlineScoreProblem,
} from '../../../domain/policies/offline-score.policy.js'
import { IOfflineResultRepository } from '../../../domain/repositories/offline-result.repository.js'
import {
  OFFLINE_IMPORT_MAX_BYTES,
  SCORE_SHEET_ABSENT,
  fromSheetText,
} from '../../../domain/score-sheet.js'
import { OfflineRosterReader } from '../../offline-roster.reader.js'
import { writeOfflineScore } from '../../offline-score.writer.js'
import {
  parseScoreSheet,
  type ScoreSheetRow,
} from '../../score-sheet.parser.js'

export interface ImportOfflineScoresInput {
  scheduleId: string
  file: { buffer: Buffer; originalName: string }
}

export interface OfflineImportRejection {
  row: number
  participantNumber: string | null
  reason: string
}

export const OFFLINE_IMPORT_SKIP_REASONS = ['KOSONG', 'TIDAK_HADIR'] as const
export type OfflineImportSkipReason =
  (typeof OFFLINE_IMPORT_SKIP_REASONS)[number]

export interface OfflineImportSkip {
  row: number
  participantNumber: string | null
  reason: OfflineImportSkipReason
}

export interface OfflineImportResult {
  saved: number
  rejected: OfflineImportRejection[]
  skipped: OfflineImportSkip[]
}

type RowCheck =
  | { reason: string }
  | { skip: OfflineImportSkipReason }
  | { student: OfflineRosterRow; rawScore: number; note: string | null }

const NUMBER = /^-?\d+(?:[.,]\d+)?$/u

const numberKey = (value: string) => value.trim().toUpperCase()

@Injectable()
export class ImportOfflineScoresUseCase {
  constructor(
    private readonly reader: OfflineRosterReader,
    private readonly results: IOfflineResultRepository,
  ) {}

  async execute(
    user: GradingUser,
    input: ImportOfflineScoresInput,
    now: Date = new Date(),
  ): Promise<OfflineImportResult> {
    const roster = await this.reader.load(user, input.scheduleId, 'write')
    if (input.file.buffer.length > OFFLINE_IMPORT_MAX_BYTES) {
      throw new PayloadTooLargeException('Ukuran berkas maksimal 5 MB')
    }
    const lines = await parseScoreSheet(
      input.file.buffer,
      input.file.originalName,
    )
    if (
      roster.rows.length > 0 &&
      roster.rows.every((row) => row.participantNumber === null)
    ) {
      throw new ServiceUnavailableException(
        'Nomor peserta tidak bisa dimuat, coba lagi nanti',
      )
    }

    const byNumber = new Map(
      roster.rows
        .filter((row) => row.participantNumber !== null)
        .map((row) => [numberKey(row.participantNumber ?? ''), row]),
    )
    const seen = new Map<string, number>()
    for (const line of lines) {
      const key = numberKey(line.participantNumber)
      if (key !== '') seen.set(key, (seen.get(key) ?? 0) + 1)
    }

    const rejected: OfflineImportRejection[] = []
    const skipped: OfflineImportSkip[] = []
    let saved = 0
    for (const line of lines) {
      const checked = this.check(line, byNumber, seen, roster.activity.maxScore)
      const where = {
        row: line.row,
        participantNumber: line.participantNumber || null,
      }
      if ('reason' in checked) {
        rejected.push({ ...where, reason: checked.reason })
        continue
      }
      if ('skip' in checked) {
        skipped.push({ ...where, reason: checked.skip })
        continue
      }
      const existing = roster.results.get(checked.student.studentId)
      await writeOfflineScore(this.results, {
        scheduleId: roster.schedule.id,
        studentId: checked.student.studentId,
        rawScore: checked.rawScore,
        note: checked.note ?? existing?.note ?? '',
        existing,
        actorId: user.id,
        at: now,
      })
      saved += 1
    }
    return { saved, rejected, skipped }
  }

  private check(
    line: ScoreSheetRow,
    byNumber: Map<string, OfflineRosterRow>,
    seen: Map<string, number>,
    maxScore: number,
  ): RowCheck {
    const key = numberKey(line.participantNumber)
    if (key === '') return { reason: 'No. Peserta kosong' }
    if ((seen.get(key) ?? 0) > 1) {
      return { reason: 'No. Peserta ganda di berkas' }
    }
    const student = byNumber.get(key)
    if (student === undefined) {
      return { reason: 'No. Peserta tidak terdaftar di kelas ini' }
    }
    if (line.score === '') return { skip: 'KOSONG' }
    if (student.state === 'ABSENT') {
      return line.score.toUpperCase() === SCORE_SHEET_ABSENT
        ? { skip: 'TIDAK_HADIR' }
        : { reason: 'Siswa tidak hadir' }
    }
    if (!NUMBER.test(line.score)) return { reason: 'Nilai bukan angka' }
    const rawScore = Number(line.score.replace(',', '.'))
    const problem = offlineScoreProblem(rawScore, maxScore)
    if (problem !== null) return { reason: problem }
    const note = line.note === null ? null : fromSheetText(line.note.trim())
    if (note !== null && note.length > OFFLINE_NOTE_MAX) {
      return { reason: 'Catatan maksimal 300 karakter' }
    }
    return { student, rawScore, note }
  }
}
