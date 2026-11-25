import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import ExcelJS from 'exceljs'
import {
  IAssessmentItemRepository,
  type AssessmentItemWithDetails,
} from '../../../assessment/domain/repositories/assessment-item.repository.js'
import { IGradingScopeReadPort } from '../../../assessment/domain/repositories/grading-scope-read.port.js'
import {
  IStudentScoreRepository,
  type ItemEnrollmentScore,
} from '../../../assessment/domain/repositories/student-score.repository.js'
import { IAcademicLookupPort } from '../../../platform/academic-lookup/academic-lookup.port.js'
import { IEmployeeIdentityReadPort } from '../../../platform/employee-identity/employee-identity.port.js'
import {
  IEnrollmentLookupPort,
  type EnrollmentSummary,
} from '../../../platform/enrollment-lookup/enrollment-lookup.port.js'
import {
  IRdmSettingRepository,
  type RdmSettingEntity,
} from '../../domain/rdm-setting.js'
import { buildRdmTemplateFixture } from '../../testing/rdm-template.fixture.js'
import { FillRdmTemplateUseCase } from './fill-rdm-template.use-case.js'

const USER_ID = 'user-1'
const EMPLOYEE_ID = 'employee-1'
const TA_ID = 'ta-1'
const CLASSROOM_ID = 'classroom-1'
const SEMESTER_ID = 'semester-1'

function makeItem(
  overrides: Partial<AssessmentItemWithDetails> & { id: string; name: string },
): AssessmentItemWithDetails {
  return {
    teachingAssignmentId: TA_ID,
    type: AssessmentType.DAILY,
    weight: 1,
    maxScore: 100,
    material: null,
    kktp: null,
    deletedAt: null,
    teachingAssignment: {
      id: TA_ID,
      employeeId: EMPLOYEE_ID,
      classroomId: CLASSROOM_ID,
      subjectId: 'subject-1',
      semesterId: SEMESTER_ID,
      passingScore: 75,
      classroom: {
        id: CLASSROOM_ID,
        code: 'IX.A',
        name: '9A',
        gradeId: 'grade-1',
        academicYearId: 'ay-1',
      },
      subject: {
        id: 'subject-1',
        code: 'INF',
        name: 'Informatika',
      },
    },
    ...overrides,
  }
}

function makeEnrollment(
  id: string,
  nis: string | null,
  nisn: string | null,
  name: string,
): EnrollmentSummary {
  return {
    id,
    studentId: `student-${id}`,
    classroomId: CLASSROOM_ID,
    semesterId: SEMESTER_ID,
    status: 'ACTIVE',
    studentUserId: `u-${id}`,
    studentNis: nis,
    studentNisn: nisn,
    studentName: name,
  }
}

