import { Injectable } from '@nestjs/common'
import ExcelJS from 'exceljs'
import type { GradingUser } from '../../../../exam-grading/application/grading-scope.service.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import {
  OFFLINE_KIND_LABELS,
  SCORE_SHEET_ABSENT,
  SCORE_SHEET_HEADERS,
  SCORE_SHEET_NAME,
  asSheetText,
} from '../../../domain/score-sheet.js'
import { OfflineRosterReader } from '../../offline-roster.reader.js'

const HEADER_ROW = 4
const SCORE_COLUMN = 3
const NOTE_COLUMN = 4
const ABSENT_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9D9D9' },
}

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
}

@Injectable()
export class BuildScoreSheetUseCase {
  constructor(
    private readonly reader: OfflineRosterReader,
    private readonly academic: IAcademicLookupPort,
  ) {}

  async execute(
    user: GradingUser,
    scheduleId: string,
  ): Promise<{ filename: string; buffer: Buffer }> {
    const { schedule, activity, rows } = await this.reader.load(
      user,
      scheduleId,
      'read',
    )
    const [[subject], [classroom]] = await Promise.all([
      this.academic.subjectsByIds([schedule.subjectId]),
      this.academic.classroomsByIds([schedule.classroomId]),
    ])
    const subjectName = subject?.name ?? 'Ujian'
    const classroomName = classroom?.name ?? 'Kelas'
    const kind = activity.offlineKind
      ? ` (${OFFLINE_KIND_LABELS[activity.offlineKind]})`
      : ''

    const book = new ExcelJS.Workbook()
    const sheet = book.addWorksheet(SCORE_SHEET_NAME)
    sheet.columns = [{ width: 16 }, { width: 36 }, { width: 14 }, { width: 40 }]
    sheet.getCell('A1').value = asSheetText(
      `${subjectName}${kind} - ${classroomName}`,
    )
    sheet.getCell('A1').font = { bold: true, size: 13 }
    sheet.getCell('A2').value = `Nilai maksimal: ${activity.maxScore}`
    const header = sheet.getRow(HEADER_ROW)
    header.values = SCORE_SHEET_HEADERS
    header.font = { bold: true }

    rows.forEach((row, index) => {
      const line = sheet.getRow(HEADER_ROW + 1 + index)
      line.getCell(1).value = asSheetText(row.participantNumber ?? '')
      line.getCell(2).value = asSheetText(row.name ?? '')
      const score = line.getCell(SCORE_COLUMN)
      const note = line.getCell(NOTE_COLUMN)
      note.value = row.note === null ? null : asSheetText(row.note)
      note.protection = { locked: false }
      if (row.state === 'ABSENT') {
        score.value = SCORE_SHEET_ABSENT
        score.fill = ABSENT_FILL
        score.protection = { locked: true }
      } else {
        score.value = row.rawScore
        score.protection = { locked: false }
      }
    })
    await sheet.protect('', {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatColumns: true,
    })

    const name = [slug(subjectName), slug(classroomName)]
      .filter((part) => part !== '')
      .join('-')
    return {
      filename: `score-sheet-${name || 'ujian'}.xlsx`,
      buffer: Buffer.from(await book.xlsx.writeBuffer()),
    }
  }
}
