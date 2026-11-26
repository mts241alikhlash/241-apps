import { ForbiddenException } from '@nestjs/common'
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
import { DownloadRdmWorkbookUseCase } from './download-rdm-workbook.use-case.js'

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

describe('DownloadRdmWorkbookUseCase', () => {
  let useCase: DownloadRdmWorkbookUseCase
  let setting: RdmSettingEntity
  let items: AssessmentItemWithDetails[]
  let enrollments: EnrollmentSummary[]
  let scores: ItemEnrollmentScore[]
  let teaches: boolean
  let classroomCode: string
  let subjectName: string

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
      makeEnrollment('e-2', '1002', '0022222222', 'Budi'),
      makeEnrollment('e-1', '1001', '0011111111', 'Ahmad'),
    ]
    scores = []
    teaches = true
    classroomCode = 'IX.A'
    subjectName = 'Informatika'

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadRdmWorkbookUseCase,
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
                  subjectName,
                  classroomCode,
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

    useCase = module.get(DownloadRdmWorkbookUseCase)
  })

  it('builds a sumatif workbook sorted by student name and item name with sanitized file name', async () => {
    classroomCode = 'IX/A'
    subjectName = 'Al-Quran: Hadis'
    items = [
      makeItem({
        id: 'item-2',
        name: 'UH 1',
        maxScore: 20,
        material: 'Tajwid',
        kktp: 75,
      }),
      makeItem({
        id: 'item-1',
        name: 'Tugas 1',
        type: AssessmentType.ASSIGNMENT,
      }),
      makeItem({ id: 'item-sas', name: 'UAS', type: AssessmentType.FINAL }),
    ]
    scores = [
      { assessmentItemId: 'item-2', enrollmentId: 'e-1', score: 17.5 },
      { assessmentItemId: 'item-2', enrollmentId: 'e-2', score: null },
    ]

    const result = await useCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      kind: 'sumatif',
    })

    expect(result.fileName).toBe('Nilai Sumatif-IX-A-Al-Quran- Hadis.xlsx')
    expect(result.itemsNotIncluded).toBe(0)

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(
      result.buffer as unknown as Parameters<typeof wb.xlsx.load>[0],
    )
    const sum1 = wb.getWorksheet('SUM 1')!
    expect(sum1.getCell('B2').value).toBe('Tugas 1')
    expect(sum1.getCell('E7').value).toBe('Ahmad')
    expect(sum1.getCell('E8').value).toBe('Budi')

    const sum2 = wb.getWorksheet('SUM 2')!
    expect(sum2.getCell('B2').value).toBe('UH 1')
    expect(sum2.getCell('B3').value).toBe('Tajwid')
    expect(sum2.getCell('C5').value).toBe(75)
    expect(sum2.getCell('F7').value).toBe(88)
    expect(sum2.getCell('F8').value).toBeNull()
  })

  it('caps sumatif sheets at 15 and reports remaining count in itemsNotIncluded', async () => {
    items = Array.from({ length: 17 }, (_, index) =>
      makeItem({
        id: `item-${index + 1}`,
        name: `UH ${String(index + 1).padStart(2, '0')}`,
      }),
    )

    const result = await useCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      kind: 'sumatif',
    })

    expect(result.itemsNotIncluded).toBe(2)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(
      result.buffer as unknown as Parameters<typeof wb.xlsx.load>[0],
    )
    expect(wb.worksheets).toHaveLength(15)
    expect(wb.getWorksheet('SUM 15')!.getCell('B2').value).toBe('UH 15')
  })

  it('builds a SAS workbook even when no SAS item exists yet', async () => {
    const result = await useCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
      kind: 'sas',
    })

    expect(result.fileName).toBe('Nilai SAS-IX.A-Informatika.xlsx')
    expect(result.itemsNotIncluded).toBe(0)

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(
      result.buffer as unknown as Parameters<typeof wb.xlsx.load>[0],
    )
    expect(wb.worksheets.map((ws) => ws.name)).toEqual(['SAS 1'])
    const sas1 = wb.getWorksheet('SAS 1')!
    expect(sas1.getCell('B2').value).toBeNull()
    expect(sas1.getCell('E7').value).toBe('Ahmad')
  })

  it('refuses non-teacher callers', async () => {
    teaches = false

    await expect(
      useCase.execute({
        userId: USER_ID,
        teachingAssignmentId: TA_ID,
        kind: 'sumatif',
      }),
    ).rejects.toThrow(
      new ForbiddenException(
        'Hanya guru pengampu kelas dan mapel ini yang dapat memakai fitur RDM',
      ),
    )
  })
})