describe('FillRdmTemplateUseCase', () => {
  let useCase: FillRdmTemplateUseCase

  let setting: RdmSettingEntity
  let items: AssessmentItemWithDetails[]
  let enrollments: EnrollmentSummary[]
  let scores: ItemEnrollmentScore[]
  let employeeId: string | null
  let teaches: boolean

  beforeEach(async () => {
    setting = {
      sumatifTypes: [
        AssessmentType.DAILY,
        AssessmentType.ASSIGNMENT,
        AssessmentType.PRACTICAL,
        AssessmentType.MIDTERM,
      ],
      sasType: AssessmentType.FINAL,
    }
    items = []
    enrollments = [
      makeEnrollment('e-1', '1001', '0011111111', 'Ahmad'),
      makeEnrollment('e-2', '1002', '0022222222', 'Budi'),
      makeEnrollment('e-3', '1003', '0033333333', 'Citra'),
    ]
    scores = []
    employeeId = EMPLOYEE_ID
    teaches = true

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FillRdmTemplateUseCase,
        {
          provide: IRdmSettingRepository,
          useValue: {
            get: () => Promise.resolve(setting),
            replace: () => Promise.resolve(setting),
          },
        },
        {
          provide: IAssessmentItemRepository,
          useValue: {
            findAllByTeachingAssignment: () => Promise.resolve(items),
          },
        },
        {
          provide: IStudentScoreRepository,
          useValue: {
            findScoresForItems: (
              itemIds: string[],
              enrollmentIds: string[],
            ) => {
              const itemSet = new Set(itemIds)
              const enrollmentSet = new Set(enrollmentIds)
              return Promise.resolve(
                scores.filter(
                  (row) =>
                    itemSet.has(row.assessmentItemId) &&
                    enrollmentSet.has(row.enrollmentId),
                ),
              )
            },
          },
        },
        {
          provide: IEmployeeIdentityReadPort,
          useValue: {
            findEmployeeIdByUserId: () => Promise.resolve(employeeId),
            employeeExists: () => Promise.resolve(true),
          },
        },
        {
          provide: IGradingScopeReadPort,
          useValue: {
            teachesTeachingAssignment: () => Promise.resolve(teaches),
            teachesAssessmentItem: () => Promise.resolve(false),
            supervisesEnrollment: () => Promise.resolve(false),
          },
        },
        {
          provide: IEnrollmentLookupPort,
          useValue: {
            search: () => Promise.resolve(enrollments),
          },
        },
        {
          provide: IAcademicLookupPort,
          useValue: {
            listTeachingAssignments: () =>
              Promise.resolve([
                {
                  id: TA_ID,
                  employeeId: EMPLOYEE_ID,
                  classroomId: CLASSROOM_ID,
                  subjectId: 'subject-1',
                  semesterId: SEMESTER_ID,
                  subjectCode: 'INF',
                  subjectName: 'Informatika',
                  classroomCode: 'IX.A',
                  classroomName: '9A',
                  classroomGradeId: 'grade-1',
                  classroomAcademicYearId: 'ay-1',
                  passingScore: 75,
                  employeeUserId: USER_ID,
                },
              ]),
          },
        },
      ],
    }).compile()

    useCase = module.get(FillRdmTemplateUseCase)
  })

  it('fills SUM 1..SUM 3 in name order and leaves SUM 4 untouched', async () => {
    items = [
      makeItem({
        id: 'item-c',
        name: 'UTS',
        type: AssessmentType.MIDTERM,
        maxScore: 50,
        material: 'Bab 1 & 2',
        kktp: 75,
      }),
      makeItem({
        id: 'item-a',
        name: 'Tugas 1',
        type: AssessmentType.ASSIGNMENT,
        maxScore: 100,
        material: null,
        kktp: null,
      }),
      makeItem({
        id: 'item-b',
        name: 'UH 1',
        type: AssessmentType.DAILY,
        maxScore: 80,
        material: 'Algoritma & <Pemrograman>',
        kktp: 70,
      }),
      makeItem({
        id: 'item-sas',
        name: 'UAS',
        type: AssessmentType.FINAL,
      }),
    ]
    scores = [
      { assessmentItemId: 'item-a', enrollmentId: 'e-1', score: 85 },
      { assessmentItemId: 'item-a', enrollmentId: 'e-2', score: 0 },
      { assessmentItemId: 'item-a', enrollmentId: 'e-3', score: null },
      { assessmentItemId: 'item-b', enrollmentId: 'e-1', score: 60 },
      { assessmentItemId: 'item-c', enrollmentId: 'e-2', score: 45 },
    ]

    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
      { nis: '1002', nisn: '0022222222', name: 'Budi' },
      { nis: '1003', nisn: '0033333333', name: 'Citra' },
    ])

    const result = await useCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: template,
      originalFileName: 'Template Nilai Sumatif-IX.A-Informatika.xlsx',
    })

    expect(result.fileName).toBe(
      'Template Nilai Sumatif-IX.A-Informatika - terisi.xlsx',
    )
    expect(result.summary).toEqual({
      kind: 'sumatif',
      classSubjectWarning: null,
      sheets: [
        {
          sheetName: 'SUM 1',
          itemId: 'item-a',
          itemName: 'Tugas 1',
          written: 2,
        },
        { sheetName: 'SUM 2', itemId: 'item-b', itemName: 'UH 1', written: 1 },
        { sheetName: 'SUM 3', itemId: 'item-c', itemName: 'UTS', written: 1 },
      ],
      unmatchedRows: [],
      ambiguousRows: [],
      missingStudents: [],
      itemsNotSent: [],
    })

    const wb = new ExcelJS.Workbook()
    const patched = Buffer.from(result.fileBase64, 'base64')
    await wb.xlsx.load(patched as unknown as Parameters<typeof wb.xlsx.load>[0])

    const sum1 = wb.getWorksheet('SUM 1')!
    expect(sum1.getCell('B2').value).toBe('Tugas 1')
    expect(sum1.getCell('B3').value).toBeNull()
    expect(sum1.getCell('C5').value).toBeNull()
    expect(sum1.getCell('F7').value).toBe(85)
    expect(sum1.getCell('F8').value).toBe(0)
    expect(sum1.getCell('F9').value).toBeNull()

    const sum2 = wb.getWorksheet('SUM 2')!
    expect(sum2.getCell('B2').value).toBe('UH 1')
    expect(sum2.getCell('B3').value).toBe('Algoritma & <Pemrograman>')
    expect(sum2.getCell('C5').value).toBe(70)
    expect(sum2.getCell('F7').value).toBe(75)
    expect(sum2.getCell('F8').value).toBeNull()

    const sum3 = wb.getWorksheet('SUM 3')!
    expect(sum3.getCell('B2').value).toBe('UTS')
    expect(sum3.getCell('B3').value).toBe('Bab 1 & 2')
    expect(sum3.getCell('C5').value).toBe(75)
    expect(sum3.getCell('F8').value).toBe(90)

    const sum4 = wb.getWorksheet('SUM 4')!
    expect(sum4.getCell('B2').value).toBeNull()
    expect(sum4.getCell('B3').value).toBeNull()
    expect(sum4.getCell('C5').value).toBeNull()
    expect(sum4.getCell('F7').value).toBeNull()
  })

  it('limits selection by itemIds, orders by name, and reports itemsNotSent', async () => {
    items = [
      makeItem({ id: 'item-1', name: 'UH 1' }),
      makeItem({ id: 'item-2', name: 'UH 2' }),
      makeItem({
        id: 'item-3',
        name: 'Tugas 1',
        type: AssessmentType.ASSIGNMENT,
      }),
    ]
    scores = [
      { assessmentItemId: 'item-2', enrollmentId: 'e-1', score: 90 },
      { assessmentItemId: 'item-3', enrollmentId: 'e-1', score: 80 },
    ]

    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])

    const result = await useCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: template,
      originalFileName: 'Template.XLSX',
      itemIds: ['item-2', 'item-3'],
    })

    expect(result.fileName).toBe('Template - terisi.xlsx')
    expect(result.summary.sheets).toEqual([
      { sheetName: 'SUM 1', itemId: 'item-3', itemName: 'Tugas 1', written: 1 },
      { sheetName: 'SUM 2', itemId: 'item-2', itemName: 'UH 2', written: 1 },
    ])
    expect(result.summary.itemsNotSent).toEqual([
      { id: 'item-1', name: 'UH 1' },
    ])
    expect(result.summary.missingStudents).toEqual(['Budi', 'Citra'])
  })

  it('refuses more than 15 selected sumatif items', async () => {
    items = Array.from({ length: 16 }, (_, index) =>
      makeItem({
        id: `item-${index + 1}`,
        name: `UH ${String(index + 1).padStart(2, '0')}`,
      }),
    )

    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])

    await expect(
      useCase.execute({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file: template,
        originalFileName: 'sumatif.xlsx',
      }),
    ).rejects.toThrow(
      new BadRequestException('Maksimal 15 penilaian per file RDM'),
    )
  })

  it('refuses a sumatif fill when no item can be sent instead of returning an untouched file', async () => {
    items = [
      makeItem({ id: 'final-1', name: 'UAS', type: AssessmentType.FINAL }),
    ]
    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])

    await expect(
      useCase.execute({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file: template,
        originalFileName: 'sumatif.xlsx',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Tidak ada penilaian yang dapat dikirim ke template Sumatif ini',
      ),
    )
  })

  it('refuses SAS with zero or multiple SAS-type items', async () => {
    items = [
      makeItem({ id: 'item-1', name: 'UH 1', type: AssessmentType.DAILY }),
    ]

    const sasTemplate = await buildRdmTemplateFixture('sas', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])

    await expect(
      useCase.execute({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file: sasTemplate,
        originalFileName: 'sas.xlsx',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Template SAS membutuhkan tepat satu penilaian jenis FINAL; ditemukan 0: -',
      ),
    )

    items = [
      makeItem({ id: 'sas-1', name: 'UAS Teori', type: AssessmentType.FINAL }),
      makeItem({
        id: 'sas-2',
        name: 'UAS Praktik',
        type: AssessmentType.FINAL,
      }),
    ]

    await expect(
      useCase.execute({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file: sasTemplate,
        originalFileName: 'sas.xlsx',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Template SAS membutuhkan tepat satu penilaian jenis FINAL; ditemukan 2: UAS Praktik, UAS Teori',
      ),
    )
  })

  it('fills SAS 1 when exactly one SAS item exists', async () => {
    items = [
      makeItem({
        id: 'sas-1',
        name: 'Penilaian Akhir Semester',
        type: AssessmentType.FINAL,
        material: 'Semua materi',
        kktp: 75,
        maxScore: 100,
      }),
    ]
    scores = [{ assessmentItemId: 'sas-1', enrollmentId: 'e-1', score: 92 }]

    const sasTemplate = await buildRdmTemplateFixture('sas', [
      { nis: '', nisn: '0011111111', name: 'Ahmad' },
      { nis: '9999', nisn: '', name: 'Unknown' },
    ])

    const result = await useCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: sasTemplate,
      originalFileName: 'Template SAS-IX.A-Informatika.xlsx',
    })

    expect(result.summary).toEqual({
      kind: 'sas',
      classSubjectWarning: null,
      sheets: [
        {
          sheetName: 'SAS 1',
          itemId: 'sas-1',
          itemName: 'Penilaian Akhir Semester',
          written: 1,
        },
      ],
      unmatchedRows: [8],
      ambiguousRows: [],
      missingStudents: ['Budi', 'Citra'],
      itemsNotSent: [],
    })

    const wb = new ExcelJS.Workbook()
    const patched = Buffer.from(result.fileBase64, 'base64')
    await wb.xlsx.load(patched as unknown as Parameters<typeof wb.xlsx.load>[0])
    const sas1 = wb.getWorksheet('SAS 1')!
    expect(sas1.getCell('B2').value).toBe('Penilaian Akhir Semester')
    expect(sas1.getCell('B3').value).toBe('Semua materi')
    expect(sas1.getCell('C5').value).toBe(75)
    expect(sas1.getCell('F7').value).toBe(92)
    expect(sas1.getCell('F8').value).toBeNull()
  })

  it('warns when E2 differs from classroom/subject without failing', async () => {
    items = [
      makeItem({
        id: 'item-1',
        name: 'UH 1',
        teachingAssignment: {
          id: TA_ID,
          employeeId: EMPLOYEE_ID,
          classroomId: CLASSROOM_ID,
          subjectId: 'subject-1',
          semesterId: SEMESTER_ID,
          passingScore: 75,
          classroom: {
            id: CLASSROOM_ID,
            code: 'IX.B',
            name: '9B',
            gradeId: 'grade-1',
            academicYearId: 'ay-1',
          },
          subject: {
            id: 'subject-1',
            code: 'INF',
            name: 'Informatika',
          },
        },
      }),
    ]
    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])

    const result = await useCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: template,
      originalFileName: 'template.xlsx',
    })

    expect(result.summary.classSubjectWarning).toBe(
      'Kelas/mapel di file (IX.A/Informatika) berbeda dengan kelas dan mapel yang dipilih (IX.B/Informatika)',
    )
  })

  it('accepts classroom.name/subject.name case-insensitively for E2', async () => {
    items = [
      makeItem({
        id: 'item-1',
        name: 'UH 1',
        teachingAssignment: {
          id: TA_ID,
          employeeId: EMPLOYEE_ID,
          classroomId: CLASSROOM_ID,
          subjectId: 'subject-1',
          semesterId: SEMESTER_ID,
          passingScore: 75,
          classroom: {
            id: CLASSROOM_ID,
            code: '9A',
            name: 'ix.a',
            gradeId: 'grade-1',
            academicYearId: 'ay-1',
          },
          subject: {
            id: 'subject-1',
            code: 'INF',
            name: 'informatika',
          },
        },
      }),
    ]
    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])

    const result = await useCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: template,
      originalFileName: 'template.xlsx',
    })

    expect(result.summary.classSubjectWarning).toBeNull()
  })

  it('refuses duplicate names in the selection', async () => {
    items = [
      makeItem({ id: 'item-1', name: 'UH 1' }),
      makeItem({ id: 'item-2', name: 'uh 1 ' }),
    ]
    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])

    await expect(
      useCase.execute({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file: template,
        originalFileName: 'template.xlsx',
      }),
    ).rejects.toThrow(
      new BadRequestException('Nama penilaian ganda: UH 1, uh 1'),
    )
  })

  it('refuses names longer than 50 characters because RDM cuts them and duplicates the TP/LM', async () => {
    const fifty = 'A'.repeat(50)
    const fiftyOne = `B${'b'.repeat(50)}`
    items = [
      makeItem({ id: 'item-1', name: fifty }),
      makeItem({ id: 'item-2', name: fiftyOne }),
    ]
    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])

    await expect(
      useCase.execute({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file: template,
        originalFileName: 'template.xlsx',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        `Nama penilaian untuk RDM maksimal 50 karakter: ${fiftyOne}`,
      ),
    )

    const accepted = await useCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: template,
      originalFileName: 'template.xlsx',
      itemIds: ['item-1'],
    })
    expect(accepted.summary.sheets).toHaveLength(1)
  })

  it('refuses itemIds outside the teaching assignment or of an incompatible type', async () => {
    items = [
      makeItem({ id: 'item-sas', name: 'UAS', type: AssessmentType.FINAL }),
    ]
    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])

    await expect(
      useCase.execute({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file: template,
        originalFileName: 'template.xlsx',
        itemIds: ['item-sas', 'unknown-id'],
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Penilaian tidak dapat dikirim ke template ini: UAS, unknown-id',
      ),
    )
  })

  it('refuses non-teacher callers', async () => {
    teaches = false
    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])

    await expect(
      useCase.execute({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file: template,
        originalFileName: 'template.xlsx',
      }),
    ).rejects.toThrow(
      new ForbiddenException(
        'Hanya guru pengampu kelas dan mapel ini yang dapat memakai fitur RDM',
      ),
    )
  })

  it('reports ambiguous rows when template duplicates a student', async () => {
    items = [makeItem({ id: 'item-1', name: 'UH 1' })]
    scores = [{ assessmentItemId: 'item-1', enrollmentId: 'e-1', score: 95 }]

    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
      { nis: '1001', nisn: '0011111111', name: 'Ahmad Duplikat' },
    ])

    const result = await useCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: template,
      originalFileName: 'template.xlsx',
    })

    expect(result.summary.ambiguousRows).toEqual([7, 8])
    expect(result.summary.sheets[0]?.written).toBe(0)
    expect(result.summary.missingStudents).toEqual(['Ahmad', 'Budi', 'Citra'])
  })

  it('refuses a non-RDM workbook', async () => {
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('Sheet1')
    const file = Buffer.from(await wb.xlsx.writeBuffer())

    await expect(
      useCase.execute({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file,
        originalFileName: 'other.xlsx',
      }),
    ).rejects.toThrow(new BadRequestException('File ini bukan template RDM'))
  })
})
