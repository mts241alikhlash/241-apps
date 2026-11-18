import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  PayloadTooLargeException,
} from '@nestjs/common'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import {
  FakeExamFileRepository,
  FakeExamFileStorage,
} from '../../../../exam-file/application/exam-file.fakes.fake.js'
import { UploadExamFileUseCase } from '../../../../exam-file/application/use-cases/upload-exam-file/upload-exam-file.use-case.js'
import { FakeExamPackageRepository } from '../../../../exam-package/application/exam-package.repository.fake.js'
import type { INikEmployeePort } from '../../../../platform/nik-employee/nik-employee.port.js'
import {
  FakeQuestionRepository,
  MANAGER,
  MATH_7,
  TEACHER,
  buildTeacherScope,
} from '../../../../question/application/question.repository.fake.js'
import { buildDocxTemplate } from '../../templates/docx-template.js'
import { ImportQuestionsUseCase } from './import-questions.use-case.js'

const HEADERS = [
  'No',
  'Jenis',
  'Soal',
  'A',
  'B',
  'C',
  'D',
  'E',
  'Kunci',
  'Abaikan harakat',
  'Poin',
]
type Cell = string | number | null
const pg = (n: number, kunci = 'B'): Cell[] => [
  n,
  'PG',
  `Soal ${n}`,
  'satu',
  'dua',
  'tiga',
  null,
  null,
  kunci,
  null,
  null,
]

const IDENTITY = {
  version: 2 as number | null,
  name: 'Budi',
  nik: '111',
  subject: 'Matematika',
  grade: '7',
}
type Identity = typeof IDENTITY

const identityRows = (identity: Identity): [string, Cell][] => [
  ['Versi Template', identity.version],
  ['Nama Guru', identity.name],
  ['NIK', identity.nik],
  ['Mapel', identity.subject],
  ['Tingkat', identity.grade],
]

