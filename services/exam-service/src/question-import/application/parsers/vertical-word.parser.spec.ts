import { BadRequestException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { buildDocx, item, para } from './docx-fixture.js'
import { parseWordSheet } from './word-sheet.parser.js'

const noImages = () => Promise.resolve('unused')

const parse = async (body: string) =>
  parseWordSheet(await buildDocx(body), noImages)

const typedPg = [
  para('BAGIAN PG (20 soal)'),
  para('1. Berapa $2+3$?'),
  para('A. 4'),
  para('B. 5'),
  para('C. 6'),
  para('D. 7'),
  para('Kunci: b'),
  para('Poin: 1,5'),
  para('2. Ibu kota?'),
  para('A. Jakarta'),
  para('B. Bandung'),
  para('Kunci: A'),
  para('Poin: 1'),
]

const rest = [
  para('BAGIAN PG KOMPLEKS'),
  para('3. Bilangan genap'),
  para('A. 2'),
  para('B. 3'),
  para('C. 4'),
  para('Kunci: a, c'),
  para('Poin: 2'),
  para('BAGIAN BENAR / SALAH'),
  para('4. Bumi bulat'),
  para('Kunci: Benar'),
  para('Poin: 1'),
  para('BAGIAN ISIAN'),
  para('5. Tuliskan'),
  para('Kunci: كتاب | kitab'),
  para('Abaikan harakat: ya'),
  para('Poin: 1'),
  para('BAGIAN URAIAN'),
  para('6. Jelaskan'),
  para('Kunci: Pedoman jawaban'),
  para('Poin: 5'),
]

function summary(sheet: Awaited<ReturnType<typeof parse>>) {
  return sheet.questions.map((q) => ({
    row: q.row,
    type: q.type,
    body: q.bodyHtml,
    content: q.content,
    points: q.points,
  }))
}

describe('vertical Word layout', () => {
  it('reads every section typed by hand', async () => {
    const sheet = await parse(typedPg.join('') + rest.join(''))

    expect(sheet.errors).toEqual([])
    expect(sheet.questions.map((q) => q.type)).toEqual([
      'MULTIPLE_CHOICE',
      'MULTIPLE_CHOICE',
      'MULTIPLE_RESPONSE',
      'TRUE_FALSE',
      'SHORT_ANSWER',
      'ESSAY',
    ])
    const [first, , complex, , short] = sheet.questions
    expect(first?.bodyHtml).toBe('Berapa <span data-latex="2+3">2+3</span>?')
    expect(first?.points).toBe(1.5)
    expect(first?.content).toEqual({
      choices: [
        { key: 'A', html: '4' },
        { key: 'B', html: '5' },
        { key: 'C', html: '6' },
        { key: 'D', html: '7' },
      ],
      answer: { key: 'B' },
    })
    expect(complex?.content).toMatchObject({ answer: { keys: ['A', 'C'] } })
    expect(short?.content).toMatchObject({
      answer: { ignoreHarakat: true, accepted: ['كتاب', 'kitab'] },
    })
  })

  it('reads automatic choices under a typed body', async () => {
    const typed = await parse(typedPg.join('') + rest.join(''))
    const auto = await parse(
      [
        para('BAGIAN PG'),
        para('1. Berapa $2+3$?'),
        item(0, '4'),
        item(0, '5'),
        item(0, '6'),
        item(0, '7'),
        para('Kunci: b'),
        para('Poin: 1,5'),
        para('2. Ibu kota?'),
        item(0, 'Jakarta'),
        item(0, 'Bandung'),
        para('Kunci: A'),
        para('Poin: 1'),
      ].join('') + rest.join(''),
    )

    expect(auto.errors).toEqual([])
    expect(summary(auto)).toEqual(summary(typed))
  })

  it('reads automatic body and nested automatic choices', async () => {
    const typed = await parse(typedPg.join('') + rest.join(''))
    const auto = await parse(
      [
        para('BAGIAN PG'),
        item(0, 'Berapa $2+3$?'),
        item(1, '4'),
        item(1, '5'),
        item(1, '6'),
        item(1, '7'),
        para('Kunci: b'),
        para('Poin: 1,5'),
        item(0, 'Ibu kota?'),
        item(1, 'Jakarta'),
        item(1, 'Bandung'),
        para('Kunci: A'),
        para('Poin: 1'),
      ].join('') + rest.join(''),
    )

    expect(auto.errors).toEqual([])
    expect(summary(auto)).toEqual(summary(typed))
  })

  it('rejects typed and automatic choices in one question', async () => {
    const sheet = await parse(
      [
        para('BAGIAN PG'),
        para('1. Soal'),
        para('A. satu'),
        item(1, 'dua'),
        para('Kunci: A'),
        para('Poin: 1'),
      ].join(''),
    )

    expect(sheet.questions).toEqual([])
    expect(sheet.errors).toEqual([
      {
        row: 1,
        reason:
          'Bagian PG, soal 1: pilihan tidak boleh mencampur ketikan dan penomoran otomatis',
      },
    ])
  })

  it('splits choices and answer lines pasted with Shift+Enter', async () => {
    const sheet = await parse(
      [
        para('Bagian PG (20 soal)'),
        para('1. Soal'),
        para('A. satu', 'B. dua', 'C. tiga'),
        para('Kunci: c', 'Poin: 2'),
      ].join(''),
    )

    expect(sheet.errors).toEqual([])
    expect(sheet.questions[0]?.content).toEqual({
      choices: [
        { key: 'A', html: 'satu' },
        { key: 'B', html: 'dua' },
        { key: 'C', html: 'tiga' },
      ],
      answer: { key: 'C' },
    })
    expect(sheet.questions[0]?.points).toBe(2)
  })

  it('fails only the question missing Poin', async () => {
    const sheet = await parse(
      typedPg.slice(0, 8).join('') +
        [
          para('2. Ibu kota?'),
          para('A. Jakarta'),
          para('B. Bandung'),
          para('Kunci: A'),
        ].join(''),
    )

    expect(sheet.questions).toHaveLength(1)
    expect(sheet.errors).toEqual([
      { row: 2, reason: 'Bagian PG, soal 2: soal tidak diakhiri baris Poin' },
    ])
  })

  it('reports Kunci before any BAGIAN on row 0', async () => {
    const sheet = await parse(
      [para('Kunci: A'), para('Poin: 1'), para('BAGIAN PG')].join(''),
    )

    expect(sheet.questions).toEqual([])
    expect(sheet.errors).toEqual([
      { row: 0, reason: 'Bagian tidak ditemukan sebelum soal' },
    ])
  })

  it('ignores instructions before the first BAGIAN', async () => {
    const sheet = await parse(
      [para('Petunjuk pengisian'), para('Isi dengan teliti')].join('') +
        typedPg.join(''),
    )

    expect(sheet.errors).toEqual([])
    expect(sheet.questions).toHaveLength(2)
  })

  it('reports stray text after the choices', async () => {
    const sheet = await parse(
      [
        para('BAGIAN PG'),
        para('1. Soal'),
        para('A. satu'),
        para('B. dua'),
        para('catatan nyasar'),
        para('Kunci: A'),
        para('Poin: 1'),
      ].join(''),
    )

    expect(sheet.errors).toEqual([
      {
        row: 1,
        reason: 'Bagian PG, soal 1: teks tidak dikenali setelah pilihan',
      },
    ])
  })

  it('rejects more than 500 questions', async () => {
    const questions = Array.from({ length: 501 }, () =>
      [para('Soal'), para('Kunci: benar'), para('Poin: 1')].join(''),
    )
    await expect(
      parse(para('BAGIAN BENAR/SALAH') + questions.join('')),
    ).rejects.toThrow(new BadRequestException('Maksimal 500 soal per berkas'))
  })

  it('does not read questions under an unknown section', async () => {
    const sheet = await parse(
      [
        para('BAGIAN ISIAN'),
        para('1. Tuliskan'),
        para('Kunci: kitab'),
        para('Poin: 1'),
        para('BAGIAN ESAI'),
        para('1. Jelaskan'),
        para('Kunci: x'),
        para('Poin: 5'),
      ].join(''),
    )

    expect(sheet.questions).toHaveLength(1)
    expect(sheet.errors).toEqual([
      { row: 2, reason: 'Bagian tidak dikenal: BAGIAN ESAI' },
      { row: 0, reason: 'Bagian tidak ditemukan sebelum soal' },
    ])
  })

  it('flags a middle PG question missing Poin without swallowing the next', async () => {
    const sheet = await parse(
      [
        para('BAGIAN PG'),
        para('1. Satu'),
        para('A. a'),
        para('B. b'),
        para('Kunci: A'),
        para('Poin: 1'),
        para('2. Dua'),
        para('A. a'),
        para('B. b'),
        para('Kunci: B'),
        para('3. Tiga'),
        para('A. a'),
        para('B. b'),
        para('Kunci: A'),
        para('Poin: 2'),
        para('4. Empat'),
        para('A. a'),
        para('B. b'),
        para('Kunci: B'),
        para('Poin: 1'),
      ].join(''),
    )

    expect(sheet.questions.map((q) => q.row)).toEqual([1, 3, 4])
    expect(sheet.errors).toEqual([
      { row: 2, reason: 'Bagian PG, soal 2: soal tidak diakhiri baris Poin' },
    ])
  })

  it('flags an Isian question missing Kunci and Poin', async () => {
    const sheet = await parse(
      [
        para('BAGIAN ISIAN'),
        para('1. Satu'),
        para('2. Dua'),
        para('Kunci: b'),
        para('Poin: 1'),
        para('3. Tiga'),
        para('Kunci: c'),
        para('Poin: 1'),
      ].join(''),
    )

    expect(sheet.questions.map((q) => q.row)).toEqual([2, 3])
    expect(sheet.errors).toEqual([
      {
        row: 1,
        reason: 'Bagian Isian, soal 1: soal tidak diakhiri baris Poin',
      },
    ])
  })

  it('prefixes validation errors', async () => {
    const sheet = await parse(
      [
        para('BAGIAN PG'),
        para('1. Satu'),
        para('A. a'),
        para('Kunci: A'),
        para('Poin: 1'),
        para('2. Dua'),
        para('A. a'),
        para('B. b'),
        para('Poin: 1'),
        para('3. Tiga'),
        para('A. a'),
        para('B. b'),
        para('Kunci: A'),
        para('Poin:'),
        para('4. Empat'),
        para('A. a'),
        para('B. b'),
        para('Kunci:B'),
        para('Poin: 1'),
      ].join(''),
    )

    expect(sheet.errors).toEqual([
      { row: 1, reason: 'Bagian PG, soal 1: Pilihan jawaban harus 2 sampai 5' },
      { row: 2, reason: 'Bagian PG, soal 2: Kunci jawaban harus diisi' },
      { row: 3, reason: 'Bagian PG, soal 3: soal tidak diakhiri baris Poin' },
    ])
    expect(sheet.questions).toHaveLength(1)
    expect(sheet.questions[0]?.content).toMatchObject({ answer: { key: 'B' } })
  })

  it('ignores marker-only choices so two filled choices import cleanly', async () => {
    const sheet = await parse(
      [
        para('BAGIAN PG'),
        para('1. Berapa $2+3$?'),
        para('A. 4'),
        para('B. 5'),
        para('C.'),
        para('D.'),
        para('Kunci: B'),
        para('Poin: 1'),
      ].join(''),
    )

    expect(sheet.errors).toEqual([])
    expect(sheet.questions).toHaveLength(1)
    expect(sheet.questions[0]?.content).toMatchObject({
      choices: [{ key: 'A' }, { key: 'B' }],
      answer: { key: 'B' },
    })
  })

  it('reports fewer than two filled choices when the rest are marker-only', async () => {
    const sheet = await parse(
      [
        para('BAGIAN PG'),
        para('1. Berapa $2+3$?'),
        para('A. 4'),
        para('B.'),
        para('C.'),
        para('D.'),
        para('Kunci: A'),
        para('Poin: 1'),
      ].join(''),
    )

    expect(sheet.questions).toEqual([])
    expect(sheet.errors).toEqual([
      {
        row: 1,
        reason: 'Bagian PG, soal 1: Pilihan jawaban harus 2 sampai 5',
      },
    ])
  })

  it('ignores a blank E choice in PG Kompleks', async () => {
    const sheet = await parse(
      [
        para('BAGIAN PG KOMPLEKS'),
        para('1. Pilih bilangan genap'),
        para('A. 2'),
        para('B. 3'),
        para('C. 4'),
        para('E.'),
        para('Kunci: A, C'),
        para('Poin: 2'),
      ].join(''),
    )

    expect(sheet.errors).toEqual([])
    expect(sheet.questions[0]?.content).toMatchObject({
      choices: [{ key: 'A' }, { key: 'B' }, { key: 'C' }],
      answer: { keys: ['A', 'C'] },
    })
  })

  it('rejects a blank choice followed by a filled one and keeps the key on its letter', async () => {
    const sheet = await parse(
      [
        para('BAGIAN PG'),
        para('1. Berapa $2+3$?'),
        para('A. 4'),
        para('B.'),
        para('C. 6'),
        para('D. 7'),
        para('Kunci: C'),
        para('Poin: 1'),
      ].join(''),
    )

    expect(sheet.questions).toEqual([])
    expect(sheet.errors).toEqual([
      {
        row: 1,
        reason:
          'Bagian PG, soal 1: Pilihan harus berurutan A, B, C dan seterusnya, pilihan B kosong atau tidak berurutan',
      },
    ])
  })

  it('rejects typed choices that skip a letter', async () => {
    const sheet = await parse(
      [
        para('BAGIAN PG'),
        para('1. Berapa $2+3$?'),
        para('A. 4'),
        para('C. 6'),
        para('D. 7'),
        para('Kunci: C'),
        para('Poin: 1'),
      ].join(''),
    )

    expect(sheet.questions).toEqual([])
    expect(sheet.errors).toHaveLength(1)
    expect(sheet.errors[0]?.reason).toMatch(
      /^Bagian PG, soal 1: Pilihan harus berurutan A, B, C dan seterusnya, pilihan B kosong atau tidak berurutan$/u,
    )
  })

  it('rejects typed choices out of order', async () => {
    const sheet = await parse(
      [
        para('BAGIAN PG'),
        para('1. Berapa $2+3$?'),
        para('B. 5'),
        para('A. 4'),
        para('Kunci: A'),
        para('Poin: 1'),
      ].join(''),
    )

    expect(sheet.questions).toEqual([])
    expect(sheet.errors).toHaveLength(1)
    expect(sheet.errors[0]?.reason).toMatch(
      /^Bagian PG, soal 1: Pilihan harus berurutan A, B, C dan seterusnya, pilihan A kosong atau tidak berurutan$/u,
    )
  })
})
