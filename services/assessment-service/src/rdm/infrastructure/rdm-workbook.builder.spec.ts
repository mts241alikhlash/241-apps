import ExcelJS from 'exceljs'
import { buildRdmWorkbook } from './rdm-workbook.builder.js'

describe('rdm-workbook.builder', () => {
  const students = [
    { nis: '260001', nisn: '0143909888', name: 'Ahmad' },
    { nis: '260002', nisn: '0143909889', name: 'Budi' },
    { nis: null, nisn: '0143909890', name: 'Citra' },
  ]

  it('builds 15 SUM sheets with RDM cell map, empty column B, unlocked B2/B3/C5/F, and 0..100 validation', async () => {
    const buffer = await buildRdmWorkbook({
      kind: 'sumatif',
      classSubject: 'IX.A/Informatika',
      students,
      sheets: [
        {
          name: 'UH 1',
          material: 'Algoritma',
          kktp: 75,
          scores: new Map([
            [0, 88],
            [2, 95],
          ]),
        },
        {
          name: 'Tugas 1',
          material: null,
          kktp: null,
          scores: new Map([[1, 0]]),
        },
      ],
    })

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0])

    expect(wb.worksheets.map((ws) => ws.name)).toEqual(
      Array.from({ length: 15 }, (_, index) => `SUM ${index + 1}`),
    )

    const sum1 = wb.getWorksheet('SUM 1')!
    expect(sum1.getCell('A1').value).toBe('Nilai Sumatif')
    expect(sum1.getCell('A2').value).toBe('Nama')
    expect(sum1.getCell('B2').value).toBe('UH 1')
    expect(sum1.getCell('D2').value).toBe('Kelas / Mapel')
    expect(sum1.getCell('E2').value).toBe('IX.A/Informatika')
    expect(sum1.getCell('A3').value).toBe('Materi')
    expect(sum1.getCell('B3').value).toBe('Algoritma')
    expect(sum1.getCell('A5').value).toBe('KKTP')
    expect(sum1.getCell('C5').value).toBe(75)

    expect(sum1.getCell('A6').value).toBe('No')
    expect(sum1.getCell('B6').value).toBe('ID Siswa')
    expect(sum1.getCell('C6').value).toBe('NIS')
    expect(sum1.getCell('D6').value).toBe('Nisn')
    expect(sum1.getCell('E6').value).toBe('Nama')
    expect(sum1.getCell('F6').value).toBe('Nilai')

    expect(sum1.getColumn(2).hidden).toBe(true)
    expect(sum1.getColumn(7).hidden).toBe(true)

    expect(sum1.getCell('A7').value).toBe(1)
    expect(sum1.getCell('B7').value).toBeNull()
    expect(sum1.getCell('C7').value).toBe('260001')
    expect(sum1.getCell('D7').value).toBe('0143909888')
    expect(sum1.getCell('E7').value).toBe('Ahmad')
    expect(sum1.getCell('F7').value).toBe(88)

    expect(sum1.getCell('B8').value).toBeNull()
    expect(sum1.getCell('F8').value).toBeNull()

    expect(sum1.getCell('B9').value).toBeNull()
    expect(sum1.getCell('C9').value).toBeNull()
    expect(sum1.getCell('D9').value).toBe('0143909890')
    expect(sum1.getCell('F9').value).toBe(95)

    expect(sum1.getCell('B2').protection?.locked).toBe(false)
    expect(sum1.getCell('B3').protection?.locked).toBe(false)
    expect(sum1.getCell('C5').protection?.locked).toBe(false)
    expect(sum1.getCell('A1').protection?.locked).not.toBe(false)
    expect(sum1.getCell('E2').protection?.locked).not.toBe(false)
    expect(sum1.getCell('E7').protection?.locked).not.toBe(false)

    for (const row of [7, 8, 9]) {
      const fCell = sum1.getCell(row, 6)
      expect(fCell.protection?.locked).toBe(false)
      expect(fCell.dataValidation).toEqual({
        type: 'whole',
        operator: 'between',
        allowBlank: true,
        formulae: [0, 100],
      })
    }

    expect(
      (sum1 as unknown as { sheetProtection?: { sheet?: boolean } })
        .sheetProtection?.sheet,
    ).toBe(true)

    const sum2 = wb.getWorksheet('SUM 2')!
    expect(sum2.getCell('B2').value).toBe('Tugas 1')
    expect(sum2.getCell('B3').value).toBeNull()
    expect(sum2.getCell('C5').value).toBeNull()
    expect(sum2.getCell('F8').value).toBe(0)

    const sum3 = wb.getWorksheet('SUM 3')!
    expect(sum3.getCell('B2').value).toBeNull()
    expect(sum3.getCell('B3').value).toBeNull()
    expect(sum3.getCell('C5').value).toBeNull()
    expect(sum3.getCell('C7').value).toBe('260001')
    expect(sum3.getCell('F7').value).toBeNull()
    expect(sum3.getCell('F7').protection?.locked).toBe(false)
  })

  it('builds a single SAS 1 sheet with Nilai SAS title', async () => {
    const buffer = await buildRdmWorkbook({
      kind: 'sas',
      classSubject: 'IX.A/Informatika',
      students,
      sheets: [
        {
          name: 'UAS',
          material: 'Semester Ganjil',
          kktp: 75,
          scores: new Map([[0, 91]]),
        },
      ],
    })

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0])

    expect(wb.worksheets.map((ws) => ws.name)).toEqual(['SAS 1'])
    const sas1 = wb.getWorksheet('SAS 1')!
    expect(sas1.getCell('A1').value).toBe('Nilai SAS')
    expect(sas1.getCell('B2').value).toBe('UAS')
    expect(sas1.getCell('B3').value).toBe('Semester Ganjil')
    expect(sas1.getCell('C5').value).toBe(75)
    expect(sas1.getCell('F7').value).toBe(91)
    expect(sas1.getCell('B7').value).toBeNull()
  })
})
