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
  IRdmImportRepository,
  type RdmImportPlan,
  type RdmImportResult,
} from '../../domain/rdm-import.repository.js'
import {
  IRdmSettingRepository,
  type RdmSettingEntity,
} from '../../domain/rdm-setting.js'
import { buildRdmWorkbook } from '../../infrastructure/rdm-workbook.builder.js'
import { buildRdmTemplateFixture } from '../../testing/rdm-template.fixture.js'
import { FillRdmTemplateUseCase } from './fill-rdm-template.use-case.js'
import { ImportRdmWorkbookUseCase } from './import-rdm-workbook.use-case.js'

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

describe('ImportRdmWorkbookUseCase', () => {
  let useCase: ImportRdmWorkbookUseCase
  let fillUseCase: FillRdmTemplateUseCase
  let setting: RdmSettingEntity
  let items: AssessmentItemWithDetails[]
  let enrollments: EnrollmentSummary[]
  let scores: ItemEnrollmentScore[]
  let teaches: boolean
  let appliedPlans: { plan: RdmImportPlan; correctedById: string | null }[]
  let applyResult: RdmImportResult

  beforeEach(async () => {
    setting = {
      sumatifTypes: [
        AssessmentType.ASSIGNMENT,
        AssessmentType.DAILY,
        AssessmentType.PRACTICAL,
        AssessmentType.MIDTERM,
      ],
      sasType: AssessmentType.FINAL,
    }
    items = []
    enrollments = [
      makeEnrollment('e-1', '1001', '0011111111', 'Ahmad'),
      makeEnrollment('e-2', '1002', '0022222222', 'Budi'),
      makeEnrollment('e-3', null, '0033333333', 'Citra'),
    ]
    scores = []
    teaches = true
    appliedPlans = []
    applyResult = { itemsCreated: 1, itemsUpdated: 0, scoresWritten: 2 }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportRdmWorkbookUseCase,
        FillRdmTemplateUseCase,
        {
          provide: IRdmSettingRepository,
          useValue: {
            get: () => Promise.resolve(setting),
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
          provide: IRdmImportRepository,
          useValue: {
            apply: (plan: RdmImportPlan, correctedById: string | null) => {
              appliedPlans.push({ plan, correctedById })
              return Promise.resolve(applyResult)
            },
          },
        },
        {
          provide: IEmployeeIdentityReadPort,
          useValue: {
            findEmployeeIdByUserId: () => Promise.resolve(EMPLOYEE_ID),
          },
        },
        {
          provide: IGradingScopeReadPort,
          useValue: {
            teachesTeachingAssignment: () => Promise.resolve(teaches),
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

    useCase = module.get(ImportRdmWorkbookUseCase)
    fillUseCase = module.get(FillRdmTemplateUseCase)
  })

  it('ignores sheets without B2 or without any F value', async () => {
    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(
      template as unknown as Parameters<typeof wb.xlsx.load>[0],
    )
    wb.getWorksheet('SUM 1')!.getCell('F7').value = 80
    wb.getWorksheet('SUM 2')!.getCell('B2').value = 'Tanpa Nilai'
    const file = Buffer.from(await wb.xlsx.writeBuffer())

    const preview = await useCase.preview({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file,
    })

    expect(preview).toEqual({
      sheets: [],
      unmatchedRows: [],
      invalidValues: [],
    })
    expect(appliedPlans).toHaveLength(0)
  })

  it('matches items by sameName, creates new items with first sumatifType and maxScore 100, and leaves empty F unchanged', async () => {
    items = [
      makeItem({
        id: 'item-1',
        name: 'UH 1',
        type: AssessmentType.DAILY,
        maxScore: 20,
        material: 'Materi Lama',
        kktp: 70,
      }),
    ]
    scores = [
      { assessmentItemId: 'item-1', enrollmentId: 'e-1', score: 17.5 },
      { assessmentItemId: 'item-1', enrollmentId: 'e-2', score: 15 },
    ]

    const file = await buildRdmWorkbook({
      kind: 'sumatif',
      classSubject: 'IX.A/Informatika',
      students: [
        { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
        { nis: '1002', nisn: '0022222222', name: 'Budi' },
        { nis: null, nisn: '0033333333', name: 'Citra' },
      ],
      sheets: [
        {
          name: '  uh 1 ',
          material: 'Materi Baru',
          kktp: 75,
          scores: new Map([
            [0, 88],
            [2, 90],
          ]),
        },
        {
          name: 'Proyek 1',
          material: 'Aplikasi Web',
          kktp: 80,
          scores: new Map([[0, 85]]),
        },
      ],
    })

    const preview = await useCase.preview({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file,
    })

    expect(preview).toEqual({
      sheets: [
        {
          sheetName: 'SUM 1',
          name: 'UH 1',
          action: 'update',
          itemId: 'item-1',
          scoresToWrite: 1,
          unchanged: 1,
        },
        {
          sheetName: 'SUM 2',
          name: 'Proyek 1',
          action: 'create',
          itemId: null,
          scoresToWrite: 1,
          unchanged: 0,
        },
      ],
      unmatchedRows: [],
      invalidValues: [],
    })
    expect(appliedPlans).toHaveLength(0)

    const result = await useCase.confirm({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file,
    })

    expect(result).toEqual(applyResult)
    expect(appliedPlans).toHaveLength(1)
    expect(appliedPlans[0]).toEqual({
      correctedById: null,
      plan: {
        teachingAssignmentId: TA_ID,
        creates: [
          {
            sheetName: 'SUM 2',
            name: 'Proyek 1',
            type: AssessmentType.ASSIGNMENT,
            material: 'Aplikasi Web',
            kktp: 80,
            scores: [{ enrollmentId: 'e-1', score: 85 }],
          },
        ],
        updates: [
          {
            itemId: 'item-1',
            material: 'Materi Baru',
            kktp: 75,
            scores: [{ enrollmentId: 'e-3', score: 18 }],
          },
        ],
      },
    })
  })

  it('produces an empty write plan on a no-op re-import', async () => {
    items = [
      makeItem({
        id: 'item-1',
        name: 'UH 1',
        maxScore: 20,
        material: 'Aljabar',
        kktp: 75,
      }),
    ]
    scores = [{ assessmentItemId: 'item-1', enrollmentId: 'e-1', score: 17.5 }]

    const file = await buildRdmWorkbook({
      kind: 'sumatif',
      classSubject: 'IX.A/Informatika',
      students: [{ nis: '1001', nisn: '0011111111', name: 'Ahmad' }],
      sheets: [
        {
          name: 'UH 1',
          material: 'Aljabar',
          kktp: 75,
          scores: new Map([[0, 88]]),
        },
      ],
    })

    const preview = await useCase.preview({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file,
    })
    expect(preview.sheets).toEqual([
      {
        sheetName: 'SUM 1',
        name: 'UH 1',
        action: 'update',
        itemId: 'item-1',
        scoresToWrite: 0,
        unchanged: 1,
      },
    ])

    await useCase.confirm({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file,
    })
    expect(appliedPlans[0]?.plan).toEqual({
      teachingAssignmentId: TA_ID,
      creates: [],
      updates: [],
    })
  })

  it('creates or matches the single SAS item and refuses multiple SAS items', async () => {
    const sasFile = await buildRdmWorkbook({
      kind: 'sas',
      classSubject: 'IX.A/Informatika',
      students: [{ nis: '1001', nisn: '0011111111', name: 'Ahmad' }],
      sheets: [
        {
          name: 'SAS Ganjil',
          material: 'Semua Bab',
          kktp: 75,
          scores: new Map([[0, 92]]),
        },
      ],
    })

    const createPreview = await useCase.preview({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: sasFile,
    })
    expect(createPreview.sheets).toEqual([
      {
        sheetName: 'SAS 1',
        name: 'SAS Ganjil',
        action: 'create',
        itemId: null,
        scoresToWrite: 1,
        unchanged: 0,
      },
    ])

    items = [makeItem({ id: 'sas-1', name: 'UAS', type: AssessmentType.FINAL })]
    const updatePreview = await useCase.preview({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: sasFile,
    })
    expect(updatePreview.sheets).toEqual([
      {
        sheetName: 'SAS 1',
        name: 'UAS',
        action: 'update',
        itemId: 'sas-1',
        scoresToWrite: 1,
        unchanged: 0,
      },
    ])

    items = [
      makeItem({ id: 'sas-1', name: 'UAS Teori', type: AssessmentType.FINAL }),
      makeItem({
        id: 'sas-2',
        name: 'UAS Praktik',
        type: AssessmentType.FINAL,
      }),
    ]
    await expect(
      useCase.preview({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file: sasFile,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Template SAS membutuhkan tepat satu penilaian jenis FINAL; ditemukan 2: UAS Praktik, UAS Teori',
      ),
    )
  })

  it('refuses creating a SAS item whose name is already used by another item', async () => {
    items = [
      makeItem({
        id: 'daily-1',
        name: 'SAS Ganjil',
        type: AssessmentType.DAILY,
      }),
    ]
    const sasFile = await buildRdmWorkbook({
      kind: 'sas',
      classSubject: 'IX.A/Informatika',
      students: [{ nis: '1001', nisn: '0011111111', name: 'Ahmad' }],
      sheets: [
        {
          name: ' sas ganjil ',
          material: null,
          kktp: null,
          scores: new Map([[0, 92]]),
        },
      ],
    })

    await expect(
      useCase.preview({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file: sasFile,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Nama penilaian sudah dipakai di kelas dan mapel ini',
      ),
    )
  })

  it('leaves students whose enrollment is not active unmatched', async () => {
    enrollments.push({
      ...makeEnrollment('e-4', '1004', '0044444444', 'Dodi'),
      status: 'TRANSFERRED',
    })
    const file = await buildRdmWorkbook({
      kind: 'sumatif',
      classSubject: 'IX.A/Informatika',
      students: [
        { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
        { nis: '1004', nisn: '0044444444', name: 'Dodi' },
      ],
      sheets: [
        {
          name: 'PH 1',
          material: null,
          kktp: null,
          scores: new Map([
            [0, 80],
            [1, 90],
          ]),
        },
      ],
    })

    const preview = await useCase.preview({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file,
    })

    expect(preview.sheets[0]?.scoresToWrite).toBe(1)
    expect(preview.unmatchedRows).toHaveLength(1)
  })

  it('refuses two sheets with the same B2 naming both sheets', async () => {
    const file = await buildRdmWorkbook({
      kind: 'sumatif',
      classSubject: 'IX.A/Informatika',
      students: [{ nis: '1001', nisn: '0011111111', name: 'Ahmad' }],
      sheets: [
        {
          name: 'UH 1',
          material: null,
          kktp: null,
          scores: new Map([[0, 80]]),
        },
        {
          name: ' uh 1 ',
          material: null,
          kktp: null,
          scores: new Map([[0, 90]]),
        },
      ],
    })

    await expect(
      useCase.preview({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Nama penilaian ganda di file: UH 1 (SUM 1, SUM 2)',
      ),
    )
  })

  it('reports invalid values in C5 and F, unmatched rows, and skips invalid entries on confirm', async () => {
    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
      { nis: '9999', nisn: '9999999999', name: 'Tidak Terdaftar' },
    ])
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(
      template as unknown as Parameters<typeof wb.xlsx.load>[0],
    )
    const sum1 = wb.getWorksheet('SUM 1')!
    sum1.getCell('B2').value = 'UH Baru'
    sum1.getCell('C5').value = 'bukan angka'
    sum1.getCell('F7').value = 101
    sum1.getCell('F8').value = 85

    const sum2 = wb.getWorksheet('SUM 2')!
    sum2.getCell('B2').value = 'UH Valid'
    sum2.getCell('F7').value = 'abc'
    sum2.getCell('F8').value = 80
    sum2.getCell('C8').value = '1002'
    sum2.getCell('D8').value = '0022222222'

    const file = Buffer.from(await wb.xlsx.writeBuffer())

    const preview = await useCase.preview({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file,
    })

    expect(preview.unmatchedRows).toEqual([{ sheetName: 'SUM 1', row: 8 }])
    expect(preview.invalidValues).toEqual([
      { sheetName: 'SUM 1', row: 5 },
      { sheetName: 'SUM 1', row: 7 },
      { sheetName: 'SUM 2', row: 7 },
    ])
    expect(preview.sheets).toEqual([
      {
        sheetName: 'SUM 1',
        name: 'UH Baru',
        action: 'create',
        itemId: null,
        scoresToWrite: 0,
        unchanged: 0,
      },
      {
        sheetName: 'SUM 2',
        name: 'UH Valid',
        action: 'create',
        itemId: null,
        scoresToWrite: 1,
        unchanged: 0,
      },
    ])

    await useCase.confirm({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file,
    })
    expect(appliedPlans[0]?.plan.creates).toEqual([
      {
        sheetName: 'SUM 1',
        name: 'UH Baru',
        type: AssessmentType.ASSIGNMENT,
        material: null,
        kktp: null,
        scores: [],
      },
      {
        sheetName: 'SUM 2',
        name: 'UH Valid',
        type: AssessmentType.ASSIGNMENT,
        material: null,
        kktp: null,
        scores: [{ enrollmentId: 'e-2', score: 80 }],
      },
    ])
  })

  it('refuses non-teacher callers', async () => {
    teaches = false
    const file = await buildRdmTemplateFixture('sas', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
    ])

    await expect(
      useCase.preview({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        file,
      }),
    ).rejects.toThrow(
      new ForbiddenException(
        'Hanya guru pengampu kelas dan mapel ini yang dapat memakai fitur RDM',
      ),
    )
  })

  it('produces no changes when importing back a filled synthetic template (round trip)', async () => {
    items = [
      makeItem({
        id: 'item-1',
        name: 'UH 1',
        maxScore: 20,
        material: 'Aljabar',
        kktp: 75,
      }),
    ]
    scores = [
      { assessmentItemId: 'item-1', enrollmentId: 'e-1', score: 17.5 },
      { assessmentItemId: 'item-1', enrollmentId: 'e-2', score: 15 },
    ]
    const template = await buildRdmTemplateFixture('sumatif', [
      { nis: '1001', nisn: '0011111111', name: 'Ahmad' },
      { nis: '1002', nisn: '0022222222', name: 'Budi' },
      { nis: '', nisn: '0033333333', name: 'Citra' },
    ])

    const filled = await fillUseCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: template,
      originalFileName: 'Template Nilai Sumatif-IX.A-Informatika.xlsx',
    })
    const filledFile = Buffer.from(filled.fileBase64, 'base64')

    const preview = await useCase.preview({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: filledFile,
    })
    expect(preview).toEqual({
      sheets: [
        {
          sheetName: 'SUM 1',
          name: 'UH 1',
          action: 'update',
          itemId: 'item-1',
          scoresToWrite: 0,
          unchanged: 2,
        },
      ],
      unmatchedRows: [],
      invalidValues: [],
    })

    await useCase.confirm({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      file: filledFile,
    })
    expect(appliedPlans[0]?.plan).toEqual({
      teachingAssignmentId: TA_ID,
      creates: [],
      updates: [],
    })
  })
})
