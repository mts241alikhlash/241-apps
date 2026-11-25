import ExcelJS from 'exceljs'
import { RDM_MAX_SUMATIF_SHEETS } from '../constants/rdm.constants.js'
import type { RdmKind } from '../domain/rdm-rules.js'

export interface RdmWorkbookStudent {
  nis: string | null | undefined
  nisn: string | null | undefined
  name: string
}

export interface RdmWorkbookSheetInput {
  name: string
  material: string | null
  kktp: number | null
  scores: Map<number, number>
}

export interface BuildRdmWorkbookInput {
  kind: RdmKind
  classSubject: string
  students: RdmWorkbookStudent[]
  sheets: RdmWorkbookSheetInput[]
}

const FIRST_STUDENT_ROW = 7

export async function buildRdmWorkbook(
  input: BuildRdmWorkbookInput,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheetNames =
    input.kind === 'sas'
      ? ['SAS 1']
      : Array.from(
          { length: RDM_MAX_SUMATIF_SHEETS },
          (_, index) => `SUM ${index + 1}`,
        )

  for (const [sheetIndex, sheetName] of sheetNames.entries()) {
    const sheetInput = input.sheets[sheetIndex]
    const sheet = workbook.addWorksheet(sheetName)
    sheet.columns = [
      { width: 6 },
      { width: 24, hidden: true },
      { width: 14 },
      { width: 16 },
      { width: 30 },
      { width: 12 },
      { width: 12, hidden: true },
    ]

    sheet.mergeCells('A1:F1')
    sheet.mergeCells('B2:C2')
    sheet.mergeCells('E2:F2')
    sheet.mergeCells('A3:A4')
    sheet.mergeCells('B3:F4')

    sheet.getCell('A1').value =
      input.kind === 'sas' ? 'Nilai SAS' : 'Nilai Sumatif'

    sheet.getCell('A2').value = 'Nama'
    const nameCell = sheet.getCell('B2')
    nameCell.value = sheetInput ? sheetInput.name : null
    nameCell.protection = { locked: false }
    nameCell.alignment = { vertical: 'middle' }

    sheet.getCell('D2').value = 'Kelas / Mapel'
    sheet.getCell('E2').value = input.classSubject

    sheet.getCell('A3').value = 'Materi'
    const materialCell = sheet.getCell('B3')
    materialCell.value = sheetInput?.material ?? null
    materialCell.protection = { locked: false }
    materialCell.alignment = { vertical: 'middle', wrapText: true }

    sheet.getCell('A5').value = 'KKTP'
    const kktpCell = sheet.getCell('C5')
    kktpCell.value = sheetInput?.kktp ?? null
    kktpCell.protection = { locked: false }
    kktpCell.numFmt = '0'

    sheet.getCell('A6').value = 'No'
    sheet.getCell('B6').value = 'ID Siswa'
    sheet.getCell('C6').value = 'NIS'
    sheet.getCell('D6').value = 'Nisn'
    sheet.getCell('E6').value = 'Nama'
    sheet.getCell('F6').value = 'Nilai'

    for (const [studentIndex, student] of input.students.entries()) {
      const rowNumber = FIRST_STUDENT_ROW + studentIndex
      sheet.getCell(rowNumber, 1).value = studentIndex + 1
      sheet.getCell(rowNumber, 3).value = student.nis ? student.nis : null
      sheet.getCell(rowNumber, 4).value = student.nisn ? student.nisn : null
      sheet.getCell(rowNumber, 5).value = student.name

      const scoreCell = sheet.getCell(rowNumber, 6)
      const scoreValue = sheetInput?.scores.get(studentIndex)
      scoreCell.value = scoreValue ?? null
      scoreCell.protection = { locked: false }
      scoreCell.numFmt = '0'
      scoreCell.dataValidation = {
        type: 'whole',
        operator: 'between',
        allowBlank: true,
        formulae: [0, 100],
      }
    }

    await sheet.protect('', {
      selectLockedCells: true,
      selectUnlockedCells: true,
    })
  }

  const output = await workbook.xlsx.writeBuffer()
  return Buffer.from(output)
}
