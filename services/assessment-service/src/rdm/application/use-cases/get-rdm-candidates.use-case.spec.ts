import { ForbiddenException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import {
  IAssessmentItemRepository,
  type AssessmentItemWithDetails,
} from '../../../assessment/domain/repositories/assessment-item.repository.js'
import { IGradingScopeReadPort } from '../../../assessment/domain/repositories/grading-scope-read.port.js'
import { IEmployeeIdentityReadPort } from '../../../platform/employee-identity/employee-identity.port.js'
import {
  IRdmSettingRepository,
  type RdmSettingEntity,
} from '../../domain/rdm-setting.js'
import { GetRdmCandidatesUseCase } from './get-rdm-candidates.use-case.js'

const USER_ID = 'user-1'
const EMPLOYEE_ID = 'employee-1'
const TA_ID = 'ta-1'

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

describe('GetRdmCandidatesUseCase', () => {
  let useCase: GetRdmCandidatesUseCase
  let setting: RdmSettingEntity
  let items: AssessmentItemWithDetails[]
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
    teaches = true

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRdmCandidatesUseCase,
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
          provide: IEmployeeIdentityReadPort,
          useValue: {
            findEmployeeIdByUserId: () => Promise.resolve(EMPLOYEE_ID),
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
      ],
    }).compile()

    useCase = module.get(GetRdmCandidatesUseCase)
  })

  it('partitions and sorts items into sumatif and sas candidates according to settings', async () => {
    items = [
      makeItem({
        id: 'i-3',
        name: 'UTS',
        type: AssessmentType.MIDTERM,
        maxScore: 50,
        material: 'Bab 1',
        kktp: 75,
      }),
      makeItem({
        id: 'i-1',
        name: 'UH 1',
        type: AssessmentType.DAILY,
        maxScore: 100,
      }),
      makeItem({
        id: 'i-4',
        name: 'UAS',
        type: AssessmentType.FINAL,
        maxScore: 100,
      }),
      makeItem({
        id: 'i-2',
        name: 'Tugas 1',
        type: AssessmentType.ASSIGNMENT,
        maxScore: 100,
      }),
    ]

    const result = await useCase.execute({
      userId: USER_ID,
      teachingAssignmentId: TA_ID,
    })

    expect(result).toEqual({
      sumatif: [
        {
          id: 'i-2',
          name: 'Tugas 1',
          type: AssessmentType.ASSIGNMENT,
          maxScore: 100,
          material: null,
          kktp: null,
        },
        {
          id: 'i-1',
          name: 'UH 1',
          type: AssessmentType.DAILY,
          maxScore: 100,
          material: null,
          kktp: null,
        },
        {
          id: 'i-3',
          name: 'UTS',
          type: AssessmentType.MIDTERM,
          maxScore: 50,
          material: 'Bab 1',
          kktp: 75,
        },
      ],
      sas: [
        {
          id: 'i-4',
          name: 'UAS',
          type: AssessmentType.FINAL,
          maxScore: 100,
          material: null,
          kktp: null,
        },
      ],
    })
  })

  it('refuses non-teacher callers', async () => {
    teaches = false

    await expect(
      useCase.execute({ userId: USER_ID, teachingAssignmentId: TA_ID }),
    ).rejects.toThrow(
      new ForbiddenException(
        'Hanya guru pengampu kelas dan mapel ini yang dapat memakai fitur RDM',
      ),
    )
  })
})
