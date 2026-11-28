import { NotFoundException } from '@nestjs/common'
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import {
  CLASSROOM_7A,
  CLASSROOM_7B,
  SUBJECT_ID,
  NOW,
  OTHER_SUBJECT,
  SCHEDULE_ID,
  STUDENTS,
  TEACHER,
  buildOffline,
  seatAll,
} from '../../exam-offline.test-support.js'
import { BuildScoreSheetUseCase } from './build-score-sheet.use-case.js'

function setup(options: Parameters<typeof buildOffline>[0] = {}) {
  const world = buildOffline(options)
  seatAll(world)
  return {
    world,
    useCase: new BuildScoreSheetUseCase(world.reader, world.academic),
  }
}

async function open(buffer: Buffer): Promise<ExcelJS.Worksheet> {
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  const sheet = book.getWorksheet('Score Sheet')
  if (sheet === undefined) throw new Error('no Score Sheet')
  return sheet
}

const cells = (sheet: ExcelJS.Worksheet, row: number) =>
  [1, 2, 3, 4].map((column) => sheet.getRow(row).getCell(column).value)

describe('BuildScoreSheetUseCase', () => {
  it('writes the title, the maximum, the header and the prefilled roster', async () => {
    const { world, useCase } = setup()
    await world.results.save({
      scheduleId: SCHEDULE_ID,
      studentId: STUDENTS.ani,
      rawScore: 42.5,
      note: 'rapi',
      enteredById: 't',
      enteredAt: NOW,
    })
    world.markAbsent(STUDENTS.budi)

    const { filename, buffer } = await useCase.execute(TEACHER, SCHEDULE_ID)

    expect(filename).toBe('score-sheet-tafsir-vii-a.xlsx')
    const sheet = await open(buffer)
    expect(sheet.getCell('A1').value).toBe(
      `Tafsir (Written) - ${CLASSROOM_7A.name}`,
    )
    expect(sheet.getCell('A2').value).toBe('Nilai maksimal: 50')
    expect(cells(sheet, 4)).toEqual(['No. Peserta', 'Nama', 'Score', 'Note'])
    expect(cells(sheet, 5)).toEqual(['7-001', 'Ani', 42.5, 'rapi'])
    expect(cells(sheet, 6)).toEqual(['7-002', 'Budi', 'TIDAK HADIR', null])
    expect(cells(sheet, 7)).toEqual(['7-003', 'Citra', null, null])
  })

  it('locks and greys the score of an absent student and leaves the others editable', async () => {
    const { world, useCase } = setup()
    world.markAbsent(STUDENTS.budi)

    const sheet = await open(
      (await useCase.execute(TEACHER, SCHEDULE_ID)).buffer,
    )

    expect(
      (sheet as unknown as { sheetProtection: { sheet: boolean } })
        .sheetProtection.sheet,
    ).toBe(true)
    expect(sheet.getCell('C6').protection?.locked).not.toBe(false)
    expect(sheet.getCell('C6').fill).toMatchObject({ type: 'pattern' })
    expect(sheet.getCell('C5').protection.locked).toBe(false)
    expect(sheet.getCell('D5').protection.locked).toBe(false)
    expect(sheet.getCell('A5').protection?.locked).not.toBe(false)
  })

  it('writes a name that looks like a formula as plain text', async () => {
    const { useCase } = setup({
      names: { [STUDENTS.ani]: '=HYPERLINK("http://x","klik")' },
    })

    const sheet = await open(
      (await useCase.execute(TEACHER, SCHEDULE_ID)).buffer,
    )

    expect(sheet.getCell('B5').value).toBe(`'=HYPERLINK("http://x","klik")`)
    expect(sheet.getCell('B5').formula).toBeUndefined()
  })

  it('refuses a teacher of another subject', async () => {
    const { useCase } = setup({
      taught: [{ subjectId: OTHER_SUBJECT, classroomId: CLASSROOM_7A.id }],
    })

    await expect(useCase.execute(TEACHER, SCHEDULE_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('refuses a teacher of the same subject in another classroom', async () => {
    const { useCase } = setup({
      taught: [{ subjectId: SUBJECT_ID, classroomId: CLASSROOM_7B.id }],
    })
    await expect(useCase.execute(TEACHER, SCHEDULE_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })
})
