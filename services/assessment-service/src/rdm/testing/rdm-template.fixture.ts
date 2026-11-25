import ExcelJS from 'exceljs'
import type { RdmKind } from '../domain/rdm-rules.js'

export interface RdmFixtureStudent {
  nis: string
  nisn: string
  name: string
}

const MAX_STUDENT_ROW = 107

export async function buildRdmTemplateFixture(
  kind: RdmKind,
  students: RdmFixtureStudent[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheetNames =
    kind === 'sas'
      ? ['SAS 1']
      : Array.from({ length: 15 }, (_, index) => `SUM ${index + 1}`)

  for (const sheetName of sheetNames) {
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

    sheet.getCell('A1').value = kind === 'sas' ? 'Nilai SAS' : 'Nilai Sumatif'

    sheet.getCell('A2').value = 'Nama'
    sheet.getCell('B2').protection = { locked: true }
    sheet.getCell('B2').alignment = { vertical: 'middle' }
    sheet.getCell('D2').value = 'Kelas / Mapel'
    sheet.getCell('E2').value = 'IX.A/Informatika'

    sheet.getCell('A3').value = 'Materi'
    sheet.getCell('B3').protection = { locked: true }
    sheet.getCell('B3').alignment = { vertical: 'middle', wrapText: true }
    sheet.getCell('A4').protection = { locked: true }

    sheet.getCell('A5').value = 'KKTP'
    sheet.getCell('C5').protection = { locked: true }
    sheet.getCell('C5').numFmt = '0'

    sheet.getCell('A6').value = 'No'
    sheet.getCell('B6').value = 'ID Siswa'
    sheet.getCell('C6').value = 'NIS'
    sheet.getCell('D6').value = 'Nisn'
    sheet.getCell('E6').value = 'Nama'
    sheet.getCell('F6').value = 'Nilai'

    for (let row = 7; row <= MAX_STUDENT_ROW; row += 1) {
      const student = students[row - 7]
      if (student) {
        sheet.getCell(row, 1).value = row - 6
        sheet.getCell(row, 2).value = Buffer.from(`rdm-id-${row - 6}`).toString(
          'base64',
        )
        sheet.getCell(row, 3).value = student.nis
        sheet.getCell(row, 4).value = student.nisn
        sheet.getCell(row, 5).value = student.name
      }

      const scoreCell = sheet.getCell(row, 6)
      scoreCell.protection = { locked: false }
      scoreCell.numFmt = '0'
      scoreCell.dataValidation = {
        type: 'whole',
        operator: 'between',
        allowBlank: true,
        formulae: [0, 100],
      }
    }

    await sheet.protect('8619', {
      selectLockedCells: true,
      selectUnlockedCells: true,
      spinCount: 1,
    })
  }

  const output = await workbook.xlsx.writeBuffer()
  return Buffer.from(output)
}
