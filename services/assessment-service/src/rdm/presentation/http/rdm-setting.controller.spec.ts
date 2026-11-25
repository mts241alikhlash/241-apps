import { Test, TestingModule } from '@nestjs/testing'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import { ReplaceRdmSettingUseCase } from '../../application/use-cases/replace-rdm-setting.use-case.js'
import { IRdmSettingRepository } from '../../domain/rdm-setting.js'
import { ReplaceRdmSettingDto } from './dto/request/replace-rdm-setting.dto.js'
import { RdmSettingResponseDto } from './dto/response/rdm-setting-response.dto.js'
import { RdmSettingController } from './rdm-setting.controller.js'

describe('RdmSettingController', () => {
  let controller: RdmSettingController

  const mockRepository = {
    get: vi.fn(),
    replace: vi.fn(),
  }

  const mockReplaceUseCase = {
    execute: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RdmSettingController],
      providers: [
        { provide: IRdmSettingRepository, useValue: mockRepository },
        { provide: ReplaceRdmSettingUseCase, useValue: mockReplaceUseCase },
      ],
    }).compile()

    controller = module.get(RdmSettingController)
    vi.clearAllMocks()
  })

  it('returns the current setting mapped to RdmSettingResponseDto', async () => {
    const seeded = {
      sumatifTypes: [
        AssessmentType.DAILY,
        AssessmentType.ASSIGNMENT,
        AssessmentType.PRACTICAL,
        AssessmentType.MIDTERM,
      ],
      sasType: AssessmentType.FINAL,
    }
    mockRepository.get.mockResolvedValue(seeded)

    const result = await controller.get()

    expect(mockRepository.get).toHaveBeenCalledOnce()
    expect(result).toBeInstanceOf(RdmSettingResponseDto)
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

  it('delegates replace to ReplaceRdmSettingUseCase and maps the response DTO', async () => {
    const dto = new ReplaceRdmSettingDto()
    dto.sumatifTypes = [AssessmentType.DAILY, AssessmentType.MIDTERM]
    dto.sasType = AssessmentType.FINAL

    mockReplaceUseCase.execute.mockResolvedValue({
      sumatifTypes: [AssessmentType.DAILY, AssessmentType.MIDTERM],
      sasType: AssessmentType.FINAL,
    })

    const result = await controller.replace(dto)

    expect(mockReplaceUseCase.execute).toHaveBeenCalledWith({
      sumatifTypes: [AssessmentType.DAILY, AssessmentType.MIDTERM],
      sasType: AssessmentType.FINAL,
    })
    expect(result).toBeInstanceOf(RdmSettingResponseDto)
    expect(result).toEqual({
      sumatifTypes: [AssessmentType.DAILY, AssessmentType.MIDTERM],
      sasType: AssessmentType.FINAL,
    })
  })
})