async function xlsx(rows: Cell[][], overrides: Partial<Identity> = {}) {
  const book = new ExcelJS.Workbook()
  const identity = book.addWorksheet('Identitas')
  identityRows({ ...IDENTITY, ...overrides }).forEach((row) =>
    identity.addRow(row),
  )
  const sheet = book.addWorksheet('Soal')
  sheet.addRow(HEADERS)
  rows.forEach((row) => sheet.addRow(row))
  return Buffer.from(await book.xlsx.writeBuffer())
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const cell = (text: string) =>
  `<w:tc><w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p></w:tc>`
const drawingCell = (text: string, refs: number[]) =>
  `<w:tc><w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>${refs
    .map(
      (ref) =>
        `<w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:blipFill><a:blip r:embed="rI${ref}"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`,
    )
    .join('')}</w:tc>`
const table = (rows: string[]) =>
  `<w:tbl>${rows.map((row) => `<w:tr>${row}</w:tr>`).join('')}</w:tbl>`
const textRow = (cells: Cell[]) =>
  cells.map((value) => cell(String(value ?? ''))).join('')

async function docx(
  questionRows: string[],
  options: {
    images?: Buffer[]
    overrides?: Partial<Identity>
    extra?: string
  } = {},
) {
  const images = options.images ?? []
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  )
  zip.file(
    '_rels/.rels',
    `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  )
  zip.file(
    'word/_rels/document.xml.rels',
    `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${images
      .map(
        (_image, index) =>
          `<Relationship Id="rI${index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/i${index}.png"/>`,
      )
      .join('')}</Relationships>`,
  )
  images.forEach((image, index) => zip.file(`word/media/i${index}.png`, image))
  const identity = table(
    identityRows({ ...IDENTITY, ...options.overrides }).map((row) =>
      textRow(row),
    ),
  )
  zip.file(
    'word/document.xml',
    `${XML_HEADER}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${identity}${table([textRow(HEADERS), ...questionRows])}${options.extra ?? ''}</w:body></w:document>`,
  )
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

const PACKAGE_ID = '33333333-3333-4333-8333-333333333333'
const NIKS: Record<string, string> = { '111': 'emp-1', '222': 'emp-9' }

function build(
  options: { pairs?: (typeof MATH_7)[]; employeeId?: string | null } = {},
) {
  const questions = new FakeQuestionRepository()
  const packages = new FakeExamPackageRepository(questions)
  const now = new Date()
  packages.packages.set(PACKAGE_ID, {
    id: PACKAGE_ID,
    title: 'UTS Matematika',
    ...MATH_7,
    status: 'DRAFT',
    lockedAt: null,
    createdById: TEACHER.id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    items: [],
  })
  const files = new FakeExamFileRepository()
  const storage = new FakeExamFileStorage()
  const { scope, employees, academic } = buildTeacherScope({
    employeeId: options.employeeId === undefined ? 'emp-1' : options.employeeId,
    pairs: options.pairs ?? [MATH_7],
    existingEmployees: ['emp-9'],
  })
  const lookup = Object.assign(academic, {
    subjectsByIds: () => Promise.resolve([{ id: 'math', name: 'Matematika' }]),
    gradesByIds: () =>
      Promise.resolve([{ id: 'grade-7', level: 7, name: null }]),
  })
  const niks = {
    findEmployeeIdByNik: (nik: string) => Promise.resolve(NIKS[nik] ?? null),
  } as INikEmployeePort
  const upload = new UploadExamFileUseCase(files, storage)
  const execute = vi.spyOn(upload, 'execute')
  const addQuestions = vi.spyOn(packages, 'addQuestions')
  const useCase = new ImportQuestionsUseCase(
    scope,
    packages,
    employees,
    upload,
    lookup,
    niks,
    questions,
  )
  return { questions, packages, files, storage, useCase, execute, addQuestions }
}

const input = (buffer: Buffer, fileName = 'soal.xlsx') => ({
  buffer,
  size: buffer.length,
  fileName,
  packageId: PACKAGE_ID,
})

describe('ImportQuestionsUseCase', () => {
  describe('preview', () => {
    it('saves nothing and counts questions and points', async () => {
      const { questions, addQuestions, execute, useCase } = build()

      const preview = await useCase.preview(
        TEACHER,
        input(
          await xlsx([
            pg(1),
            [
              2,
              'Uraian',
              'Jelaskan',
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              5,
            ],
          ]),
        ),
      )

      expect(preview).toMatchObject({
        authorName: null,
        total: 2,
        totalPoints: 6,
        errors: [],
        duplicateRows: [],
        canSave: true,
        counts: { MULTIPLE_CHOICE: 1, ESSAY: 1, TRUE_FALSE: 0 },
        identity: { nik: '111', gradeLevel: 7, subjectName: 'Matematika' },
      })
      expect(addQuestions).not.toHaveBeenCalled()
      expect(execute).not.toHaveBeenCalled()
      expect(questions.questions.size).toBe(0)
    })

    it('counts Word pictures against the limits without uploading', async () => {
      const { files, execute, useCase } = build()
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64',
      )
      const file = await docx(
        [
          cell('1') +
            cell('PG') +
            drawingCell('Lihat', [0, 0]) +
            textRow(['a', 'b', '', '', '', 'A', '', '']),
        ],
        { images: [png] },
      )

      const preview = await useCase.preview(TEACHER, input(file, 'soal.docx'))

      expect(preview.errors).toEqual([])
      expect(preview.counts.MULTIPLE_CHOICE).toBe(1)
      expect(execute).not.toHaveBeenCalled()
      expect(files.files.size).toBe(0)
    })

    it('warns below the school standard without blocking the save', async () => {
      const { useCase } = build()

      const preview = await useCase.preview(TEACHER, input(await xlsx([pg(1)])))

      expect(preview.warnings).toContain('PG 1 dari 20')
      expect(preview.canSave).toBe(true)
    })

    it('says which subject and grade the file is for when they differ', async () => {
      const { useCase } = build()

      const preview = await useCase.preview(
        TEACHER,
        input(await xlsx([pg(1)], { subject: 'Fisika', grade: '8' })),
      )

      expect(preview.canSave).toBe(false)
      expect(preview.errors).toContainEqual({
        row: 0,
        reason:
          'File untuk Fisika tingkat 8, paket tujuan Matematika tingkat 7',
      })
    })

    it('refuses a version 1 file that has no Identitas sheet', async () => {
      const { useCase } = build()
      const book = new ExcelJS.Workbook()
      const sheet = book.addWorksheet('Soal')
      sheet.addRow(HEADERS)
      sheet.addRow(pg(1))
      const file = Buffer.from(await book.xlsx.writeBuffer())

      const preview = await useCase.preview(TEACHER, input(file))

      expect(preview.canSave).toBe(false)
      expect(preview.errors).toContainEqual({
        row: 0,
        reason: 'Template lama. Unduh template baru.',
      })
    })

    it('reports an unknown NIK', async () => {
      const { useCase } = build()

      const preview = await useCase.preview(
        TEACHER,
        input(await xlsx([pg(1)], { nik: '999' })),
      )

      expect(preview.errors).toContainEqual({
        row: 0,
        reason: 'NIK guru tidak ditemukan',
      })
      expect(preview.canSave).toBe(false)
    })

    it('flags rows that repeat a question already in the package', async () => {
      const { useCase } = build()
      const file = await xlsx([pg(1), pg(2)])
      await useCase.execute(TEACHER, input(file))

      const preview = await useCase.preview(
        TEACHER,
        input(await xlsx([pg(1), pg(3)])),
      )

      expect(preview.duplicateRows).toEqual([2])
      expect(preview.canSave).toBe(false)
    })
  })

  describe('execute', () => {
    it('creates every row in one call, in file order, authored by the NIK owner', async () => {
      const { packages, questions, addQuestions, useCase } = build()

      const result = await useCase.execute(
        TEACHER,
        input(await xlsx([1, 2, 3, 4, 5].map((n) => pg(n)))),
      )

      expect(result).toMatchObject({ created: 5, errors: [] })
      expect(addQuestions).toHaveBeenCalledTimes(1)
      const stored = packages.packages.get(PACKAGE_ID)
      expect(stored?.items.map((item) => item.position)).toEqual([
        1, 2, 3, 4, 5,
      ])
      expect(stored?.items.map((item) => item.questionId)).toEqual(
        result.questionIds,
      )
      expect(
        [...questions.questions.values()].every(
          (q) =>
            q.authorEmployeeId === 'emp-1' &&
            q.packageId === PACKAGE_ID &&
            q.subjectId === 'math',
        ),
      ).toBe(true)
    })

    it('saves nothing when one row is bad and lists the row', async () => {
      const { questions, addQuestions, useCase } = build()

      await expect(
        useCase.execute(
          TEACHER,
          input(await xlsx([pg(1), pg(2, 'F'), pg(3), pg(4), pg(5)])),
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Impor dibatalkan: baris 3: Kunci jawaban harus salah satu pilihan',
        ),
      )
      expect(addQuestions).not.toHaveBeenCalled()
      expect(questions.questions.size).toBe(0)
    })

    it('reports points outside the allowed range and saves nothing', async () => {
      const { questions, useCase } = build()
      const rows = [
        pg(1),
        [2, 'PG', 'Soal 2', 'a', 'b', null, null, null, 'A', null, 1000],
      ]

      await expect(
        useCase.execute(TEACHER, input(await xlsx(rows))),
      ).rejects.toThrow('baris 3: Poin harus antara 0,25 dan 100')
      expect(questions.questions.size).toBe(0)
    })

    it('refuses an unknown NIK and an identity mismatch', async () => {
      const { questions, useCase } = build()

      await expect(
        useCase.execute(TEACHER, input(await xlsx([pg(1)], { nik: '999' }))),
      ).rejects.toThrow('baris 0: NIK guru tidak ditemukan')
      await expect(
        useCase.execute(
          TEACHER,
          input(await xlsx([pg(1)], { subject: 'Fisika' })),
        ),
      ).rejects.toThrow(BadRequestException)
      expect(questions.questions.size).toBe(0)
    })

    it('forbids a teacher whose file carries another teacher NIK', async () => {
      const { questions, useCase } = build()

      await expect(
        useCase.execute(TEACHER, input(await xlsx([pg(1)], { nik: '222' }))),
      ).rejects.toThrow(
        new ForbiddenException('NIK pada berkas bukan NIK Anda'),
      )
      expect(questions.questions.size).toBe(0)
    })

    it('uses the NIK owner as author for a user who manages all', async () => {
      const { questions, useCase } = build({ employeeId: 'emp-2', pairs: [] })

      await useCase.execute(MANAGER, input(await xlsx([pg(1)], { nik: '222' })))

      expect(
        [...questions.questions.values()].map((q) => q.authorEmployeeId),
      ).toEqual(['emp-9'])
    })

    it('refuses duplicates until confirmed', async () => {
      const { questions, useCase } = build()
      await useCase.execute(TEACHER, input(await xlsx([pg(1)])))

      await expect(
        useCase.execute(TEACHER, input(await xlsx([pg(1), pg(2)]))),
      ).rejects.toThrow(new ConflictException('Soal ganda ditemukan: baris 2'))
      expect(questions.questions.size).toBe(1)

      const result = await useCase.execute(TEACHER, {
        ...input(await xlsx([pg(1), pg(2)])),
        confirmDuplicates: true,
      })

      expect(result.created).toBe(2)
      expect(questions.questions.size).toBe(3)
    })

    it('keeps Arabic with harakat and turns $x^2$ into a math span', async () => {
      const { questions, useCase } = build()
      const arabic = 'مَا مَعْنَى كِتَابٌ؟'

      await useCase.execute(
        TEACHER,
        input(
          await xlsx([
            [
              1,
              'Isian',
              arabic,
              null,
              null,
              null,
              null,
              null,
              'كِتَابٌ',
              null,
              null,
            ],
            [
              2,
              'Uraian',
              'Sederhanakan $x^2$',
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
            ],
          ]),
        ),
      )

      const bodies = [...questions.questions.values()].map(
        (q) => q.current.bodyHtml,
      )
      expect(bodies[0]).toBe(`<p dir="auto">${arabic}</p>`)
      expect(bodies[1]).toBe(
        '<p dir="auto">Sederhanakan <span data-latex="x^2">x^2</span></p>',
      )
    })

    it('imports the downloadable Word template', async () => {
      const { useCase } = build()
      const template = await buildDocxTemplate()

      const preview = await useCase.preview(
        TEACHER,
        input(template, 'template.docx'),
      )

      expect(preview.identity.version).toBe(2)
    })
  })

  describe('guards', () => {
    it('refuses a subject and grade the teacher does not teach before reading the file', async () => {
      const { questions, useCase } = build({ pairs: [] })

      await expect(
        useCase.execute(TEACHER, input(await xlsx([pg(1)]))),
      ).rejects.toThrow(ForbiddenException)
      expect(questions.questions.size).toBe(0)
    })

    it('refuses the wrong extension, a fake workbook and an oversized file', async () => {
      const { useCase } = build()
      const real = await xlsx([pg(1)])

      await expect(
        useCase.execute(TEACHER, input(real, 'soal.csv')),
      ).rejects.toThrow(
        new BadRequestException('Berkas harus .xlsx atau .docx'),
      )
      await expect(
        useCase.execute(TEACHER, input(Buffer.from('a,b,c'), 'soal.xlsx')),
      ).rejects.toThrow(
        new BadRequestException('Isi berkas tidak sesuai dengan jenisnya'),
      )
      await expect(
        useCase.execute(TEACHER, {
          ...input(real),
          size: 10 * 1024 * 1024 + 1,
        }),
      ).rejects.toThrow(
        new PayloadTooLargeException('Ukuran berkas maksimal 10 MB'),
      )
    })

    it('refuses a sheet with more than 500 questions', async () => {
      const { useCase } = build()
      const rows = Array.from({ length: 501 }, (_, i) => pg(i + 1))

      await expect(
        useCase.execute(TEACHER, input(await xlsx(rows))),
      ).rejects.toThrow(new BadRequestException('Maksimal 500 soal per berkas'))
    })

    it('stores nothing executable from a hostile Word file or sheet', async () => {
      const { questions, useCase } = build()
      const hostile = '<script>alert(1)</script><img src=x onerror=alert(2)>'
      const escaped = hostile.replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
      const word = await docx([
        textRow([
          1,
          'Uraian',
          `Klik ${escaped} di sini`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ]),
      ])
      const sheet = await xlsx([
        [
          1,
          'Uraian',
          hostile,
          null,
          null,
          null,
          null,
          null,
          hostile,
          null,
          null,
        ],
      ])

      await useCase.execute(TEACHER, input(word, 'soal.docx'))
      await useCase.execute(TEACHER, {
        ...input(sheet),
        confirmDuplicates: true,
      })

      const stored = [...questions.questions.values()].flatMap((q) => [
        q.current.bodyHtml,
        JSON.stringify(q.current.content),
      ])
      expect(stored.join('')).toContain('di sini')
      for (const html of stored) {
        expect(html).not.toMatch(/<script|<a[\s>]|<img|\shref=|javascript:/iu)
      }
    })

    describe('images in a Word file', () => {
      const png = (seed: number) =>
        Buffer.concat([
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          Buffer.from([seed % 256, Math.floor(seed / 256)]),
        ])
      const withPictures = (images: Buffer[], refs: number[]) =>
        docx(
          [
            cell('1') +
              cell('Uraian') +
              drawingCell('Lihat gambar', refs) +
              textRow(['', '', '', '', '', '', '', '']),
          ],
          { images },
        )

      it('stores the same picture once however often it appears', async () => {
        const { files, questions, useCase } = build()
        const file = await withPictures([png(1)], [0, 0, 0, 0, 0])

        const result = await useCase.execute(TEACHER, input(file, 'soal.docx'))

        expect(result.created).toBe(1)
        expect(files.files.size).toBe(1)
        const [fileId] = [...files.files.keys()]
        const [question] = [...questions.questions.values()]
        expect(question?.current.bodyHtml).toContain(`data-file-id="${fileId}"`)
      })

      it('refuses a picture that is not JPG, PNG or WebP instead of dropping it', async () => {
        const { questions, useCase } = build()
        const file = await withPictures([Buffer.from('GIF89a......')], [0])

        await expect(
          useCase.execute(TEACHER, input(file, 'soal.docx')),
        ).rejects.toThrow(
          new BadRequestException('Gambar harus JPG, PNG, atau WebP'),
        )
        expect(questions.questions.size).toBe(0)
      })

      it('refuses more than 100 different pictures and stores none of the rest', async () => {
        const { files, questions, useCase } = build()
        const images = Array.from({ length: 101 }, (_, i) => png(i))
        const file = await withPictures(
          images,
          images.map((_, i) => i),
        )

        await expect(
          useCase.execute(TEACHER, input(file, 'soal.docx')),
        ).rejects.toThrow(
          new BadRequestException('Maksimal 100 gambar per berkas'),
        )
        expect(files.files.size).toBeLessThanOrEqual(100)
        expect(questions.questions.size).toBe(0)
      })
    })

    it('imports into an approved package and sets it back to draft', async () => {
      const { packages, useCase } = build()
      packages.packages.set(PACKAGE_ID, {
        ...packages.packages.get(PACKAGE_ID)!,
        status: 'APPROVED',
      })

      await useCase.execute(TEACHER, input(await xlsx([pg(1)])))

      expect(packages.packages.get(PACKAGE_ID)?.status).toBe('DRAFT')
    })

    it('refuses a submitted package and imports nothing', async () => {
      const { packages, questions, useCase } = build()
      packages.packages.set(PACKAGE_ID, {
        ...packages.packages.get(PACKAGE_ID)!,
        status: 'SUBMITTED',
      })

      await expect(
        useCase.execute(TEACHER, input(await xlsx([pg(1)]))),
      ).rejects.toThrow(ConflictException)
      expect(questions.questions.size).toBe(0)
    })

    it('refuses a package that does not exist', async () => {
      const { useCase } = build()

      await expect(
        useCase.execute(TEACHER, {
          ...input(await xlsx([pg(1)])),
          packageId: '00000000-0000-4000-8000-000000000000',
        }),
      ).rejects.toThrow('Paket tidak ditemukan')
    })
  })
})
