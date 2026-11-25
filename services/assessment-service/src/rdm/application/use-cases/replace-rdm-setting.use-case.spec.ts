import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import { IRdmSettingRepository } from '../../domain/rdm-setting.js'
import { ReplaceRdmSettingUseCase } from './replace-rdm-setting.use-case.js'

describe('ReplaceRdmSettingUseCase', () => {
  let useCase: ReplaceRdmSettingUseCase

  const mockRepository = {
    get: vi.fn(),
    replace: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplaceRdmSettingUseCase,
        {
          provide: IRdmSettingRepository,
          useValue: mockRepository,
        },
      ],
    }).compile()

    useCase = module.get(ReplaceRdmSettingUseCase)
    vi.clearAllMocks()

    mockRepository.replace.mockImplementation((input) => Promise.resolve(input))
  })

  it('replaces the setting when sumatifTypes is non-empty, unique, and excludes sasType', async () => {
    const result = await useCase.execute({
      sumatifTypes: [
        AssessmentType.DAILY,
        AssessmentType.ASSIGNMENT,
        AssessmentType.PRACTICAL,
        AssessmentType.MIDTERM,
      ],
      sasType: AssessmentType.FINAL,
    })

    expect(mockRepository.replace).toHaveBeenCalledWith({
      sumatifTypes: [
        AssessmentType.DAILY,
        AssessmentType.ASSIGNMENT,
        AssessmentType.PRACTICAL,
        AssessmentType.MIDTERM,
      ],
      sasType: AssessmentType.FINAL,
    })
    expect(result).toEqual({
      sumatifTypes: [
        AssessmentType.DAILY,
        AssessmentType.ASSIGNMENT,
        AssessmentType.PRACTICAL,
        AssessmentType.MIDTERM,
      ],
      sasType: AssessmentType.FINAL,
    })
  })

  it('refuses an empty sumatifTypes list', async () => {
    await expect(
      useCase.execute({
        sumatifTypes: [],
        sasType: AssessmentType.FINAL,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Pilih minimal satu jenis penilaian untuk Sumatif',
      ),
    )
    expect(mockRepository.replace).not.toHaveBeenCalled()
  })

  it('refuses duplicate types in sumatifTypes', async () => {
    await expect(
      useCase.execute({
        sumatifTypes: [AssessmentType.DAILY, AssessmentType.DAILY],
        sasType: AssessmentType.FINAL,
      }),
    ).rejects.toThrow(
      new BadRequestException('Jenis penilaian Sumatif tidak boleh ganda'),
    )
    expect(mockRepository.replace).not.toHaveBeenCalled()
  })

  it('refuses sasType contained in sumatifTypes', async () => {
    await expect(
      useCase.execute({
        sumatifTypes: [AssessmentType.DAILY, AssessmentType.FINAL],
        sasType: AssessmentType.FINAL,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Jenis penilaian SAS tidak boleh juga dipakai untuk Sumatif',
      ),
    )
    expect(mockRepository.replace).not.toHaveBeenCalled()
  })
})
